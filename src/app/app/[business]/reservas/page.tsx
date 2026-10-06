import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { syncBookingStatuses } from "@/lib/data/bookingStatusSync";
import { bogotaDateTime, todayInBogota } from "@/lib/utils/dateRange";
import { BookingsClient } from "./BookingsClient";

export default async function ReservasPage({
  params,
  searchParams,
}: {
  params: Promise<{ business: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { business: slug } = await params;
  const { date } = await searchParams;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  await syncBookingStatuses(supabase, business.id);

  const day = date ?? todayInBogota();
  const startOfDay = bogotaDateTime(day, "00:00:00");
  const endOfDay = bogotaDateTime(day, "23:59:59.999");

  const [{ data: bookings }, { data: employees }, { data: services }, { data: clients }, { data: assignments }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, start_at, end_at, status, notes, client_id, service_id, business_member_id, clients(id, first_name, last_name, phone), services(id, name, duration_minutes, price), business_members(id, profiles(full_name), employee_details(photo_url))"
      )
      .eq("business_id", business.id)
      .gte("start_at", startOfDay.toISOString())
      .lte("start_at", endOfDay.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("business_members")
      .select("id, profiles(full_name), employee_details(photo_url)")
      .eq("business_id", business.id)
      .eq("role", "employee")
      .eq("status", "active"),
    supabase.from("services").select("id, name, duration_minutes, price").eq("business_id", business.id).eq("is_active", true),
    supabase.from("clients").select("id, first_name, last_name, phone").eq("business_id", business.id).order("first_name"),
    supabase.from("employee_services").select("business_member_id, service_id"),
  ]);

  return (
    <BookingsClient
      businessId={business.id}
      day={day}
      initialBookings={bookings ?? []}
      employees={employees ?? []}
      services={services ?? []}
      clients={clients ?? []}
      assignments={assignments ?? []}
    />
  );
}
