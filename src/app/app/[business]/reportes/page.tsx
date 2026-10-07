import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { syncBookingStatuses } from "@/lib/data/bookingStatusSync";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils/cn";
import { bogotaDateTime, presetRange } from "@/lib/utils/dateRange";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface BookingRow {
  id: string;
  service_id: string;
  business_member_id: string;
  services: { price: number } | { price: number }[] | null;
  business_members:
    | {
        id: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { commission_rate: number; photo_url: string | null } | { commission_rate: number; photo_url: string | null }[] | null;
      }
    | {
        id: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { commission_rate: number; photo_url: string | null } | { commission_rate: number; photo_url: string | null }[] | null;
      }[]
    | null;
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function ReportesPage({
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

  // Reportes es solo para dueño/admin: trae comisiones e ingresos de TODOS los
  // empleados, así que un empleado no debe poder verlo entrando directo por la URL.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (membership?.role === "employee") redirect(`/app/${slug}/reservas`);

  await syncBookingStatuses(supabase, business.id);

  const activePreset = sp.preset ?? "mes";
  const { from, to } = sp.from && sp.to ? { from: sp.from, to: sp.to } : presetRange(activePreset);

  const startOfRange = bogotaDateTime(from, "00:00:00");
  const endOfRange = bogotaDateTime(to, "23:59:59.999");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, service_id, business_member_id, services(price), business_members(id, profiles(full_name), employee_details(commission_rate, photo_url))"
    )
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("start_at", startOfRange.toISOString())
    .lte("start_at", endOfRange.toISOString());

  const rows = (bookings ?? []) as unknown as BookingRow[];

  const byEmployee = new Map<string, { id: string; name: string; photoUrl: string | null; rate: number; count: number; revenue: number }>();

  for (const b of rows) {
    const service = one(b.services);
    const member = one(b.business_members);
    if (!service || !member) continue;
    const profile = one(member.profiles);
    const details = one(member.employee_details);
    const rate = details?.commission_rate ?? 40;
    const price = service.price;

    const existing =
      byEmployee.get(member.id) ?? { id: member.id, name: profile?.full_name ?? "—", photoUrl: details?.photo_url ?? null, rate, count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += price;
    byEmployee.set(member.id, existing);
  }

  const employeeRows = Array.from(byEmployee.values())
    .map((e) => ({ ...e, commission: (e.revenue * e.rate) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = employeeRows.reduce((sum, e) => sum + e.revenue, 0);
  const totalCommission = employeeRows.reduce((sum, e) => sum + e.commission, 0);
  const totalServices = employeeRows.reduce((sum, e) => sum + e.count, 0);
  const netForBusiness = totalRevenue - totalCommission;

  const base = `/app/${slug}/reportes`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <PageHeader title="Reportes" description="Ingresos y comisiones por empleado en el período seleccionado." />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "hoy", label: "Hoy" },
          { key: "semana", label: "Esta semana" },
          { key: "mes", label: "Este mes" },
        ].map((p) => (
          <Link
            key={p.key}
            href={`${base}?preset=${p.key}`}
            className={cn(
              "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors",
              activePreset === p.key && !sp.from
                ? "bg-[var(--color-ink-900)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Servicios completados" value={String(totalServices)} />
        <StatCard label="Ingresos totales" value={currency.format(totalRevenue)} />
        <StatCard label="Comisiones a pagar" value={currency.format(totalCommission)} />
        <StatCard label="Neto para el negocio" value={currency.format(netForBusiness)} highlight />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por empleado</CardTitle>
        </CardHeader>
        {employeeRows.length === 0 ? (
          <EmptyState title="Sin servicios completados en este período" description="Cuando marques reservas como completadas, aparecerán aquí." />
        ) : (
          <>
            {/* Desktop/tablet: tabla (grid, no <table> real — cada fila es un único link navegable) */}
            <div className="hidden overflow-x-auto sm:block">
              <div className="min-w-[640px] text-sm">
                <div className="grid grid-cols-[1.4fr_1.1fr_1.2fr_1.1fr_1.2fr] border-b border-[var(--color-border)] px-6 py-3 text-left text-xs text-[var(--color-ink-500)]">
                  <span className="font-medium">Empleado</span>
                  <span className="font-medium">Servicios</span>
                  <span className="font-medium">Ingresos generados</span>
                  <span className="font-medium">Comisión</span>
                  <span className="font-medium">A pagar</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {employeeRows.map((e) => (
                    <Link
                      key={e.id}
                      href={`${base}/${e.id}`}
                      className="grid grid-cols-[1.4fr_1.1fr_1.2fr_1.1fr_1.2fr] items-center px-6 py-3 hover:bg-[var(--color-canvas)]"
                    >
                      <span className="flex items-center gap-2 font-medium text-[var(--color-ink-900)]">
                        <Avatar name={e.name} src={e.photoUrl} size={28} />
                        {e.name}
                      </span>
                      <Badge tone="info" className="w-fit">
                        {e.count} servicios
                      </Badge>
                      <Badge tone="neutral" className="w-fit">
                        {currency.format(e.revenue)}
                      </Badge>
                      <Badge tone="accent" className="w-fit">
                        Comisión {e.rate}%
                      </Badge>
                      <Badge tone="danger" className="w-fit">
                        {currency.format(e.commission)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: tarjetas */}
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {employeeRows.map((e) => (
                <Link
                  key={e.id}
                  href={`${base}/${e.id}`}
                  className="block space-y-2 px-5 py-4 active:bg-[var(--color-canvas)]"
                >
                  <p className="flex items-center gap-2 font-medium text-[var(--color-ink-900)]">
                    <Avatar name={e.name} src={e.photoUrl} size={28} />
                    {e.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="info" className="shrink-0">
                      {e.count} servicios
                    </Badge>
                    <Badge tone="neutral" className="shrink-0">
                      {currency.format(e.revenue)}
                    </Badge>
                    <Badge tone="accent" className="shrink-0">
                      Comisión {e.rate}%
                    </Badge>
                    <Badge tone="danger" className="shrink-0">
                      A pagar {currency.format(e.commission)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-transparent [background:var(--gradient-accent)]" : undefined}>
      <CardBody className="py-4">
        <p className={cn("text-xl font-semibold tabular-nums", highlight ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink-900)]")}>
          {value}
        </p>
        <p className={cn("mt-0.5 text-xs", highlight ? "text-[var(--color-accent-ink)]/80" : "text-[var(--color-ink-500)]")}>{label}</p>
      </CardBody>
    </Card>
  );
}
