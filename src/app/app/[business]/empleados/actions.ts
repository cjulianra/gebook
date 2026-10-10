"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types/database";

type BusinessMemberRow = Database["public"]["Tables"]["business_members"]["Row"];

interface CreateResult {
  data?: BusinessMemberRow;
  error?: string;
}

interface CreateEmployeeInput {
  businessId: string;
  fullName: string;
  phone: string;
  canCreateBookings?: boolean;
  serviceIds?: string[];
}

function generateAccessCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateStrongPassword() {
  // Nunca se usa a mano: solo asegura la cuenta de Supabase por detrás del código de 4 dígitos.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function assertIsBusinessAdmin(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("No tienes permisos para gestionar empleados de este negocio.");
  }
}

/**
 * Crea un empleado sin correo: solo nombre y celular. El acceso a su panel se
 * hace con ese celular + un código de 4 dígitos (ver getInviteDetails/login),
 * que el dueño le comparte por WhatsApp con el botón "Invitar".
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<CreateResult> {
  await assertIsBusinessAdmin(input.businessId);

  const phoneDigits = normalizePhone(input.phone);
  if (phoneDigits.length < 10) {
    return { error: "Ingresa un número de celular válido." };
  }

  const admin = createAdminClient();
  const syntheticEmail = `emp-${phoneDigits}-${input.businessId.slice(0, 8)}@employees.gebook.internal`;
  const accessCode = generateAccessCode();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: generateStrongPassword(),
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (createError || !created.user) {
    return { error: "Ese celular ya tiene un empleado creado en este negocio." };
  }

  const { data: member, error: memberError } = await admin
    .from("business_members")
    .insert({ business_id: input.businessId, user_id: created.user.id, role: "employee", status: "active" })
    .select()
    .single();

  if (memberError || !member) {
    return { error: "No pudimos crear al empleado. Intenta de nuevo." };
  }

  await admin.from("employee_details").insert({
    business_member_id: member.id,
    phone: input.phone,
    access_code: accessCode,
    can_create_bookings: input.canCreateBookings ?? true,
  });

  if (input.serviceIds && input.serviceIds.length > 0) {
    await admin.from("employee_services").insert(input.serviceIds.map((service_id) => ({ business_member_id: member.id, service_id })));
  }

  return { data: member };
}

/** Teléfono + código vigente de un empleado, para armar el mensaje de WhatsApp del botón "Invitar". */
export async function getInviteDetails(businessId: string, memberId: string) {
  await assertIsBusinessAdmin(businessId);
  const admin = createAdminClient();

  const { data: member } = await admin.from("business_members").select("id, business_id").eq("id", memberId).eq("business_id", businessId).maybeSingle();
  if (!member) return { error: "No encontramos a este empleado." };

  const { data: details } = await admin.from("employee_details").select("phone, access_code").eq("business_member_id", memberId).maybeSingle();
  if (!details?.phone || !details?.access_code) return { error: "A este empleado le falta el celular o el código." };

  return { data: { phone: details.phone, accessCode: details.access_code } };
}

export async function removeEmployee(businessId: string, memberId: string) {
  await assertIsBusinessAdmin(businessId);
  const admin = createAdminClient();
  const { error } = await admin.from("business_members").update({ status: "inactive" }).eq("id", memberId);
  if (error) return { error: "No pudimos desactivar al empleado." };
  return { data: true };
}

/**
 * Sube a un empleado a administrador (puede crear reservas para cualquier
 * empleado, gestionar servicios, otros empleados, configuración, etc.) o lo
 * vuelve a bajar a empleado normal. El dueño (owner) nunca cambia de rol
 * desde aquí.
 */
export async function setMemberAdmin(businessId: string, memberId: string, isAdmin: boolean) {
  await assertIsBusinessAdmin(businessId);
  const admin = createAdminClient();

  const { data: member } = await admin.from("business_members").select("role").eq("id", memberId).eq("business_id", businessId).maybeSingle();
  if (!member) return { error: "No encontramos a este empleado." };
  if (member.role === "owner") return { error: "El dueño ya tiene todos los permisos." };

  const { error } = await admin
    .from("business_members")
    .update({ role: isAdmin ? "admin" : "employee" })
    .eq("id", memberId);
  if (error) return { error: "No pudimos actualizar el rol." };
  return { data: true };
}
