"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Label, FieldError, SearchInput } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/dateRange";
import { type Assignment, type Booking, type Employee, type Service, one } from "./types";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/**
 * Agrega un servicio extra a una reserva existente — encadenado justo
 * después de que termina (o terminó), para el mismo cliente. Útil cuando a
 * mitad (o al final) del servicio el cliente pide algo más, sin tener que
 * crear una reserva aparte desde cero. Disponible tanto si la reserva
 * original todavía se puede editar como si ya quedó "Completada".
 */
export function AddExtraServiceModal({
  booking,
  onClose,
  businessId,
  services,
  employees,
  assignments,
  lockedEmployeeId,
  onCreated,
}: {
  booking: Booking | null;
  onClose: () => void;
  businessId: string;
  services: Service[];
  employees: Employee[];
  assignments: Assignment[];
  lockedEmployeeId?: string;
  onCreated: (booking: Booking) => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  if (booking && booking.id !== lastBookingId) {
    setLastBookingId(booking.id);
    setServiceId("");
    setEmployeeId(lockedEmployeeId ?? booking.business_member_id ?? "");
    setQuery("");
    setError(null);
  }

  if (!booking) return null;
  const client = one(booking.clients);
  const originalService = one(booking.services);

  const filteredServices = services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  const eligibleEmployees = serviceId
    ? employees.filter((e) => assignments.some((a) => a.service_id === serviceId && a.business_member_id === e.id))
    : [];

  function selectService(id: string) {
    setServiceId(id);
    const assignedIds = assignments.filter((a) => a.service_id === id).map((a) => a.business_member_id);
    setEmployeeId(lockedEmployeeId ?? (assignedIds.includes(booking!.business_member_id) ? booking!.business_member_id : ""));
  }

  async function handleSubmit() {
    if (!booking) return;
    setError(null);
    if (!serviceId) return setError("Elige el servicio extra.");
    if (!employeeId) return setError("Selecciona quién lo hace.");

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setLoading(true);
    const supabase = createClient();
    const startAt = new Date(booking.end_at);
    const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

    const result = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        client_id: booking.client_id,
        service_id: serviceId,
        business_member_id: employeeId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "confirmed",
      })
      .select("id, start_at, end_at, status, notes, client_id, service_id, business_member_id")
      .single();

    setLoading(false);
    if (result.error || !result.data) {
      setError("No pudimos agregar el servicio. Intenta de nuevo.");
      return;
    }

    const employee = employees.find((e) => e.id === employeeId) ?? null;
    onCreated({ ...result.data, clients: booking.clients, services: service, business_members: employee } as unknown as Booking);
  }

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title="Agregar servicio extra"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Agregando…" : "Agregar servicio"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--color-ink-900)]">
            {client?.first_name} {client?.last_name ?? ""}
          </p>
          <p className="text-[var(--color-ink-500)]">
            Ya tiene: {originalService?.name} — el nuevo servicio se agenda justo después, a continuación.
          </p>
        </div>

        <div>
          <Label>Servicio extra</Label>
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servicio…" className="mb-2" />
          <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
            {filteredServices.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-ink-500)]">Ningún servicio coincide con tu búsqueda.</p>
            ) : (
              filteredServices.map((s) => {
                const selected = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectService(s.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-all",
                      selected
                        ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                        selected ? "border-transparent bg-[var(--color-ink-900)] text-white" : "border-[var(--color-border-strong)]"
                      )}
                    >
                      {selected && "✓"}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-xs opacity-80">
                        {formatDuration(s.duration_minutes)} · Desde {currency.format(s.price)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {!lockedEmployeeId && serviceId && (
          <div>
            <Label>¿Quién lo hace?</Label>
            {eligibleEmployees.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-500)]">Ningún empleado realiza este servicio todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {eligibleEmployees.map((emp) => {
                  const name = one(emp.profiles)?.full_name ?? "";
                  const selected = employeeId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setEmployeeId(emp.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-2.5 text-left text-sm transition-all",
                        selected
                          ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                          : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Avatar name={name} src={one(emp.employee_details)?.photo_url} size={28} />
                        <span className="font-medium text-[var(--color-ink-900)]">{name}</span>
                      </span>
                      {emp.id === booking.business_member_id && <Badge tone="accent">Mismo de antes</Badge>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <FieldError>{error ?? undefined}</FieldError>
      </div>
    </Modal>
  );
}
