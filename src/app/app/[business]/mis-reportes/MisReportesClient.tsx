"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { AccountPanel, currency, type Payout } from "@/components/employees/AccountModal";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";

interface PeriodService {
  id: string;
  start_at: string;
  clientName: string;
  serviceName: string;
  price: number;
  commission: number;
}

export function MisReportesClient(props: {
  businessId: string;
  memberId: string;
  earned: number;
  initialPayouts: Payout[];
  activePreset: string | null;
  periodServices: PeriodService[];
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({
  businessId,
  memberId,
  earned,
  initialPayouts,
  activePreset,
  periodServices,
}: {
  businessId: string;
  memberId: string;
  earned: number;
  initialPayouts: Payout[];
  activePreset: string | null;
  periodServices: PeriodService[];
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <PageHeader title="Reportes" description="Los servicios que has realizado y tu cuenta con el negocio." />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "hoy", label: "Hoy" },
          { key: "semana", label: "Esta semana" },
          { key: "mes", label: "Este mes" },
        ].map((p) => (
          <Link
            key={p.key}
            href={`${pathname}?preset=${p.key}`}
            className={cn(
              "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors",
              activePreset === p.key
                ? "bg-[var(--color-ink-900)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis servicios</CardTitle>
        </CardHeader>
        {periodServices.length === 0 ? (
          <EmptyState title="Sin servicios completados en este período" />
        ) : (
          <>
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
                  {periodServices.map((d) => {
                    const date = new Date(d.start_at);
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">{date.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: BOGOTA_TZ })}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">{date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ })}</td>
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
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {periodServices.map((d) => {
                const date = new Date(d.start_at);
                return (
                  <div key={d.id} className="space-y-1.5 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-ink-900)]">{d.clientName}</p>
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-ink-500)]">
                        {date.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: BOGOTA_TZ })} · {date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-ink-500)]">{d.serviceName}</span>
                      <span className="text-[var(--color-ink-700)]">{currency.format(d.price)}</span>
                    </div>
                    <p className="text-right text-xs font-medium text-[var(--color-accent-ink)]">Comisión: {currency.format(d.commission)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mi cuenta</CardTitle>
        </CardHeader>
        <CardBody>
          <AccountPanel memberId={memberId} payouts={initialPayouts} earned={earned} businessId={businessId} readOnly />
        </CardBody>
      </Card>
    </div>
  );
}
