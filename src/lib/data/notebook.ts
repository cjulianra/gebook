import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/** Monto aprobado en el Cuaderno por empleado — cuenta como ingreso adicional para su comisión. */
export async function getApprovedNotebookAmountByMember(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("notebook_entries")
    .select("business_member_id, amount")
    .eq("business_id", businessId)
    .eq("status", "approved");

  const amountByMember = new Map<string, number>();
  for (const row of data ?? []) {
    amountByMember.set(row.business_member_id, (amountByMember.get(row.business_member_id) ?? 0) + row.amount);
  }
  return amountByMember;
}

export interface ApprovedNotebookEntry {
  id: string;
  business_member_id: string;
  service_name: string;
  client_name: string | null;
  amount: number;
  performed_at: string;
}

/** Anotaciones del Cuaderno ya aprobadas por el dueño/admin, dentro de un rango de fechas — para sumarlas a los reportes del negocio. */
export async function getApprovedNotebookEntriesInRange(
  supabase: SupabaseClient<Database>,
  businessId: string,
  from: string,
  to: string,
  memberId?: string
): Promise<ApprovedNotebookEntry[]> {
  let query = supabase
    .from("notebook_entries")
    .select("id, business_member_id, service_name, client_name, amount, performed_at")
    .eq("business_id", businessId)
    .eq("status", "approved")
    .gte("performed_at", from)
    .lte("performed_at", to);
  if (memberId) query = query.eq("business_member_id", memberId);
  const { data } = await query;
  return data ?? [];
}
