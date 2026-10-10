"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { setBusinessActive } from "../actions";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Business {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
}

interface Employee {
  id: string;
  role: string;
  status: string;
  fullName: string;
  email: string;
}

interface DayStat {
  date: string;
  count: number;
  revenue: number;
  cancelled: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function shiftMonth(month: string, dir: -1 | 1) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + dir, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function BusinessDetailClient({
  business,
  employees,
  days,
  month,
}: {
  business: Business;
  employees: Employee[];
  days: DayStat[];
  month: string;
}) {
  const router = useRouter();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [saving, setSaving] = useState(false);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${MONTH_LABEL[m - 1]} ${y}`;

  const totalBookings = days.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const totalCancelled = days.reduce((sum, d) => sum + d.cancelled, 0);
  const activeEmployees = employees.filter((e) => e.role === "employee" && e.status === "active").length;

  async function handleToggleActive() {
    setSaving(true);
    const result = await setBusinessActive(business.id, !business.isActive);
    setSaving(false);
    setConfirmBlock(false);
    if (result.error) return;
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs font-medium text-[var(--color-accent)] hover:underline">
          ← Todos los negocios
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">{business.name}</h1>
            <Badge tone={business.isActive ? "success" : "danger"}>{business.isActive ? "Activo" : "Bloqueado"}</Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-500)]">
            {[business.neighborhood, business.city].filter(Boolean).join(", ") || "Sin ubicación"} · Registrado el {formatDate(business.createdAt)}
          </p>
        </div>
        <Button variant={business.isActive ? "danger-soft" : "secondary"} onClick={() => setConfirmBlock(true)}>
          {business.isActive ? "Bloquear negocio" : "Reactivar negocio"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-500)]">Dueño</p>
            <p className="text-sm text-[var(--color-ink-900)]">{business.ownerName}</p>
            <p className="text-xs text-[var(--color-ink-500)]">{business.ownerEmail}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-500)]">Link público</p>
            <a href={`/${business.slug}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
              /{business.slug}
            </a>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-500)]">Teléfono</p>
            <p className="text-sm text-[var(--color-ink-900)]">{business.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-500)]">Dirección</p>
            <p className="text-sm text-[var(--color-ink-900)]">{business.address ?? "—"}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empleados ({activeEmployees} activos)</CardTitle>
        </CardHeader>
        <CardBody>
          {employees.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-500)]">Sin miembros registrados.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {employees.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-ink-900)]">{e.fullName}</p>
                    <p className="text-xs text-[var(--color-ink-500)]">{e.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{e.role === "owner" ? "Propietario" : e.role === "admin" ? "Admin" : "Empleado"}</Badge>
                    <Badge tone={e.status === "active" ? "success" : "neutral"}>{e.status === "active" ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex w-full items-center justify-between">
            <CardTitle>Reporte diario</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/admin/${business.id}?month=${shiftMonth(month, -1)}`)}
                aria-label="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
              >
                ‹
              </button>
              <span className="min-w-[140px] text-center text-sm font-medium text-[var(--color-ink-900)]">{monthLabel}</span>
              <button
                onClick={() => router.push(`/admin/${business.id}?month=${shiftMonth(month, 1)}`)}
                aria-label="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
              >
                ›
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-500)]">Reservas del mes</p>
              <p className="text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">{totalBookings}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-500)]">Ingresos (completadas)</p>
              <p className="text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">{currency.format(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-500)]">Canceladas</p>
              <p className="text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">{totalCancelled}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-500)]">
                  <th className="pb-2 pr-4">Día</th>
                  <th className="pb-2 pr-4 text-right">Reservas</th>
                  <th className="pb-2 pr-4 text-right">Canceladas</th>
                  <th className="pb-2 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {days.map((d) => {
                  const dt = new Date(`${d.date}T00:00:00`);
                  const isEmpty = d.count === 0 && d.cancelled === 0;
                  return (
                    <tr key={d.date} className={isEmpty ? "opacity-50" : undefined}>
                      <td className="py-2 pr-4 whitespace-nowrap text-[var(--color-ink-900)]">
                        {WEEKDAY_LABEL[dt.getDay()]} {dt.getDate()}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{d.count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{d.cancelled}</td>
                      <td className="py-2 text-right tabular-nums text-[var(--color-ink-900)]">{currency.format(d.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={handleToggleActive}
        title={business.isActive ? "¿Bloquear este negocio?" : "¿Reactivar este negocio?"}
        description={
          business.isActive
            ? "Su página pública de reservas dejará de estar disponible para los clientes. El negocio podrá seguir entrando a su panel."
            : "Su página pública de reservas volverá a estar disponible para los clientes."
        }
        confirmLabel={saving ? "Guardando…" : business.isActive ? "Bloquear" : "Reactivar"}
        danger={business.isActive}
      />
    </div>
  );
}
