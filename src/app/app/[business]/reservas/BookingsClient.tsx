"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { useBusiness } from "@/lib/context/BusinessContext";
import { cn } from "@/lib/utils/cn";
import { BOGOTA_TZ, bogotaDateTime, formatTime12h, todayInBogota } from "@/lib/utils/dateRange";
import { getAvailableSlots } from "@/app/[slug]/actions";
import { BookingRow } from "@/components/bookings/BookingRow";
import { EditBookingModal } from "@/components/bookings/EditBookingModal";
import {
  type Assignment,
  type Booking,
  type Client,
  type Employee,
  type Service,
  NEXT_STATUS,
  addMinutes,
  capitalizeFirst,
  one,
  timeToMinutes,
} from "@/components/bookings/types";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function BookingsClient({
  businessId,
  day,
  initialBookings,
  employees,
  services,
  clients: initialClients,
  assignments,
}: {
  businessId: string;
  day: string;
  initialBookings: Booking[];
  employees: Employee[];
  services: Service[];
  clients: Client[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const { membership, profile } = useBusiness();
  const isEmployee = membership.role === "employee";
  const [bookings, setBookings] = useState(initialBookings);
  const [clients, setClients] = useState(initialClients);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-sync local bookings whenever the server refetches for a different day
    setBookings(initialBookings);
  }, [day, initialBookings]);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [toEdit, setToEdit] = useState<Booking | null>(null);
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const showToast = useToast();

  function goToDay(newDay: string) {
    router.push(`?date=${newDay}`);
  }

  const filtered = useMemo(
    () => (employeeFilter === "all" ? bookings : bookings.filter((b) => b.business_member_id === employeeFilter)),
    [bookings, employeeFilter]
  );

  async function advanceStatus(booking: Booking) {
    const next = NEXT_STATUS[booking.status];
    if (!next) return;
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ status: next }).eq("id", booking.id);
    if (error) {
      showToast("No pudimos actualizar la reserva.", "danger");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: next } : b)));
  }

  async function handleCancel() {
    if (!toCancel) return;
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", toCancel.id);
    if (error) {
      showToast("No pudimos cancelar la reserva.", "danger");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === toCancel.id ? { ...b, status: "cancelled" } : b)));
    showToast("Reserva cancelada.");
  }

  const isToday = day === todayInBogota();

  function shiftWeek(direction: -1 | 1) {
    const d = new Date(`${day}T00:00:00`);
    d.setDate(d.getDate() + direction * 7);
    goToDay(d.toISOString().slice(0, 10));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title={isEmployee ? profile.full_name : "Agenda"}
        description={isEmployee ? "Tu agenda, día a día." : "Las reservas de tu negocio, día a día."}
        action={membership.canCreateBookings ? <Button onClick={() => setModalOpen(true)}>Nueva reserva</Button> : undefined}
      />

      <WeekStrip day={day} onSelect={goToDay} onShiftWeek={shiftWeek} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-bold text-[var(--color-ink-900)]">
          {capitalizeFirst(bogotaDateTime(day, "00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ }))}
          {isToday && <span className="ml-1.5 font-normal text-[var(--color-ink-500)]">(hoy)</span>}
        </p>

        {!isEmployee && employees.length > 0 && (
          <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-48">
            <option value="all">Todos los empleados</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {one(emp.profiles)?.full_name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="Sin reservas para este día"
            description="Crea una reserva para empezar a llenar la agenda."
            action={membership.canCreateBookings ? { label: "Nueva reserva", onClick: () => setModalOpen(true) } : undefined}
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                menuOpen={openActionsFor === booking.id}
                onToggleMenu={() => setOpenActionsFor((id) => (id === booking.id ? null : booking.id))}
                onAdvance={(b) => {
                  advanceStatus(b);
                  setOpenActionsFor(null);
                }}
                onEdit={(b) => {
                  setToEdit(b);
                  setOpenActionsFor(null);
                }}
                onCancel={(b) => {
                  setToCancel(b);
                  setOpenActionsFor(null);
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <NewBookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        businessId={businessId}
        day={day}
        employees={employees}
        services={services}
        clients={clients}
        assignments={assignments}
        lockedEmployeeId={isEmployee ? membership.id : undefined}
        onClientCreated={(client) => setClients((prev) => [...prev, client])}
        onCreated={(booking) => {
          setBookings((prev) => [...prev, booking].sort((a, b) => a.start_at.localeCompare(b.start_at)));
          setModalOpen(false);
          showToast("Reserva creada.");
        }}
      />

      <EditBookingModal
        booking={toEdit}
        onClose={() => setToEdit(null)}
        businessId={businessId}
        employees={employees}
        assignments={assignments}
        lockedEmployeeId={isEmployee ? membership.id : undefined}
        onSaved={(updated) => {
          setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)).sort((a, b) => a.start_at.localeCompare(b.start_at)));
          setToEdit(null);
          showToast("Reserva actualizada.");
        }}
      />

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        description="El horario quedará libre nuevamente."
        confirmLabel="Cancelar reserva"
        danger
      />
    </div>
  );
}

function NewBookingModal({
  open,
  onClose,
  businessId,
  day,
  employees,
  services,
  clients,
  assignments,
  lockedEmployeeId,
  onClientCreated,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  day: string;
  employees: Employee[];
  services: Service[];
  clients: Client[];
  assignments: Assignment[];
  lockedEmployeeId?: string;
  onClientCreated: (client: Client) => void;
  onCreated: (booking: Booking) => void;
}) {
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length > 0 ? "existing" : "new");
  const [clientId, setClientId] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [lines, setLines] = useState<{ serviceId: string; employeeId: string }[]>([
    { serviceId: services[0]?.id ?? "", employeeId: lockedEmployeeId ?? "" },
  ]);
  const [bookingDay, setBookingDay] = useState(day);
  const [time, setTime] = useState("");
  const [slotsCache, setSlotsCache] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const eligibleEmployeesFor = useCallback(
    (serviceId: string) => {
      if (!serviceId) return employees;
      const assignedIds = assignments.filter((a) => a.service_id === serviceId).map((a) => a.business_member_id);
      const matched = employees.filter((e) => assignedIds.includes(e.id));
      return matched.length > 0 ? matched : employees;
    },
    [employees, assignments]
  );

  // Agenda cada servicio uno tras otro a partir de la hora de inicio elegida
  // (el cliente solo puede recibir un servicio a la vez).
  const schedule = useMemo(() => {
    if (!time) return [];
    let cursor = time;
    return lines.map((line) => {
      const service = services.find((s) => s.id === line.serviceId);
      const duration = service?.duration_minutes ?? 0;
      const start = cursor;
      const end = addMinutes(cursor, duration);
      cursor = end;
      return { ...line, service, start, end };
    });
  }, [lines, services, time]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the day field to whatever agenda day was being viewed each time the modal opens
    setBookingDay(day);
  }, [open, day]);

  // Clave estable con solo los servicios de cada línea: elegir hora o
  // empleado también reasigna `lines` (para resetear employeeId), pero eso
  // no debe disparar una nueva búsqueda de horarios — solo cambiar de
  // servicio o de día debería hacerlo. Sin esto, cada clic en una pastilla
  // de hora o en un empleado volvía a mostrar "Buscando horarios…" y todo
  // "saltaba".
  const serviceIdsKey = useMemo(() => lines.map((l) => l.serviceId).join("|"), [lines]);

  useEffect(() => {
    const serviceIds = serviceIdsKey ? serviceIdsKey.split("|") : [];
    if (serviceIds.length === 0 || serviceIds.some((id) => !id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale slots when inputs are incomplete
      setSlotsCache({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const seen = new Set<string>();
    const pairs: { key: string; employeeId: string; duration: number }[] = [];
    for (const serviceId of serviceIds) {
      const service = services.find((s) => s.id === serviceId);
      if (!service) continue;
      for (const emp of eligibleEmployeesFor(serviceId)) {
        const key = `${serviceId}:${emp.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ key, employeeId: emp.id, duration: service.duration_minutes });
      }
    }
    Promise.all(
      pairs.map(async (p) => {
        const slots = await getAvailableSlots(p.employeeId, bookingDay, p.duration);
        return [p.key, slots] as const;
      })
    ).then((results) => {
      if (cancelled) return;
      setSlotsCache(Object.fromEntries(results));
      setLoadingSlots(false);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceIdsKey, bookingDay, services, eligibleEmployeesFor]);

  const firstLine = lines[0];
  // Horas candidatas: la unión de los horarios libres de todos los empleados
  // elegibles para el primer servicio ese día — así las "pastillas" de hora
  // nunca muestran un horario en el que absolutamente nadie pueda atender.
  const candidateTimes = useMemo(() => {
    if (!firstLine) return [];
    const all = new Set<string>();
    for (const emp of eligibleEmployeesFor(firstLine.serviceId)) {
      for (const t of slotsCache[`${firstLine.serviceId}:${emp.id}`] ?? []) all.add(t);
    }
    return Array.from(all).sort();
  }, [firstLine, slotsCache, eligibleEmployeesFor]);

  // Pastillas de toda la jornada (09:00–19:00 por defecto, ampliada si algún
  // horario disponible cae fuera de ese rango): las no disponibles se muestran
  // igual, en gris, para que se vea cuándo nadie puede atender.
  const allDayTimes = useMemo(() => {
    let start = timeToMinutes("09:00");
    let end = timeToMinutes("19:00");
    for (const t of candidateTimes) {
      const mins = timeToMinutes(t);
      if (mins < start) start = mins;
      if (mins > end) end = mins;
    }
    const times: string[] = [];
    for (let m = start; m <= end; m += 30) {
      times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return times;
  }, [candidateTimes]);

  function toggleService(serviceId: string) {
    setLines((prev) => {
      const next = prev.some((l) => l.serviceId === serviceId)
        ? prev.filter((l) => l.serviceId !== serviceId)
        : [...prev, { serviceId, employeeId: lockedEmployeeId ?? "" }];
      // mantener el orden del catálogo para que el encadenado de horarios sea predecible
      return services.filter((s) => next.some((l) => l.serviceId === s.id)).map((s) => next.find((l) => l.serviceId === s.id)!);
    });
    setTime("");
  }

  function updateLineEmployee(serviceId: string, employeeId: string) {
    setLines((prev) => prev.map((l) => (l.serviceId === serviceId ? { ...l, employeeId } : l)));
  }

  function selectDay(d: string) {
    setBookingDay(d);
    setLines((prev) => prev.map((l) => ({ ...l, employeeId: lockedEmployeeId ?? "" })));
    setTime("");
  }

  function selectTime(t: string) {
    setTime(t);
    setLines((prev) => prev.map((l) => ({ ...l, employeeId: lockedEmployeeId ?? "" })));
  }

  function isEmployeeAvailableAt(serviceId: string, employeeId: string, atTime: string) {
    return (slotsCache[`${serviceId}:${employeeId}`] ?? []).includes(atTime);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.some((l) => !l.serviceId)) return setError("Selecciona un servicio en cada línea.");
    if (!time) return setError("Elige el día y la hora.");
    for (const entry of schedule) {
      if (!entry.employeeId) return setError(`Selecciona un empleado para ${entry.service?.name ?? "el servicio"}.`);
      if (!isEmployeeAvailableAt(entry.serviceId, entry.employeeId, entry.start)) {
        return setError(`El empleado elegido para ${entry.service?.name ?? "el servicio"} ya no está disponible a esa hora.`);
      }
    }
    if (clientMode === "existing" && !clientId) return setError("Selecciona un cliente.");
    if (clientMode === "new" && !newFirstName.trim()) return setError("Escribe el nombre del cliente.");
    if (clientMode === "new" && !newPhone.trim()) return setError("Escribe el número de WhatsApp del cliente.");

    setLoading(true);
    const supabase = createClient();

    let finalClientId = clientId;
    let clientRecord = clients.find((c) => c.id === clientId) ?? null;

    if (clientMode === "new") {
      const { data: createdClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          business_id: businessId,
          first_name: newFirstName.trim(),
          last_name: newLastName.trim() || null,
          phone: newPhone.trim() || null,
        })
        .select()
        .single();

      if (clientError || !createdClient) {
        setLoading(false);
        setError("No pudimos crear el cliente.");
        return;
      }
      finalClientId = createdClient.id;
      clientRecord = createdClient;
      onClientCreated(createdClient);
    }

    const employeeSummary = new Map<string, string[]>();
    for (const entry of schedule) {
      const startAt = bogotaDateTime(bookingDay, `${entry.start}:00`);
      const endAt = bogotaDateTime(bookingDay, `${entry.end}:00`);

      const result = await supabase
        .from("bookings")
        .insert({
          business_id: businessId,
          client_id: finalClientId,
          service_id: entry.serviceId,
          business_member_id: entry.employeeId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: "confirmed",
        })
        .select("id, start_at, end_at, status, notes, client_id, service_id, business_member_id")
        .single();

      if (result.error || !result.data) {
        setLoading(false);
        setError(`No pudimos agendar ${entry.service?.name ?? "un servicio"}. Es posible que ese horario ya no esté disponible.`);
        return;
      }

      const employee = employees.find((e) => e.id === entry.employeeId) ?? null;
      onCreated({ ...result.data, clients: clientRecord, services: entry.service, business_members: employee } as unknown as Booking);

      if (entry.employeeId !== lockedEmployeeId && entry.service) {
        const list = employeeSummary.get(entry.employeeId) ?? [];
        list.push(`${entry.service.name} a las ${formatTime12h(entry.start)}`);
        employeeSummary.set(entry.employeeId, list);
      }
    }

    setLoading(false);

    const clientName = clientRecord ? `${clientRecord.first_name} ${clientRecord.last_name ?? ""}`.trim() : "un cliente";
    for (const [empId, serviceDescriptions] of employeeSummary) {
      await supabase.from("notifications").insert({
        business_id: businessId,
        business_member_id: empId,
        title: serviceDescriptions.length > 1 ? "Nuevas reservas confirmadas" : "Nueva reserva confirmada",
        body: `${clientName}: ${serviceDescriptions.join(", ")}.`,
        link: "/reservas",
      });
    }

    // reset para la próxima reserva
    setClientId("");
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setLines([{ serviceId: services[0]?.id ?? "", employeeId: lockedEmployeeId ?? "" }]);
    setTime("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva reserva"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando…" : "Crear reserva"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente */}
        <div>
          <Label>Cliente</Label>
          <div className="mb-2 flex gap-1 rounded-[var(--radius-pill)] bg-[var(--color-canvas)] p-1">
            <button
              type="button"
              onClick={() => setClientMode("existing")}
              className={cn(
                "flex-1 rounded-[var(--radius-pill)] py-1.5 text-sm font-medium transition-colors",
                clientMode === "existing" ? "bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)]" : "text-[var(--color-ink-500)]"
              )}
            >
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => setClientMode("new")}
              className={cn(
                "flex-1 rounded-[var(--radius-pill)] py-1.5 text-sm font-medium transition-colors",
                clientMode === "new" ? "bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)]" : "text-[var(--color-ink-500)]"
              )}
            >
              Cliente nuevo
            </button>
          </div>

          {clientMode === "existing" ? (
            <>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecciona un cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name ?? ""} {c.phone ? `· ${c.phone}` : ""}
                  </option>
                ))}
              </Select>
              {clients.length === 0 && (
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">Aún no tienes clientes. Usa &quot;Cliente nuevo&quot;.</p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Nombre" />
              <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Apellido (opcional)" />
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Número de WhatsApp" className="col-span-2" />
            </div>
          )}
        </div>

        {/* Servicios: lista completamente visible (no desplegable) — cada uno
            muestra su duración y precio, y se pueden marcar varios. */}
        <div>
          <Label>Servicios</Label>
          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
            {services.map((s) => {
              const selected = lines.some((l) => l.serviceId === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-all",
                    selected
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                        selected ? "border-transparent bg-[var(--color-ink-900)] text-white" : "border-[var(--color-border-strong)]"
                      )}
                    >
                      {selected && "✓"}
                    </span>
                    <span className="truncate font-medium">{s.name}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs opacity-80">
                    {s.duration_minutes} min · {currency.format(s.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Día */}
        <div>
          <Label>Día</Label>
          <WeekStrip day={bookingDay} onSelect={selectDay} onShiftWeek={(dir) => {
            const d = new Date(`${bookingDay}T00:00:00`);
            d.setDate(d.getDate() + dir * 7);
            selectDay(d.toISOString().slice(0, 10));
          }} />
        </div>

        {/* Hora */}
        <div>
          <Label>Hora</Label>
          {loadingSlots ? (
            <p className="text-sm text-[var(--color-ink-500)]">Buscando horarios…</p>
          ) : candidateTimes.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-500)]">Nadie tiene horario disponible ese día para este servicio. Prueba otro día.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {allDayTimes.map((t) => {
                  const isAvailable = candidateTimes.includes(t);
                  const selected = t === time;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => selectTime(t)}
                      title={isAvailable ? undefined : "Nadie está disponible a esta hora"}
                      className={cn(
                        "rounded-[var(--radius-pill)] py-2 text-sm font-medium whitespace-nowrap transition-all",
                        selected
                          ? "bg-[var(--color-ink-900)] text-white"
                          : isAvailable
                            ? "bg-[var(--color-canvas)] text-[var(--color-ink-700)] hover:bg-[var(--color-border)]"
                            : "cursor-not-allowed bg-[var(--color-canvas)]/40 text-[var(--color-ink-500)]/50 line-through"
                      )}
                    >
                      {formatTime12h(t)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--color-ink-500)]">Las horas tachadas no tienen ningún empleado disponible.</p>
            </>
          )}
        </div>

        {/* Empleados disponibles, uno por servicio, según el horario en cascada */}
        {!lockedEmployeeId &&
          schedule.map((entry, index) => {
            const eligibleEmployees = eligibleEmployeesFor(entry.serviceId);
            return (
              <div key={index}>
                <Label>
                  Empleado para {entry.service?.name ?? `servicio ${index + 1}`}{" "}
                  <span className="font-normal text-[var(--color-ink-500)]">
                    ({formatTime12h(entry.start)}–{formatTime12h(entry.end)})
                  </span>
                </Label>
                {eligibleEmployees.length === 0 ? (
                  <EmptyState title="Ningún empleado realiza este servicio todavía" />
                ) : (
                  <div className="space-y-1.5">
                    {eligibleEmployees.map((emp) => {
                      const name = one(emp.profiles)?.full_name ?? "";
                      const isAvailable = isEmployeeAvailableAt(entry.serviceId, emp.id, entry.start);
                      const selected = entry.employeeId === emp.id;
                      const disabled = !isAvailable;
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => updateLineEmployee(entry.serviceId, emp.id)}
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
            );
          })}

        <FieldError>{error ?? undefined}</FieldError>
      </form>
    </Modal>
  );
}

