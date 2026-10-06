import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { syncBookingStatuses } from "@/lib/data/bookingStatusSync";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/States";
import { BOGOTA_TZ, bogotaDateTime, presetRange } from "@/lib/utils/dateRange";
import { AccountButton } from "@/components/employees/AccountButton";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface BookingRow {
  id: string;
  start_at: string;
  clients: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null;
  services: { name: string; price: number } | { name: string; price: number }[] | null;
}

export default async function EmployeeReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ business: string; employeeId: string }>;
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { business: slug, employeeId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  await syncBookingStatuses(supabase, business.id);

  const activePreset = sp.preset ?? "mes";
  const { from, to } = sp.from && sp.to ? { from: sp.from, to: sp.to } : presetRange(activePreset);
  const startOfRange = bogotaDateTime(from, "00:00:00");
  const endOfRange = bogotaDateTime(to, "23:59:59.999");

  const { data: memberRaw } = await supabase
    .from("business_members")
    .select("id, profiles(full_name), employee_details(commission_rate, photo_url)")
    .eq("id", employeeId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!memberRaw) notFound();

  const member = memberRaw as unknown as {
    id: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
    employee_details: { commission_rate: number; photo_url: string | null } | { commission_rate: number; photo_url: string | null }[] | null;
  };

  const profile = one(member.profiles);
  const rate = one(member.employee_details)?.commission_rate ?? 40;
  const photoUrl = one(member.employee_details)?.photo_url ?? null;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_at, clients(first_name, last_name), services(name, price)")
    .eq("business_id", business.id)
    .eq("business_member_id", employeeId)
    .eq("status", "completed")
    .gte("start_at", startOfRange.toISOString())
    .lte("start_at", endOfRange.toISOString())
    .order("start_at", { ascending: false });

  const rows = (bookings ?? []) as unknown as BookingRow[];
  const details = rows.map((b) => {
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

  const totalRevenue = details.reduce((sum, d) => sum + d.price, 0);
  const totalCommission = details.reduce((sum, d) => sum + d.commission, 0);
  const rangeQuery: Record<string, string> = sp.from && sp.to ? { from: sp.from, to: sp.to } : { preset: activePreset };
  const backHref = `/app/${slug}/reportes?${new URLSearchParams(rangeQuery).toString()}`;

  // Cuenta (saldo): comisión ganada histórica (todo el tiempo, no solo el período filtrado) vs. pagos registrados.
  const [{ data: allTimeBookings }, { data: payouts }] = await Promise.all([
    supabase
      .from("bookings")
      .select("services(price)")
      .eq("business_id", business.id)
      .eq("business_member_id", employeeId)
      .eq("status", "completed"),
    supabase
      .from("employee_payouts")
      .select("id, business_member_id, amount, note, paid_at, created_at")
      .eq("business_id", business.id)
      .eq("business_member_id", employeeId)
      .order("paid_at", { ascending: false }),
  ]);

  const allTimeRevenue = ((allTimeBookings ?? []) as unknown as { services: { price: number } | { price: number }[] | null }[]).reduce(
    (sum, b) => sum + (one(b.services)?.price ?? 0),
    0
  );
  const allTimeEarnedCommission = (allTimeRevenue * rate) / 100;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]">
        ← Volver a Reportes
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <Avatar name={profile?.full_name ?? "Empleado"} src={photoUrl} size={36} />
            {profile?.full_name ?? "Empleado"}
          </span>
        }
        description={`${details.length} servicios · ${currency.format(totalRevenue)} generados · ${currency.format(totalCommission)} de comisión (${rate}%)`}
        action={
          <AccountButton
            businessId={business.id}
            memberId={employeeId}
            memberName={profile?.full_name ?? "Empleado"}
            initialPayouts={payouts ?? []}
            earned={allTimeEarnedCommission}
          />
        }
      />

      <Card>
        {details.length === 0 ? (
          <EmptyState title="Sin servicios completados en este período" />
        ) : (
          <>
            {/* Desktop/tablet: tabla */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-ink-500)]">
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-6 py-3 font-medium">Hora</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Servicio</th>
                    <th className="px-6 py-3 font-medium">Precio</th>
                    <th className="px-6 py-3 font-medium">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {details.map((d) => {
                    const date = new Date(d.start_at);
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">
                          {date.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: BOGOTA_TZ })}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">
                          {date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ })}
                        </td>
                        <td className="px-6 py-3 font-medium text-[var(--color-ink-900)]">{d.clientName}</td>
                        <td className="px-6 py-3 text-[var(--color-ink-700)]">{d.serviceName}</td>
                        <td className="px-6 py-3 text-[var(--color-ink-700)]">{currency.format(d.price)}</td>
                        <td className="px-6 py-3 font-medium text-[var(--color-ink-900)]">{currency.format(d.commission)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: tarjetas */}
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {details.map((d) => {
                const date = new Date(d.start_at);
                return (
                  <div key={d.id} className="space-y-1.5 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-ink-900)]">{d.clientName}</p>
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-ink-500)]">
                        {date.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: BOGOTA_TZ })} ·{" "}
                        {date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-ink-500)]">{d.serviceName}</span>
                      <span className="text-[var(--color-ink-700)]">{currency.format(d.price)}</span>
                    </div>
                    <p className="text-right text-xs font-medium text-[var(--color-accent-ink)]">
                      Comisión: {currency.format(d.commission)}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
