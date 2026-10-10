import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInBogota } from "@/lib/utils/dateRange";
import { BusinessDetailClient } from "./BusinessDetailClient";

function monthRange(month: string) {
  // month: "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  return { from, to, daysInMonth };
}

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { businessId } = await params;
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? todayInBogota().slice(0, 7);
  const { from, to, daysInMonth } = monthRange(month);

  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, phone, address, is_active, created_at, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) notFound();

  const [{ data: owner }, { data: members }, { data: bookings }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", business.owner_id).single(),
    admin
      .from("business_members")
      .select("id, role, status, profiles(full_name, email)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true }),
    admin
      .from("bookings")
      .select("start_at, status, services(price)")
      .eq("business_id", businessId)
      .gte("start_at", `${from}T00:00:00-05:00`)
      .lte("start_at", `${to}T23:59:59-05:00`),
  ]);

  const dayStats = new Map<string, { count: number; revenue: number; cancelled: number }>();
  for (let d = 1; d <= daysInMonth; d++) {
    dayStats.set(`${month}-${String(d).padStart(2, "0")}`, { count: 0, revenue: 0, cancelled: 0 });
  }
  for (const b of (bookings ?? []) as unknown as { start_at: string; status: string; services: { price: number } | { price: number }[] | null }[]) {
    const dayKey = b.start_at.slice(0, 10);
    const stats = dayStats.get(dayKey);
    if (!stats) continue;
    if (b.status === "cancelled") {
      stats.cancelled++;
      continue;
    }
    stats.count++;
    if (b.status === "completed") {
      const service = Array.isArray(b.services) ? b.services[0] : b.services;
      stats.revenue += service?.price ?? 0;
    }
  }

  const days = Array.from(dayStats.entries()).map(([date, stats]) => ({ date, ...stats }));

  const membersTyped = (members ?? []) as unknown as {
    id: string;
    role: string;
    status: string;
    profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  }[];
  const employees = membersTyped.map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      role: m.role,
      status: m.status,
      fullName: profile?.full_name ?? "—",
      email: profile?.email ?? "—",
    };
  });

  return (
    <BusinessDetailClient
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        city: business.city,
        neighborhood: business.neighborhood,
        phone: business.phone,
        address: business.address,
        isActive: business.is_active,
        createdAt: business.created_at,
        ownerName: owner?.full_name ?? "—",
        ownerEmail: owner?.email ?? "—",
      }}
      employees={employees}
      days={days}
      month={month}
    />
  );
}
