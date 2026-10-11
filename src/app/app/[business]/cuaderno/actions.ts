"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewBooking } from "@/lib/push/send";

async function getMembership(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("business_members")
    .select("id, role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  return membership;
}

/** El empleado anota un servicio que prestó por fuera (o se le pasó registrar) en la agenda. Queda pendiente de revisión. */
export async function createNotebookEntry(
  businessId: string,
  entry: { serviceId: string | null; serviceName: string; clientName: string; amount: number; note: string; performedAt: string }
) {
  const membership = await getMembership(businessId);
  if (!membership) return { error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase.from("notebook_entries").insert({
    business_id: businessId,
    business_member_id: membership.id,
    service_id: entry.serviceId,
    service_name: entry.serviceName,
    client_name: entry.clientName || null,
    amount: entry.amount,
    note: entry.note || null,
    performed_at: entry.performedAt,
  });
  if (error) return { error: "No pudimos guardar la anotación." };

  await notifyNewBooking(
    businessId,
    [],
    { title: "Nueva anotación en el cuaderno", body: `${entry.serviceName} pendiente de revisión.`, link: "/cuaderno" },
    { excludeMemberId: membership.id }
  ).catch(() => {});

  return { error: null };
}

/** El empleado borra su propia anotación mientras siga pendiente. */
export async function deleteNotebookEntry(businessId: string, entryId: string) {
  const membership = await getMembership(businessId);
  if (!membership) return { error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase.from("notebook_entries").delete().eq("id", entryId).eq("business_id", businessId);
  if (error) return { error: "No pudimos borrar la anotación." };
  return { error: null };
}

/** El dueño/admin aprueba o rechaza una anotación — al aprobarla pasa a contar en la comisión del empleado. */
export async function reviewNotebookEntry(businessId: string, entryId: string, approve: boolean) {
  const membership = await getMembership(businessId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) return { error: "No autorizado." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: updated, error } = await supabase
    .from("notebook_entries")
    .update({
      status: approve ? "approved" : "rejected",
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("business_id", businessId)
    .select("business_member_id, service_name")
    .single();
  if (error || !updated) return { error: "No pudimos actualizar la anotación." };

  const admin = createAdminClient();
  try {
    await admin.from("notifications").insert({
      business_id: businessId,
      business_member_id: updated.business_member_id,
      title: approve ? "Anotación aprobada" : "Anotación rechazada",
      body: `${updated.service_name}: ${approve ? "aprobada, ya cuenta en tu contabilidad." : "fue rechazada."}`,
      link: "/cuaderno",
    });
  } catch {
    // La actualización ya quedó guardada; si falla la notificación no bloquea el flujo.
  }

  return { error: null };
}
