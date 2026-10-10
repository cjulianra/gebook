"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  isActive: boolean;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  employeeCount: number;
  bookingsToday: number;
  bookingsWeek: number;
  bookingsMonth: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium text-[var(--color-ink-500)]">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink-900)]">{value}</p>
      </CardBody>
    </Card>
  );
}

export function AdminDashboardClient({ rows }: { rows: BusinessRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      r.ownerEmail.toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q)
    );
  });

  const totalBusinesses = rows.length;
  const activeBusinesses = rows.filter((r) => r.isActive).length;
  const totalEmployees = rows.reduce((sum, r) => sum + r.employeeCount, 0);
  const totalBookingsToday = rows.reduce((sum, r) => sum + r.bookingsToday, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">Negocios registrados</h1>
        <p className="text-sm text-[var(--color-ink-500)]">Vista general de todos los negocios en la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Negocios totales" value={totalBusinesses} />
        <StatCard label="Negocios activos" value={activeBusinesses} />
        <StatCard label="Empleados totales" value={totalEmployees} />
        <StatCard label="Reservas hoy" value={totalBookingsToday} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Negocios</CardTitle>
        </CardHeader>
        <CardBody>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, link, dueño o ciudad…" className="mb-4" />

          {filtered.length === 0 ? (
            <EmptyState title="Sin resultados" description="Ningún negocio coincide con tu búsqueda." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-500)]">
                    <th className="pb-2 pr-4">Negocio</th>
                    <th className="pb-2 pr-4">Dueño</th>
                    <th className="pb-2 pr-4">Registrado</th>
                    <th className="pb-2 pr-4">Link público</th>
                    <th className="pb-2 pr-4 text-right">Empleados</th>
                    <th className="pb-2 pr-4 text-right">Hoy</th>
                    <th className="pb-2 pr-4 text-right">Semana</th>
                    <th className="pb-2 pr-4 text-right">Mes</th>
                    <th className="pb-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[var(--color-ink-900)]">{r.name}</p>
                        {(r.city || r.neighborhood) && (
                          <p className="text-xs text-[var(--color-ink-500)]">{[r.neighborhood, r.city].filter(Boolean).join(", ")}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-[var(--color-ink-900)]">{r.ownerName}</p>
                        <p className="text-xs text-[var(--color-ink-500)]">{r.ownerEmail}</p>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-[var(--color-ink-700)]">{formatDate(r.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <a
                          href={`/${r.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[var(--color-accent)] hover:underline"
                        >
                          /{r.slug}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{r.employeeCount}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{r.bookingsToday}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{r.bookingsWeek}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--color-ink-900)]">{r.bookingsMonth}</td>
                      <td className="py-3 text-right">
                        <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Activo" : "Inactivo"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
