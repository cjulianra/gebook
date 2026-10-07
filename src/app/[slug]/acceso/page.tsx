import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccesoForm } from "./AccesoForm";

export default async function AccesoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("name, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!business) notFound();

  return <AccesoForm slug={slug} businessName={business.name} logoUrl={business.logo_url} />;
}
