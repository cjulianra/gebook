"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types/database";

type BusinessMemberRow = Database["public"]["Tables"]["business_members"]["Row"];

interface InviteResult {
  data?: BusinessMemberRow;
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
