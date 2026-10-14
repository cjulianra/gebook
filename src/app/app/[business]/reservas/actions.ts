"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewBooking } from "@/lib/push/send";

/**
 * Notifica (push + campanita) cuando el negocio registra una reserva desde
 * el panel — a los admin/dueño y al empleado asignado, salvo a quien la
 * creó (para no auto-notificarse). El caller ya insertó la reserva vía el
 * cliente normal (RLS); esto solo dispara el aviso.
 */
export async function notifyBookingCreated(businessId: string, employeeIds: string[], title: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership } = await supabase
    .from("business_members")
    .select("id, business_id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.business_id !== businessId) return;

  await notifyNewBooking(businessId, employeeIds, { title, body, link: "/reservas" }, { excludeMemberId: membership.id });
}

/**
 * Crea un servicio "al vuelo" para la opción "Otro" del selector de
 * servicios (Nueva reserva / Registro rápido) — cuando lo que se va a
 * agendar no está en el catálogo. Solo escribo/admin puede crear servicios
 * por RLS, así que esto usa el cliente admin tras verificar que quien llama
 * sí puede crear reservas en este negocio (dueño/admin, o empleado con el
 * permiso activado). Queda marcado is_active=false para no aparecer en el
 * catálogo normal de Servicios ni en la página pública.
 */
export async function createCustomService(
  businessId: string,
  input: { name: string; price: number; durationMinutes: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado.", service: null };

  const { data: membershipRaw } = await supabase
    .from("business_members")
    .select("id, role, employee_details(can_create_bookings)")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membershipRaw) return { error: "No autorizado.", service: null };

  const membership = membershipRaw as unknown as {
    id: string;
    role: string;
    employee_details: { can_create_bookings: boolean } | { can_create_bookings: boolean }[] | null;
  };
  const details = Array.isArray(membership.employee_details) ? membership.employee_details[0] : membership.employee_details;
  const canCreate = membership.role !== "employee" || (details?.can_create_bookings ?? true);
  if (!canCreate) return { error: "No tienes permiso para crear reservas.", service: null };

  if (!input.name.trim()) return { error: "Indica el nombre del servicio.", service: null };
  if (!input.price || input.price < 0) return { error: "Indica un precio válido.", service: null };
  if (!input.durationMinutes || input.durationMinutes <= 0) return { error: "Indica una duración válida.", service: null };

  const admin = createAdminClient();
  const { data: service, error } = await admin
    .from("services")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      price: input.price,
      duration_minutes: input.durationMinutes,
      is_active: false,
    })
    .select("id, name, price, duration_minutes")
    .single();
  if (error || !service) return { error: "No pudimos crear el servicio.", service: null };

  return { error: null, service };
}
