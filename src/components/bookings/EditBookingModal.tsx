"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Label, FieldError } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { cn } from "@/lib/utils/cn";
import { bogotaDateTime, formatTime12h } from "@/lib/utils/dateRange";
import { getAvailableSlots } from "@/app/[slug]/actions";
import { type Assignment, type Booking, type Employee, one } from "./types";

export function EditBookingModal({
  booking,
  onClose,
  businessId,
  employees,
  assignments,
  lockedEmployeeId,
  onSaved,
}: {
  booking: Booking | null;
  onClose: () => void;
  businessId: string;
  employees: Employee[];
  assignments: Assignment[];
  lockedEmployeeId?: string;
  onSaved: (booking: Pick<Booking, "id" | "start_at" | "end_at" | "business_member_id" | "business_members">) => void;
}) {
  const service = one(booking?.services);
  const [bookingDay, setBookingDay] = useState(booking ? booking.start_at.slice(0, 10) : "");
  const [time, setTime] = useState(booking ? booking.start_at.slice(11, 16) : "");
  const [employeeId, setEmployeeId] = useState(lockedEmployeeId ?? booking?.business_member_id ?? "");
  const [employeeSlots, setEmployeeSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  if (booking && booking.id !== lastBookingId) {
    setLastBookingId(booking.id);
    setBookingDay(booking.start_at.slice(0, 10));
    setTime(booking.start_at.slice(11, 16));
    setEmployeeId(lockedEmployeeId ?? booking.business_member_id);
    setError(null);
  }

  const eligibleEmployees = useMemo(() => {
    if (!booking) return [];
    const assignedIds = assignments.filter((a) => a.service_id === booking.service_id).map((a) => a.business_member_id);
    const matched = employees.filter((e) => assignedIds.includes(e.id));
    return matched.length > 0 ? matched : employees;
  }, [booking, employees, assignments]);

  useEffect(() => {
    if (!booking || !service || eligibleEmployees.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale slots when inputs are incomplete
      setEmployeeSlots({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    Promise.all(
      eligibleEmployees.map(async (emp) => {
        const slots = await getAvailableSlots(emp.id, bookingDay, service.duration_minutes);
        const withCurrent = emp.id === booking.business_member_id && bookingDay === booking.start_at.slice(0, 10) ? Array.from(new Set([...slots, booking.start_at.slice(11, 16)])).sort() : slots;
        return [emp.id, withCurrent] as const;
      })
    ).then((results) => {
      if (cancelled) return;
      setEmployeeSlots(Object.fromEntries(results));
      setLoadingSlots(false);
    });
    return () => {
      cancelled = true;
    };
  }, [booking, service, bookingDay, eligibleEmployees]);

  const candidateTimes = useMemo(() => {
    const all = new Set<string>();
    for (const emp of eligibleEmployees) {
      for (const t of employeeSlots[emp.id] ?? []) all.add(t);
    }
    return Array.from(all).sort();
  }, [employeeSlots, eligibleEmployees]);

  function isEmployeeAvailable(employeeIdToCheck: string) {
    return (employeeSlots[employeeIdToCheck] ?? []).includes(time);
  }

  function selectDay(d: string) {
    setBookingDay(d);
    setEmployeeId(lockedEmployeeId ?? "");
    setTime("");
  }

  function selectTime(t: string) {
    setTime(t);
    setEmployeeId(lockedEmployeeId ?? "");
  }

  async function handleSubmit() {
    if (!booking || !service) return;
    setError(null);
    if (!time) return setError("Elige el día y la hora.");
    if (!employeeId) return setError("Selecciona un empleado disponible.");
    if (!isEmployeeAvailable(employeeId)) return setError("Ese empleado no está disponible en ese horario.");

    setLoading(true);
    const supabase = createClient();
    const startAt = bogotaDateTime(bookingDay, `${time}:00`);
    const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

    const result = await supabase
      .from("bookings")
      .update({
        business_member_id: employeeId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
      })
      .eq("id", booking.id)
      .select("id, start_at, end_at, business_member_id")
      .single();

    setLoading(false);
    if (result.error || !result.data) {
      setError("No pudimos actualizar la reserva. Es posible que ese horario ya no esté disponible.");
      return;
    }
    const employee = employees.find((e) => e.id === employeeId) ?? null;
    onSaved({ ...result.data, business_members: employee });

    if (employeeId !== lockedEmployeeId) {
      const client = one(booking.clients);
      const clientName = client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : "un cliente";
      await supabase.from("notifications").insert({
        business_id: businessId,
        business_member_id: employeeId,
        title: "Reserva reprogramada",
        body: `${service.name} con ${clientName} ahora es el ${bookingDay} a las ${formatTime12h(time)}.`,
        link: "/reservas",
      });
    }
  }

  if (!booking) return null;
  const client = one(booking.clients);

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title="Editar reserva"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--color-ink-900)]">
            {client?.first_name} {client?.last_name ?? ""}
          </p>
          <p className="text-[var(--color-ink-500)]">{service?.name}</p>
        </div>

        <div>
          <Label>Día</Label>
          <WeekStrip
            day={bookingDay}
            onSelect={selectDay}
            onShiftWeek={(direction) => {
              const d = new Date(`${bookingDay}T00:00:00`);
              d.setDate(d.getDate() + direction * 7);
              selectDay(d.toISOString().slice(0, 10));
            }}
          />
        </div>

        <div>
          <Label>Hora</Label>
          {loadingSlots ? (
            <p className="text-sm text-[var(--color-ink-500)]">Buscando horarios…</p>
          ) : candidateTimes.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-500)]">Nadie tiene horario disponible ese día. Prueba otro día.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {candidateTimes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => selectTime(t)}
                  className={cn(
                    "rounded-[var(--radius-pill)] py-2 text-sm font-medium whitespace-nowrap transition-all",
                    t === time
                      ? "bg-[var(--color-ink-900)] text-white"
                      : "bg-[var(--color-canvas)] text-[var(--color-ink-700)] hover:bg-[var(--color-border)]"
                  )}
                >
                  {formatTime12h(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!lockedEmployeeId && (
          <div>
            <Label>Empleado</Label>
            {!time ? (
              <p className="text-sm text-[var(--color-ink-500)]">Elige una hora para ver quién está disponible.</p>
            ) : (
              <div className="space-y-1.5">
                {eligibleEmployees.map((emp) => {
                  const name = one(emp.profiles)?.full_name ?? "";
                  const isAvailable = isEmployeeAvailable(emp.id);
                  const selected = employeeId === emp.id;
                  const disabled = !isAvailable;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setEmployeeId(emp.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-2.5 text-left text-sm transition-all",
                        selected
                          ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                          : disabled
                            ? "cursor-not-allowed border-[var(--color-border)] opacity-50"
                            : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Avatar name={name} src={one(emp.employee_details)?.photo_url} size={28} />
                        <span className="font-medium text-[var(--color-ink-900)]">{name}</span>
                      </span>
                      <Badge tone={isAvailable ? "success" : "danger"}>{isAvailable ? "Disponible" : "No disponible"}</Badge>
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
