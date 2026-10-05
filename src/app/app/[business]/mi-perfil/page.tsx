import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { presetRange } from "@/lib/utils/dateRange";
import { MiPerfilClient } from "./MiPerfilClient";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface PeriodBookingRow {
  id: string;
  start_at: string;
  clients: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null;
  services: { name: string; price: number } | { name: string; price: number }[] | null;
}

export default async function MiPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ business: string }>;
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { business: slug } = await params;
  const sp = await searchParams;
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

  if (!memberRaw) redirect(`/app/${slug}/dashboard`);

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
  const rate = details?.commission_rate ?? 40;

  const activePreset = sp.preset ?? "hoy";
  const { from, to } = sp.from && sp.to ? { from: sp.from, to: sp.to } : presetRange(activePreset);
  const startOfRange = new Date(`${from}T00:00:00`);
  const endOfRange = new Date(`${to}T23:59:59.999`);

  const [{ data: allTimeBookings }, { data: payouts }, { data: periodBookingsRaw }] = await Promise.all([
    supabase.from("bookings").select("services(price)").eq("business_id", business.id).eq("business_member_id", member.id).eq("status", "completed"),
    supabase
      .from("employee_payouts")
      .select("id, business_member_id, amount, note, paid_at, created_at")
      .eq("business_id", business.id)
      .eq("business_member_id", member.id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, start_at, clients(first_name, last_name), services(name, price)")
      .eq("business_id", business.id)
      .eq("business_member_id", member.id)
      .eq("status", "completed")
      .gte("start_at", startOfRange.toISOString())
      .lte("start_at", endOfRange.toISOString())
      .order("start_at", { ascending: false }),
  ]);

  const revenue = ((allTimeBookings ?? []) as unknown as { services: { price: number } | { price: number }[] | null }[]).reduce(
    (sum, b) => sum + (one(b.services)?.price ?? 0),
    0
  );
  const earned = (revenue * rate) / 100;

  const periodRows = (periodBookingsRaw ?? []) as unknown as PeriodBookingRow[];
  const periodServices = periodRows.map((b) => {
    const client = one(b.clients);
    const service = one(b.services);
    const price = service?.price ?? 0;
    return {
      id: b.id,
      start_at: b.start_at,
      clientName: client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : "—",
      serviceName: service?.name ?? "—",
      price,
      commission: (price * rate) / 100,
    };
  });

  return (
    <MiPerfilClient
      businessId={business.id}
      memberId={member.id}
      fullName={profile?.full_name ?? ""}
      email={profile?.email ?? ""}
      specialty={details?.specialty ?? null}
      photoUrl={details?.photo_url ?? null}
      commissionRate={rate}
      earned={earned}
      initialPayouts={payouts ?? []}
      activePreset={sp.from ? null : activePreset}
      periodServices={periodServices}
    />
  );
}
