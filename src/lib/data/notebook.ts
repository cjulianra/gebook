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
