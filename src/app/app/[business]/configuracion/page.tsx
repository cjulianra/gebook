import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { ConfiguracionClient } from "./ConfiguracionClient";

export default async function ConfiguracionPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const { data: full } = await supabase.from("businesses").select("*").eq("id", business.id).single();

  if (!full) return null;

  return <ConfiguracionClient business={full} />;
}
