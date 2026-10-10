"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BusinessMark } from "@/components/layout/AppShell";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { EmptyState } from "@/components/ui/States";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { BOGOTA_TZ, bogotaDateTime, formatTime12h, todayInBogota } from "@/lib/utils/dateRange";
import { addMinutes } from "@/components/bookings/types";
import { getAvailableSlots, confirmBooking } from "./actions";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface Business {
  id: string;
  name: string;
  slug: string;
  business_type: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  logo_url: string | null;
  show_prices: boolean;
}
interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
}
interface Employee {
  business_member_id: string;
  full_name: string;
  specialty: string | null;
  photo_url: string | null;
}
interface Assignment {
  business_member_id: string;
  service_id: string;
}

const STEPS = ["Servicio", "Fecha y hora", "Profesional", "Confirmar"] as const;
type Step = 1 | 2 | 3 | 4;

export function BookingWidget(props: {
  business: Business;
  services: Service[];
  employees: Employee[];
  assignments: Assignment[];
}) {
  return (
    <ToastProvider>
      <Suspense>
        <BookingWidgetInner {...props} />
      </Suspense>
    </ToastProvider>
  );
}

// getAvailableSlots solo devuelve horas en la rejilla de 30 min (09:00,
// 09:30, …). Si un servicio dura, por ejemplo, 75 min, el siguiente servicio
// de la cadena caería en una hora "suelta" (09:15) que nunca va a coincidir
// con ningún slot válido — por eso hay que redondear hacia arriba a la
// rejilla antes de buscar disponibilidad del siguiente servicio.
function roundUpToStep(time: string, step = 30) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m;
  const rounded = Math.ceil(total / step) * step;
  const hh = Math.floor(rounded / 60) % 24;
  const mm = rounded % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function todayKey() {
  return todayInBogota();
}

function BookingWidgetInner({ business, services, employees, assignments }: {
  business: Business;
  services: Service[];
  employees: Employee[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const initialServices = (searchParams.get("services") ?? searchParams.get("service") ?? "").split(",").filter(Boolean);
  const initialEmployee = searchParams.get("employee") ?? "";
  const initialDay = searchParams.get("day") ?? todayKey();
  const initialTime = searchParams.get("time") ?? "";

  const [serviceIds, setServiceIds] = useState<string[]>(initialServices);
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const [step, setStep] = useState<Step>(initialEmployee ? 4 : initialTime ? 3 : initialServices.length > 0 ? 2 : 1);
  // slots por servicio y por empleado elegible para ESE servicio (no por la
  // intersección de todos) — así un negocio con personal especializado (uno
  // hace cabello, otro uñas) puede combinar servicios sin que nadie los haga
  // todos: cada servicio se asigna a quien SÍ lo hace y esté libre a esa hora.
  const [serviceEmployeeSlots, setServiceEmployeeSlots] = useState<Record<string, Record<string, string[]>>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<{
    assignments: { service: Service; employee: Employee }[];
    day: string;
    time: string;
  } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setAuthChecked(true);
    });
  }, []);

  // El orden del catálogo decide el orden en que se encadenan los servicios.
  const selectedServices = services.filter((s) => serviceIds.includes(s.id));

  function eligibleEmployeesForService(serviceId: string) {
    return employees.filter((e) => assignments.some((a) => a.service_id === serviceId && a.business_member_id === e.business_member_id));
  }

  const employee = employees.find((e) => e.business_member_id === employeeId);

  // Para cada servicio elegido, se busca la disponibilidad de cada empleado
  // que SÍ realiza ese servicio en particular, usando la duración propia de
  // ese servicio (no la suma total) — así se puede encadenar un servicio con
  // un profesional y el siguiente con otro.
  useEffect(() => {
    if (selectedServices.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale slots when inputs are incomplete
      setServiceEmployeeSlots({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const tasks: Promise<readonly [string, string, string[]]>[] = [];
    for (const svc of selectedServices) {
      for (const emp of eligibleEmployeesForService(svc.id)) {
        tasks.push(
          getAvailableSlots(emp.business_member_id, day, svc.duration_minutes).then(
            (slots) => [svc.id, emp.business_member_id, slots] as const
          )
        );
      }
    }
    Promise.all(tasks).then((results) => {
      if (cancelled) return;
      const next: Record<string, Record<string, string[]>> = {};
      for (const [serviceId, empId, slots] of results) {
        if (!next[serviceId]) next[serviceId] = {};
        next[serviceId][empId] = slots;
      }
      setServiceEmployeeSlots(next);
      setLoadingSlots(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedServices/eligibleEmployeesForService derived fresh each render from serviceIds + services + employees + assignments
  }, [serviceIds, day, employees, assignments]);

  // Horas candidatas: para 1 servicio, la unión de horarios libres de sus
  // profesionales elegibles. Para 2+ servicios, una hora solo cuenta si CADA
  // servicio (encadenado uno tras otro desde esa hora) tiene a alguien que
  // lo haga disponible en su propio tramo — sin exigir que sea la misma
  // persona para todos.
  const candidateTimes = useMemo(() => {
    if (selectedServices.length === 0) return [];
    const first = selectedServices[0];
    const basePool = new Set<string>();
    for (const emp of eligibleEmployeesForService(first.id)) {
      for (const t of serviceEmployeeSlots[first.id]?.[emp.business_member_id] ?? []) basePool.add(t);
    }
    if (selectedServices.length === 1) return Array.from(basePool).sort();

    const valid: string[] = [];
    for (const t of basePool) {
      let cursor = t;
      let ok = true;
      for (const svc of selectedServices) {
        const subTime = cursor;
        const anyFree = eligibleEmployeesForService(svc.id).some((emp) =>
          (serviceEmployeeSlots[svc.id]?.[emp.business_member_id] ?? []).includes(subTime)
        );
        if (!anyFree) {
          ok = false;
          break;
        }
        cursor = roundUpToStep(addMinutes(cursor, svc.duration_minutes));
      }
      if (ok) valid.push(t);
    }
    return valid.sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eligibleEmployeesForService/selectedServices derived fresh each render from serviceIds + employees + assignments
  }, [serviceIds, serviceEmployeeSlots, employees, assignments]);

  // A partir de la hora elegida, le asigna a cada servicio un profesional
  // disponible en su tramo — prefiriendo seguir con el mismo de el servicio
  // anterior si puede, para no partir la cita entre más gente de la
  // necesaria. Si la cadena se corta (no debería, candidateTimes ya filtra),
  // queda incompleta y el paso de confirmación lo refleja.
  const autoAssignments = useMemo(() => {
    if (!time || selectedServices.length === 0) return [];
    const result: { service: Service; employee: Employee }[] = [];
    let cursor = time;
    let lastEmployeeId: string | null = null;
    for (const svc of selectedServices) {
      const subTime = cursor;
      const eligible = eligibleEmployeesForService(svc.id);
      const slotsMap = serviceEmployeeSlots[svc.id] ?? {};
      let chosen: Employee | undefined = lastEmployeeId
        ? eligible.find((e) => e.business_member_id === lastEmployeeId && (slotsMap[lastEmployeeId] ?? []).includes(subTime))
        : undefined;
      if (!chosen) chosen = eligible.find((e) => (slotsMap[e.business_member_id] ?? []).includes(subTime));
      if (!chosen) break;
      result.push({ service: svc, employee: chosen });
      lastEmployeeId = chosen.business_member_id;
      cursor = roundUpToStep(addMinutes(cursor, svc.duration_minutes));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eligibleEmployeesForService/selectedServices derived fresh each render from serviceIds + employees + assignments
  }, [time, serviceIds, serviceEmployeeSlots, employees, assignments]);

  const finalAssignments: { service: Service; employee: Employee }[] =
    selectedServices.length === 1 ? (employee ? [{ service: selectedServices[0], employee }] : []) : autoAssignments;

  function isEmployeeAvailable(id: string) {
    const first = selectedServices[0];
    if (!first) return false;
    return (serviceEmployeeSlots[first.id]?.[id] ?? []).includes(time);
  }

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setTime("");
    setEmployeeId("");
  }

  function canAdvance() {
    if (step === 1) return selectedServices.length > 0;
    if (step === 2) return !!time;
    if (step === 3) return finalAssignments.length === selectedServices.length && selectedServices.length > 0;
    return true;
  }

  function goNext() {
    if (!canAdvance()) return;
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function goToLogin() {
    const params = new URLSearchParams({ services: serviceIds.join(","), employee: employeeId, day, time });
    router.push(`/portal/login?redirect=${encodeURIComponent(`/${business.slug}?${params.toString()}`)}`);
  }

  async function handleConfirm() {
    if (finalAssignments.length === 0 || finalAssignments.length !== selectedServices.length || !time) return;

    if (!userEmail) {
      setGuestError(null);
      if (!guestName.trim()) return setGuestError("Escribe tu nombre.");
      if (!guestPhone.trim()) return setGuestError("Escribe tu número de WhatsApp.");
    }

    setConfirming(true);
    let cursor = time;
    for (const a of finalAssignments) {
      const result = await confirmBooking({
        businessId: business.id,
        serviceId: a.service.id,
        businessMemberId: a.employee.business_member_id,
        day,
        time: cursor,
        durationMinutes: a.service.duration_minutes,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
      });
      if (result.error) {
        setConfirming(false);
        showToast(result.error, "danger");
        return;
      }
      cursor = roundUpToStep(addMinutes(cursor, a.service.duration_minutes));
    }
    setConfirming(false);
    setConfirmedSummary({ assignments: finalAssignments, day, time });
    setConfirmed(true);
  }

  if (confirmed && confirmedSummary) {
    const { assignments: bookedAssignments, day: bookedDay, time: bookedTime } = confirmedSummary;
    const bookedEmployeeNames = Array.from(new Set(bookedAssignments.map((a) => a.employee.full_name)));
    return (
      <div className="gradient-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardBody className="space-y-4 py-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl [background:var(--color-success-soft)]">✓</div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Reserva confirmada</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                {bookedAssignments.map((a) => a.service.name).join(", ")} con {bookedEmployeeNames.join(", ")}
                <br />
                {bogotaDateTime(bookedDay, "00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ })} · {formatTime12h(bookedTime)}
              </p>
            </div>
            {userEmail ? (
              <Button onClick={() => router.push("/portal")} className="w-full">
                Ver mis reservas
              </Button>
            ) : (
              <p className="text-xs text-[var(--color-ink-500)]">Te escribiremos por WhatsApp para confirmar los detalles.</p>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="gradient-canvas min-h-screen">
      <header className="relative mx-auto max-w-2xl px-4 pt-8 pb-2 md:px-8">
        {step > 1 && (
          <button
            onClick={goBack}
            aria-label="Atrás"
            className="absolute left-4 top-8 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)]/80 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] md:left-8"
          >
            ←
          </button>
        )}

        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BusinessMark name={business.name} logoUrl={business.logo_url} size={72} />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">{business.name}</h1>
            <p className="truncate text-xs text-[var(--color-ink-500)]">
              {[business.address, business.neighborhood, business.city].filter(Boolean).join(", ") ||
                "Reserva tu cita en línea"}
            </p>
          </div>
        </div>

        <Stepper step={step} />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        {step === 1 && (
          <StepServicios services={services} selectedIds={serviceIds} onToggle={toggleService} showPrices={business.show_prices} />
        )}

        {step === 2 && selectedServices.length > 0 && (
          <StepFechaHora
            day={day}
            time={time}
            candidateTimes={candidateTimes}
            loading={loadingSlots}
            onDay={(d) => {
              setDay(d);
              setTime("");
              setEmployeeId("");
            }}
            onShiftWeek={(dir) => {
              const d = new Date(`${day}T00:00:00`);
              d.setDate(d.getDate() + dir * 7);
              setDay(d.toISOString().slice(0, 10));
              setTime("");
              setEmployeeId("");
            }}
            onSelectTime={(t) => {
              setTime(t);
              setEmployeeId("");
            }}
          />
        )}

        {step === 3 && selectedServices.length === 1 && time && (
          <StepProfesional
            employees={eligibleEmployeesForService(selectedServices[0].id)}
            selectedId={employeeId}
            isAvailable={isEmployeeAvailable}
            onSelect={setEmployeeId}
          />
        )}

        {step === 3 && selectedServices.length > 1 && time && <StepAutoAsignado assignments={autoAssignments} />}

        {step === 4 && finalAssignments.length === selectedServices.length && finalAssignments.length > 0 && time && (
          <StepConfirmar
            assignments={finalAssignments}
            day={day}
            time={time}
            showPrices={business.show_prices}
            authChecked={authChecked}
            loggedIn={!!userEmail}
            confirming={confirming}
            guestName={guestName}
            guestPhone={guestPhone}
            guestError={guestError}
            onGuestNameChange={setGuestName}
            onGuestPhoneChange={setGuestPhone}
            onEdit={(target) => setStep(target)}
            onConfirm={handleConfirm}
            onGoToLogin={goToLogin}
          />
        )}

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={goBack}>
                Atrás
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={goNext} disabled={!canAdvance()}>
              Siguiente
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? "done" : n === step ? "current" : "upcoming";
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-[var(--color-ink-900)] text-white",
                  state === "current" && "bg-[var(--color-ink-900)] text-white",
                  state === "upcoming" && "bg-[var(--color-surface)] text-[var(--color-ink-400)]"
                )}
              >
                {state === "done" ? "✓" : n}
              </div>
              <span
                className={cn(
                  "hidden text-[11px] font-medium sm:block",
                  state === "upcoming" ? "text-[var(--color-ink-400)]" : "text-[var(--color-ink-700)]"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-px flex-1", n < step ? "bg-[var(--color-ink-900)]" : "bg-[var(--color-border-strong)]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepServicios({
  services,
  selectedIds,
  onToggle,
  showPrices,
}: {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  showPrices: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredServices = services.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">Elige uno o más servicios</h2>
        {services.length === 0 ? (
          <EmptyState title="Aún no hay servicios disponibles" description="Vuelve pronto." />
        ) : (
          <div className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servicio…" />
            {filteredServices.length === 0 ? (
              <EmptyState title="Sin resultados" description="Ningún servicio coincide con tu búsqueda." />
            ) : (
              <div className="space-y-2">
                {filteredServices.map((s) => {
                  const selected = selectedIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onToggle(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
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
                        <span>
                          <span className="block text-sm font-medium text-[var(--color-ink-900)]">{s.name}</span>
                          <span className="block text-xs text-[var(--color-ink-500)]">
                            {s.duration_minutes} min{s.category ? ` · ${s.category}` : ""}
                          </span>
                        </span>
                      </span>
                      {showPrices && (
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[var(--color-ink-900)]">
                          Desde {currency.format(s.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StepProfesional({
  employees,
  selectedId,
  isAvailable,
  onSelect,
}: {
  employees: Employee[];
  selectedId: string;
  isAvailable: (id: string) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">¿Quién te atiende?</h2>
        {employees.length === 0 ? (
          <EmptyState title="Sin profesionales disponibles para este servicio" />
        ) : (
          <div className="space-y-2">
            {employees.map((e) => {
              const selected = e.business_member_id === selectedId;
              const available = isAvailable(e.business_member_id);
              return (
                <button
                  key={e.business_member_id}
                  disabled={!available}
                  onClick={() => onSelect(e.business_member_id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
                    selected
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : available
                        ? "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                        : "cursor-not-allowed border-[var(--color-border)] opacity-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={e.full_name} src={e.photo_url} size={44} />
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-ink-900)]">{e.full_name}</span>
                      {e.specialty && <span className="block text-xs text-[var(--color-ink-500)]">{e.specialty}</span>}
                    </span>
                  </span>
                  <Badge tone={available ? "success" : "danger"}>{available ? "Disponible" : "No disponible"}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StepAutoAsignado({ assignments }: { assignments: { service: Service; employee: Employee }[] }) {
  return (
    <Card>
      <CardBody>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink-900)]">¿Quién te atiende?</h2>
        <p className="mb-3 text-xs text-[var(--color-ink-500)]">
          Asignamos automáticamente a quien esté disponible para cada servicio a esa hora.
        </p>
        {assignments.length === 0 ? (
          <EmptyState title="Elige una hora disponible" description="Vuelve al paso anterior para elegir fecha y hora." />
        ) : (
          <div className="space-y-2">
            {assignments.map(({ service, employee }) => (
              <div key={service.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-[var(--color-ink-900)]">{service.name}</span>
                  <span className="block text-xs text-[var(--color-ink-500)]">{service.duration_minutes} min</span>
                </span>
                <span className="flex items-center gap-2">
                  <Avatar name={employee.full_name} src={employee.photo_url} size={32} />
                  <span className="text-sm font-medium text-[var(--color-ink-900)]">{employee.full_name}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StepFechaHora({
  day,
  time,
  candidateTimes,
  loading,
  onDay,
  onShiftWeek,
  onSelectTime,
}: {
  day: string;
  time: string;
  candidateTimes: string[];
  loading: boolean;
  onDay: (d: string) => void;
  onShiftWeek: (dir: -1 | 1) => void;
  onSelectTime: (t: string) => void;
}) {
  return (
    <div className="space-y-6">
      <WeekStrip day={day} onSelect={onDay} onShiftWeek={onShiftWeek} />
      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">Horarios disponibles</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-ink-500)]">Buscando horarios…</p>
          ) : candidateTimes.length === 0 ? (
            <EmptyState title="Sin horarios disponibles este día" description="Elige otro día en el calendario." />
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {candidateTimes.map((t) => (
                <button
                  key={t}
                  onClick={() => onSelectTime(t)}
                  className={cn(
                    "rounded-[var(--radius-md)] py-2 text-sm font-medium whitespace-nowrap transition-all",
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
        </CardBody>
      </Card>
    </div>
  );
}

function StepConfirmar({
  assignments,
  day,
  time,
  showPrices,
  authChecked,
  loggedIn,
  confirming,
  guestName,
  guestPhone,
  guestError,
  onGuestNameChange,
  onGuestPhoneChange,
  onEdit,
  onConfirm,
  onGoToLogin,
}: {
  assignments: { service: Service; employee: Employee }[];
  day: string;
  time: string;
  showPrices: boolean;
  authChecked: boolean;
  loggedIn: boolean;
  confirming: boolean;
  guestName: string;
  guestPhone: string;
  guestError: string | null;
  onGuestNameChange: (v: string) => void;
  onGuestPhoneChange: (v: string) => void;
  onEdit: (step: Step) => void;
  onConfirm: () => void;
  onGoToLogin: () => void;
}) {
  const totalPrice = assignments.reduce((sum, a) => sum + a.service.price, 0);
  const uniqueEmployees = Array.from(new Map(assignments.map((a) => [a.employee.business_member_id, a.employee])).values());
  const singleEmployee = uniqueEmployees.length === 1 ? uniqueEmployees[0] : null;
  const isMulti = assignments.length > 1;

  return (
    <Card>
      <CardBody className="space-y-4">
        {singleEmployee && (
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
            <Avatar name={singleEmployee.full_name} src={singleEmployee.photo_url} size={44} />
            <div>
              <p className="text-sm font-medium text-[var(--color-ink-900)]">{singleEmployee.full_name}</p>
              {singleEmployee.specialty && <p className="text-xs text-[var(--color-ink-500)]">{singleEmployee.specialty}</p>}
            </div>
          </div>
        )}

        <div>
          <button type="button" onClick={() => onEdit(1)} className="block w-full text-left text-sm">
            <span className="block text-[var(--color-ink-500)]">{isMulti ? "Servicios" : "Servicio"}</span>
          </button>
          <ul className="mt-1 space-y-1.5">
            {assignments.map((a) => (
              <li key={a.service.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--color-ink-900)]">{a.service.name}</span>
                <span className="shrink-0 text-xs text-[var(--color-ink-500)]">
                  {!singleEmployee && `${a.employee.full_name}${showPrices ? " · " : ""}`}
                  {showPrices && `Desde ${currency.format(a.service.price)}`}
                </span>
              </li>
            ))}
          </ul>
          {isMulti && showPrices && (
            <p className="mt-1.5 text-right text-sm font-semibold text-[var(--color-ink-900)]">Total: {currency.format(totalPrice)}</p>
          )}
        </div>

        {singleEmployee && <Row label="Profesional" value={singleEmployee.full_name} onEdit={() => onEdit(3)} />}
        <Row
          label="Fecha y hora"
          value={`${bogotaDateTime(day, "00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ })} · ${formatTime12h(time)}`}
          onEdit={() => onEdit(2)}
        />

        {authChecked && !loggedIn && (
          <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <div>
              <Label htmlFor="guestName">Nombre</Label>
              <Input id="guestName" value={guestName} onChange={(e) => onGuestNameChange(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div>
              <Label htmlFor="guestPhone">Número de WhatsApp</Label>
              <Input id="guestPhone" value={guestPhone} onChange={(e) => onGuestPhoneChange(e.target.value)} placeholder="300 123 4567" />
            </div>
            <FieldError>{guestError ?? undefined}</FieldError>
            <button type="button" onClick={onGoToLogin} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
              ¿Ya tienes cuenta? Inicia sesión para ver tu historial
            </button>
          </div>
        )}

        <Button className="w-full" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Confirmando…" : "Confirmar reserva"}
        </Button>
      </CardBody>
    </Card>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <button onClick={onEdit} className="block w-full text-left text-sm">
      <span className="block text-[var(--color-ink-500)]">{label}</span>
      <span className="mt-0.5 block font-medium capitalize text-[var(--color-ink-900)] hover:underline">{value}</span>
    </button>
  );
}
