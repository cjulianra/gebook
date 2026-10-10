import { createAdminClient } from "@/lib/supabase/admin";
import { presetRange } from "@/lib/utils/dateRange";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminPage() {
  const admin = createAdminClient();

  const [{ data: businesses }, { data: members }, { data: bookings }] = await Promise.all([
    admin
      .from("businesses")
      .select("id, name, slug, city, neighborhood, is_active, created_at, owner_id")
      .order("created_at", { ascending: false }),
    admin.from("business_members").select("business_id, role, status"),
    admin
      .from("bookings")
      .select("business_id, start_at, status")
      .gte("start_at", presetRange("mes").from)
      .neq("status", "cancelled"),
  ]);

  const ownerIds = Array.from(new Set((businesses ?? []).map((b) => b.owner_id)));
  const { data: owners } = await admin.from("profiles").select("id, full_name, email").in("id", ownerIds.length > 0 ? ownerIds : [""]);
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  const employeeCountByBusiness = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.role !== "employee" || m.status !== "active") continue;
    employeeCountByBusiness.set(m.business_id, (employeeCountByBusiness.get(m.business_id) ?? 0) + 1);
  }

  const { from: todayFrom } = presetRange("hoy");
  const { from: weekFrom } = presetRange("semana");
  const { from: monthFrom } = presetRange("mes");

  const statsByBusiness = new Map<string, { today: number; week: number; month: number }>();
  for (const b of bookings ?? []) {
    const dayKey = b.start_at.slice(0, 10);
    const stats = statsByBusiness.get(b.business_id) ?? { today: 0, week: 0, month: 0 };
    if (dayKey >= monthFrom) stats.month++;
    if (dayKey >= weekFrom) stats.week++;
    if (dayKey >= todayFrom) stats.today++;
    statsByBusiness.set(b.business_id, stats);
  }

  const rows = (businesses ?? []).map((b) => {
    const owner = ownerById.get(b.owner_id);
    const stats = statsByBusiness.get(b.id) ?? { today: 0, week: 0, month: 0 };
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      city: b.city,
      neighborhood: b.neighborhood,
      isActive: b.is_active,
      createdAt: b.created_at,
      ownerName: owner?.full_name ?? "—",
      ownerEmail: owner?.email ?? "—",
      employeeCount: employeeCountByBusiness.get(b.id) ?? 0,
      bookingsToday: stats.today,
      bookingsWeek: stats.week,
      bookingsMonth: stats.month,
    };
  });

  return <AdminDashboardClient rows={rows} />;
}
