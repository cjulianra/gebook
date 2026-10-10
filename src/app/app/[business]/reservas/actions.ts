"use server";

import { createClient } from "@/lib/supabase/server";
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
