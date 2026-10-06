import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AccountPanel, type Payout } from "@/components/employees/AccountModal";
import type { BookingStatus } from "@/lib/types/database";
import { BOGOTA_TZ, bogotaDateTime, todayInBogota } from "@/lib/utils/dateRange";
import Link from "next/link";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ });
}

interface TodayBookingRow {
  id: string;
  start_at: string;
  status: BookingStatus;
  clients: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null;
  services: { name: string } | { name: string }[] | null;
  business_members:
    | { id: string; profiles: { full_name: string } | { full_name: string }[] | null; employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null }
    | { id: string; profiles: { full_name: string } | { full_name: string }[] | null; employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null }[]
    | null;
}

interface UpcomingBookingRow {
  id: string;
  start_at: string;
  status: string;
  clients: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null;
  services: { name: string } | { name: string }[] | null;
}

export default async function DashboardPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: myMembershipRaw } = user
    ? await supabase
        .from("business_members")
        .select("id, role, employee_details(commission_rate)")
        .eq("business_id", business.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const myMembership = myMembershipRaw as unknown as {
    id: string;
    role: string;
    employee_details: { commission_rate: number } | { commission_rate: number }[] | null;
  } | null;

  let myAccount: { memberId: string; earned: number; payouts: Payout[] } | null = null;
  if (myMembership?.role === "employee") {
    const rate = one(myMembership.employee_details)?.commission_rate ?? 40;
    const [{ data: myCompletedBookings }, { data: myPayouts }] = await Promise.all([
      supabase
        .from("bookings")
        .select("services(price)")
        .eq("business_id", business.id)
        .eq("business_member_id", myMembership.id)
        .eq("status", "completed"),
      supabase
        .from("employee_payouts")
        .select("id, business_member_id, amount, note, paid_at, created_at")
        .eq("business_id", business.id)
        .eq("business_member_id", myMembership.id)
        .order("paid_at", { ascending: false }),
    ]);
    const revenue = ((myCompletedBookings ?? []) as unknown as { services: { price: number } | { price: number }[] | null }[]).reduce(
      (sum, b) => sum + (one(b.services)?.price ?? 0),
      0
    );
    myAccount = { memberId: myMembership.id, earned: (revenue * rate) / 100, payouts: myPayouts ?? [] };
  }

  const todayKey = todayInBogota();
  const startOfDay = bogotaDateTime(todayKey, "00:00:00");
  const endOfDay = bogotaDateTime(todayKey, "23:59:59.999");

  const [todayBookings, upcomingBookings, employeeCount, clientCount, serviceCount] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, start_at, status, clients(first_name, last_name), services(name), business_members(id, profiles(full_name), employee_details(photo_url))")
      .eq("business_id", business.id)
      .gte("start_at", startOfDay.toISOString())
      .lte("start_at", endOfDay.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, start_at, status, clients(first_name, last_name), services(name)")
      .eq("business_id", business.id)
      .gt("start_at", endOfDay.toISOString())
      .in("status", ["pending", "confirmed"])
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("business_members")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("role", "employee")
      .eq("status", "active"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
  ]);

  const today = (todayBookings.data ?? []) as unknown as TodayBookingRow[];
  const upcoming = (upcomingBookings.data ?? []) as unknown as UpcomingBookingRow[];
  const completedToday = today.filter((b) => b.status === "completed").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">
          Hola{myProfile?.full_name ? `, ${myProfile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">
          {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ })}
        </p>
      </div>

      {myAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Mi cuenta</CardTitle>
            <Link href={`/app/${slug}/mi-perfil`} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
              Ver historial completo
            </Link>
          </CardHeader>
          <CardBody>
            <AccountPanel memberId={myAccount.memberId} payouts={myAccount.payouts} earned={myAccount.earned} businessId={business.id} readOnly />
          </CardBody>
        </Card>
      )}

      <div className={`grid grid-cols-2 gap-3 ${myAccount ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        <StatCard label="Reservas hoy" value={today.length} />
        <StatCard label="Completadas hoy" value={completedToday} />
        {!myAccount && (
          <>
            <StatCard label="Empleados activos" value={employeeCount.count ?? 0} />
            <StatCard label="Clientes" value={clientCount.count ?? 0} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda de hoy</CardTitle>
          <Link href={`/app/${slug}/reservas`} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
            Ver agenda completa
          </Link>
        </CardHeader>
        {today.length === 0 ? (
          <EmptyState title="Sin reservas hoy" description="Cuando agendes una reserva aparecerá aquí." />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {today.map((b) => {
              const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
              const service = Array.isArray(b.services) ? b.services[0] : b.services;
              const member = Array.isArray(b.business_members) ? b.business_members[0] : b.business_members;
              const memberProfile = member && (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles);
              const memberDetails = member && (Array.isArray(member.employee_details) ? member.employee_details[0] : member.employee_details);
              return (
                <div key={b.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-medium text-[var(--color-ink-700)]">{formatTime(b.start_at)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                        {client?.first_name} {client?.last_name ?? ""}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-500)]">
                        <span className="max-w-full truncate">{service?.name}</span>
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <Avatar name={memberProfile?.full_name ?? ""} src={memberDetails?.photo_url} size={18} />
                          <span className="truncate">{memberProfile?.full_name}</span>
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 self-end sm:self-auto">
                    <BookingStatusBadge status={b.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas reservas</CardTitle>
        </CardHeader>
        {upcoming.length === 0 ? (
          <EmptyState title="No hay próximas reservas" description={`Tienes ${serviceCount.count ?? 0} servicios activos listos para reservar.`} />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {upcoming.map((b) => {
              const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
              const service = Array.isArray(b.services) ? b.services[0] : b.services;
              return (
                <div key={b.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                      {client?.first_name} {client?.last_name ?? ""}
                    </p>
                    <p className="truncate text-xs text-[var(--color-ink-500)]">{service?.name}</p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-xs text-[var(--color-ink-500)]">
                    {new Date(b.start_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: BOGOTA_TZ })} · {formatTime(b.start_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-2xl font-semibold text-[var(--color-ink-900)]">{value}</p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{label}</p>
      </CardBody>
    </Card>
  );
}
