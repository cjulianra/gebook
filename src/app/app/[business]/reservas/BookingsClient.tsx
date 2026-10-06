"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, BookingStatusBadge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { useBusiness } from "@/lib/context/BusinessContext";
import { cn } from "@/lib/utils/cn";
import { formatTime12h } from "@/lib/utils/dateRange";
import { getAvailableSlots } from "@/app/[slug]/actions";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

interface Employee {
  id: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  employee_details?: { photo_url: string | null } | { photo_url: string | null }[] | null;
}
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}
interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
}
interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  notes: string | null;
  client_id: string;
  service_id: string;
  business_member_id: string;
  clients: Client | Client[] | null;
  services: Service | Service[] | null;
  business_members: Employee | Employee[] | null;
}
interface Assignment {
  business_member_id: string;
  service_id: string;
}

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  pending: "confirmed",
  confirmed: "completed",
  in_progress: "completed",
};
const NEXT_LABEL: Partial<Record<BookingStatus, string>> = {
  pending: "Confirmar",
  confirmed: "Completar",
  in_progress: "Completar",
};

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
  const { membership } = useBusiness();
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

  const isToday = day === new Date().toISOString().slice(0, 10);

  function shiftWeek(direction: -1 | 1) {
    const d = new Date(`${day}T00:00:00`);
    d.setDate(d.getDate() + direction * 7);
    goToDay(d.toISOString().slice(0, 10));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title={isEmployee ? "Mi agenda" : "Agenda"}
        description={isEmployee ? "Tus reservas, día a día." : "Las reservas de tu negocio, día a día."}
        action={membership.canCreateBookings ? <Button onClick={() => setModalOpen(true)}>Nueva reserva</Button> : undefined}
      />

      <WeekStrip day={day} onSelect={goToDay} onShiftWeek={shiftWeek} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-bold text-[var(--color-ink-900)]">
          {capitalizeFirst(new Date(`${day}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }))}
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
            {filtered.map((booking) => {
              const client = one(booking.clients);
              const service = one(booking.services);
              const employee = one(booking.business_members);
              const next = NEXT_STATUS[booking.status];
              return (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-medium text-[var(--color-ink-700)]">
                      {new Date(booking.start_at).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink-900)]">
                        {client?.first_name} {client?.last_name ?? ""}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
                        {service?.name} ·
                        <Avatar name={one(employee?.profiles)?.full_name ?? ""} src={one(employee?.employee_details)?.photo_url} size={24} />
                        {one(employee?.profiles)?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {next && (
                        <Button size="xs" variant="info-soft" onClick={() => advanceStatus(booking)}>
                          {NEXT_LABEL[booking.status]}
                        </Button>
                      )}
                      {booking.status !== "completed" && booking.status !== "cancelled" && (
                        <Button size="xs" variant="neutral-soft" onClick={() => setToEdit(booking)}>
                          Editar
                        </Button>
                      )}
                      {booking.status !== "completed" && booking.status !== "cancelled" && (
                        <Button size="xs" variant="danger-soft" onClick={() => setToCancel(booking)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                    <div className="h-6 w-px shrink-0 bg-[var(--color-border)]" />
                    <div className="w-[6.5rem] shrink-0 text-right">
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>
              );
            })}
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

  useEffect(() => {
    if (lines.some((l) => !l.serviceId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale slots when inputs are incomplete
      setSlotsCache({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const seen = new Set<string>();
    const pairs: { key: string; employeeId: string; duration: number }[] = [];
    for (const line of lines) {
      const service = services.find((s) => s.id === line.serviceId);
      if (!service) continue;
      for (const emp of eligibleEmployeesFor(line.serviceId)) {
        const key = `${line.serviceId}:${emp.id}`;
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
  }, [lines, bookingDay, services, eligibleEmployeesFor]);

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

  function updateLineService(index: number, serviceId: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { serviceId, employeeId: lockedEmployeeId ?? "" } : l)));
    if (index === 0) setTime("");
  }

  function updateLineEmployee(index: number, employeeId: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, employeeId } : l)));
  }

  function addLine() {
    const unused = services.find((s) => !lines.some((l) => l.serviceId === s.id));
    setLines((prev) => [...prev, { serviceId: unused?.id ?? services[0]?.id ?? "", employeeId: lockedEmployeeId ?? "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
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
      const startAt = new Date(`${bookingDay}T${entry.start}:00`);
      const endAt = new Date(`${bookingDay}T${entry.end}:00`);

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

        {/* Servicios */}
        <div>
          <Label>Servicios</Label>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select value={line.serviceId} onChange={(e) => updateLineService(index, e.target.value)} className="flex-1">
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.duration_minutes} min
                    </option>
                  ))}
                </Select>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label="Quitar servicio"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-danger)]"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {lines.length < services.length && (
            <button
              type="button"
              onClick={addLine}
              className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              + Agregar otro servicio
            </button>
          )}
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
                          onClick={() => updateLineEmployee(index, emp.id)}
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

function EditBookingModal({
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
    const startAt = new Date(`${bookingDay}T${time}:00`);
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
