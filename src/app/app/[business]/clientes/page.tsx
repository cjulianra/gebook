import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { ClientsClient } from "./ClientsClient";

export default async function ClientesPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membershipRaw } = await supabase
    .from("business_members")
    .select("role, employee_details(can_view_clients)")
    .eq("business_id", business.id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const membership = membershipRaw as unknown as {
    role: string;
    employee_details: { can_view_clients: boolean } | { can_view_clients: boolean }[] | null;
  } | null;
  const details = membership ? (Array.isArray(membership.employee_details) ? membership.employee_details[0] : membership.employee_details) : null;
  const canViewClients = membership?.role !== "employee" || (details?.can_view_clients ?? true);
  if (!canViewClients) redirect(`/app/${slug}/reservas`);

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return <ClientsClient businessId={business.id} initialClients={clients ?? []} />;
}
