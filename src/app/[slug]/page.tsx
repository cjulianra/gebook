import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "./BookingWidget";

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, business_type, phone, address, city, neighborhood, logo_url, show_prices")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!business) notFound();

  const [{ data: services }, { data: employees }, { data: assignments }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true).order("category"),
    supabase.from("public_employees").select("*").eq("business_id", business.id),
    supabase.from("employee_services").select("business_member_id, service_id"),
  ]);

  return (
    <BookingWidget
      business={business}
      services={services ?? []}
      employees={employees ?? []}
      assignments={assignments ?? []}
    />
  );
}
