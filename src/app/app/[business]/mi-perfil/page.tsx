import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { MiPerfilClient } from "./MiPerfilClient";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function MiPerfilPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberRaw } = await supabase
    .from("business_members")
    .select("id, profiles(full_name, email), employee_details(phone, specialty, photo_url, commission_rate)")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!memberRaw) redirect(`/app/${slug}/reservas`);

  const member = memberRaw as unknown as {
    id: string;
    profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
    employee_details:
      | { phone: string | null; specialty: string | null; photo_url: string | null; commission_rate: number }
      | { phone: string | null; specialty: string | null; photo_url: string | null; commission_rate: number }[]
      | null;
  };
  const profile = one(member.profiles);
  const details = one(member.employee_details);

  const { data: schedules } = await supabase
    .from("work_schedules")
    .select("id, business_member_id, weekday, start_time, end_time")
    .eq("business_member_id", member.id);

  return (
    <MiPerfilClient
      businessId={business.id}
      memberId={member.id}
      fullName={profile?.full_name ?? ""}
      specialty={details?.specialty ?? null}
      photoUrl={details?.photo_url ?? null}
      commissionRate={details?.commission_rate ?? 40}
      initialSchedules={schedules ?? []}
    />
  );
}
