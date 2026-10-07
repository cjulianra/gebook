import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmpleadosPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const [{ data: members }, { data: services }, { data: assignments }, { data: schedules }, { data: completedBookings }, { data: payouts }] =
    await Promise.all([
      supabase
        .from("business_members")
        .select("id, role, status, created_at, profiles(id, full_name, email, avatar_url), employee_details(phone, specialty, photo_url, commission_rate, can_create_bookings, can_view_clients)")
        .eq("business_id", business.id)
        .eq("role", "employee")
        .order("created_at", { ascending: false }),
      supabase.from("services").select("id, name").eq("business_id", business.id).eq("is_active", true),
      supabase.from("employee_services").select("business_member_id, service_id"),
      supabase.from("work_schedules").select("id, business_member_id, weekday, start_time, end_time"),
      supabase
        .from("bookings")
        .select("business_member_id, services(price)")
        .eq("business_id", business.id)
        .eq("status", "completed"),
      supabase
        .from("employee_payouts")
        .select("id, business_member_id, amount, note, paid_at, created_at")
        .eq("business_id", business.id)
        .order("paid_at", { ascending: false }),
    ]);

  // Comisión total ganada (histórico completo) por empleado, para calcular el saldo pendiente.
  const earnedByMember = new Map<string, number>();
  for (const b of (completedBookings ?? []) as unknown as { business_member_id: string; services: { price: number } | { price: number }[] | null }[]) {
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    if (!service) continue;
    earnedByMember.set(b.business_member_id, (earnedByMember.get(b.business_member_id) ?? 0) + service.price);
  }
  const memberRateMap = new Map<string, number>();
  const membersForRates = (members ?? []) as unknown as {
    id: string;
    employee_details: { commission_rate: number } | { commission_rate: number }[] | null;
  }[];
  for (const m of membersForRates) {
    const details = Array.isArray(m.employee_details) ? m.employee_details[0] : m.employee_details;
    memberRateMap.set(m.id, details?.commission_rate ?? 40);
  }
  const earnedCommissionByMember = new Map<string, number>();
  for (const [memberId, revenue] of earnedByMember) {
    const rate = memberRateMap.get(memberId) ?? 40;
    earnedCommissionByMember.set(memberId, (revenue * rate) / 100);
  }

  return (
    <EmployeesClient
      businessId={business.id}
      initialMembers={members ?? []}
      services={services ?? []}
      initialAssignments={assignments ?? []}
      initialSchedules={schedules ?? []}
      initialPayouts={payouts ?? []}
      earnedCommissions={Object.fromEntries(earnedCommissionByMember)}
    />
  );
}
