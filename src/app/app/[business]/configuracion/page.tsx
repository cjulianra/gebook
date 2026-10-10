import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { ConfiguracionClient } from "./ConfiguracionClient";

export default async function ConfiguracionPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const [{ data: full }, { data: schedules }, { data: holidays }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", business.id).single(),
    supabase.from("business_schedules").select("id, business_id, schedule_type, start_time, end_time").eq("business_id", business.id),
    supabase.from("business_holidays").select("id, business_id, holiday_date, name").eq("business_id", business.id),
  ]);

  if (!full) return null;

  return <ConfiguracionClient business={full} initialSchedules={schedules ?? []} initialHolidays={holidays ?? []} />;
}
