"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types/database";

type BusinessMemberRow = Database["public"]["Tables"]["business_members"]["Row"];

interface InviteResult {
  data?: BusinessMemberRow;
  /** Solo presente cuando se crea con contraseña temporal (sin correo) — para mostrarla una vez al dueño. */
  tempPassword?: string;
  error?: string;
}

interface InviteEmployeeInput {
  businessId: string;
  email: string;
  fullName: string;
  phone?: string;
  canCreateBookings?: boolean;
  serviceIds?: string[];
}

function generateTempPassword() {
  // 10 caracteres, fácil de leer/dictar: sin 0/O/1/l ni símbolos.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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

export async function inviteEmployee(input: InviteEmployeeInput): Promise<InviteResult> {
  await assertIsBusinessAdmin(input.businessId);

  const admin = createAdminClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
  });

  if (inviteError || !invited.user) {
    // Email ya existe: busca el profile existente para vincularlo como empleado.
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", input.email).maybeSingle();
    if (!existingProfile) {
      return { error: inviteError?.message ?? "No pudimos invitar a este correo." };
    }
    return linkEmployee(admin, input, existingProfile.id);
  }

  return linkEmployee(admin, input, invited.user.id);
}

/**
 * Alternativa a inviteEmployee que no depende del envío de correo: crea la
 * cuenta ya confirmada con una contraseña temporal que el dueño comparte
 * directamente (WhatsApp, en persona, etc.). Útil si el correo del negocio
 * aún no tiene SMTP configurado o el empleado no revisa su correo seguido.
 */
export async function createEmployeeWithPassword(input: InviteEmployeeInput): Promise<InviteResult> {
  await assertIsBusinessAdmin(input.businessId);

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (createError || !created.user) {
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", input.email).maybeSingle();
    if (!existingProfile) {
      return { error: createError?.message === "User already registered" ? "Ese correo ya tiene una cuenta." : "No pudimos crear la cuenta." };
    }
    return linkEmployee(admin, input, existingProfile.id);
  }

  const result = await linkEmployee(admin, input, created.user.id);
  if (result.error) return result;
  return { ...result, tempPassword };
}

async function linkEmployee(
  admin: ReturnType<typeof createAdminClient>,
  input: InviteEmployeeInput,
  userId: string
): Promise<InviteResult> {
  const { data: member, error: memberError } = await admin
    .from("business_members")
    .insert({ business_id: input.businessId, user_id: userId, role: "employee", status: "active" })
    .select()
    .single();

  if (memberError || !member) {
    return { error: "El usuario ya pertenece a este negocio o hubo un error al vincularlo." };
  }

  await admin.from("employee_details").insert({
    business_member_id: member.id,
    phone: input.phone || null,
    can_create_bookings: input.canCreateBookings ?? true,
  });

  if (input.serviceIds && input.serviceIds.length > 0) {
    await admin.from("employee_services").insert(input.serviceIds.map((service_id) => ({ business_member_id: member.id, service_id })));
  }

  return { data: member };
}

export async function removeEmployee(businessId: string, memberId: string) {
  await assertIsBusinessAdmin(businessId);
  const admin = createAdminClient();
  const { error } = await admin.from("business_members").update({ status: "inactive" }).eq("id", memberId);
  if (error) return { error: "No pudimos desactivar al empleado." };
  return { data: true };
}
