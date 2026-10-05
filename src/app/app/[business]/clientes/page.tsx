import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { ClientsClient } from "./ClientsClient";

export default async function ClientesPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return <ClientsClient businessId={business.id} initialClients={clients ?? []} />;
}
