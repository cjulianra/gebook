import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { syncBookingStatuses } from "@/lib/data/bookingStatusSync";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";
import { CuadernoClient, type Entry } from "./CuadernoClient";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface CompletedBookingRow {
  id: string;
  start_at: string;
  business_member_id: string;
  service_id: string;
  services: { name: string; price: number } | { name: string; price: number }[] | null;
  clients: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null;
  business_members?:
    | {
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null;
      }
    | {
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null;
      }[]
    | null;
}

export default async function CuadernoPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("id, role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect(`/app/${slug}/reservas`);

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  await syncBookingStatuses(supabase, business.id);

  const bookingSelect =
    "id, start_at, business_member_id, service_id, services(name, price), clients(first_name, last_name), business_members(profiles(full_name), employee_details(photo_url))";

  const [{ data: services }, { data: entries }, { data: employees }, { data: completedBookings }, { data: overrides }] = await Promise.all([
    supabase.from("services").select("id, name, price").eq("business_id", business.id).eq("is_active", true).order("name"),
    isAdmin
      ? supabase
          .from("notebook_entries")
          .select(
            "id, business_member_id, service_id, service_name, client_name, amount, note, performed_at, status, created_at, business_members(profiles(full_name), employee_details(photo_url))"
          )
          .eq("business_id", business.id)
          .is("booking_id", null)
          .order("created_at", { ascending: false })
      : supabase
          .from("notebook_entries")
          .select("id, business_member_id, service_id, service_name, client_name, amount, note, performed_at, status, created_at")
          .eq("business_id", business.id)
          .eq("business_member_id", membership.id)
          .is("booking_id", null)
          .order("created_at", { ascending: false }),
    isAdmin
      ? supabase
          .from("business_members")
          .select("id, profiles(full_name)")
          .eq("business_id", business.id)
          .in("role", ["employee", "admin"])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    isAdmin
      ? supabase.from("bookings").select(bookingSelect).eq("business_id", business.id).eq("status", "completed").order("start_at", { ascending: false })
      : supabase
          .from("bookings")
          .select(bookingSelect)
          .eq("business_id", business.id)
          .eq("business_member_id", membership.id)
          .eq("status", "completed")
          .order("start_at", { ascending: false }),
    // Correcciones que el dueño/admin haya hecho sobre anotaciones de Agenda —
    // reemplazan los datos crudos de la reserva al mostrarlas en el Cuaderno.
    supabase
      .from("notebook_entries")
      .select("booking_id, service_name, client_name, amount, note, performed_at")
      .eq("business_id", business.id)
      .not("booking_id", "is", null),
  ]);

  const employeeOptions = ((employees ?? []) as unknown as { id: string; profiles: { full_name: string } | { full_name: string }[] | null }[]).map((m) => ({
    id: m.id,
    name: Array.isArray(m.profiles) ? m.profiles[0]?.full_name : m.profiles?.full_name,
  }));

  const overrideByBooking = new Map(
    ((overrides ?? []) as { booking_id: string; service_name: string; client_name: string | null; amount: number; note: string | null; performed_at: string }[]).map(
      (o) => [o.booking_id, o]
    )
  );

  // Toda reserva que sí pasó por la agenda y terminó (no cancelada) aparece
  // también en el Cuaderno como un registro ya resuelto — no requiere
  // aprobación porque ya está contabilizada en los reportes desde que se
  // marcó "completed"; el Cuaderno solo la refleja para que quede un
  // registro único de todo lo que el empleado hizo. Si el dueño/admin editó
  // esa anotación desde el Cuaderno, se muestra la versión corregida.
  const agendaEntries: Entry[] = ((completedBookings ?? []) as unknown as CompletedBookingRow[]).map((b) => {
    const service = one(b.services);
    const client = one(b.clients);
    const override = overrideByBooking.get(b.id);
    return {
      id: `booking-${b.id}`,
      business_member_id: b.business_member_id,
      service_id: b.service_id,
      service_name: override?.service_name ?? service?.name ?? "Servicio",
      client_name: override ? override.client_name : client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : null,
      amount: override?.amount ?? service?.price ?? 0,
      note: override?.note ?? null,
      performed_at: override?.performed_at ?? new Date(b.start_at).toLocaleDateString("en-CA", { timeZone: BOGOTA_TZ }),
      status: "approved",
      created_at: b.start_at,
      source: "agenda",
      business_members: b.business_members,
    };
  });

  const manualEntries = (entries ?? []) as unknown as Entry[];
  const initialEntries = [...manualEntries, ...agendaEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <CuadernoClient
      businessId={business.id}
      memberId={membership.id}
      isAdmin={isAdmin}
      services={services ?? []}
      employees={employeeOptions}
      initialEntries={initialEntries}
    />
  );
}
