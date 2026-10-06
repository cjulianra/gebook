import type { createClient } from "@/lib/supabase/server";

/**
 * Pasa automáticamente a "in_progress" las reservas confirmadas cuya hora de
 * inicio ya llegó, y a "completed" las que ya pasaron su hora de fin — salvo
 * que ya estén marcadas manualmente como completadas o canceladas. Se corre
 * en cada carga de Agenda/Panel en vez de con un cron, así que el estado
 * siempre queda al día apenas alguien abre la página.
 */
export async function syncBookingStatuses(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
  const nowIso = new Date().toISOString();
  await Promise.all([
    supabase
      .from("bookings")
      .update({ status: "in_progress" })
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .lte("start_at", nowIso)
      .gt("end_at", nowIso),
    supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("business_id", businessId)
      .in("status", ["confirmed", "in_progress"])
      .lte("end_at", nowIso),
  ]);
}
