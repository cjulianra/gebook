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
import { getAvailableSlots, confirmBooking } from "./actions";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface Business {
  id: string;
  name: string;
  slug: string;
  business_type: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
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

  const initialService = searchParams.get("service") ?? "";
  const initialEmployee = searchParams.get("employee") ?? "";
  const initialDay = searchParams.get("day") ?? todayKey();
  const initialTime = searchParams.get("time") ?? "";

  const [serviceId, setServiceId] = useState(initialService);
  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const [step, setStep] = useState<Step>(initialEmployee ? 4 : initialTime ? 3 : initialService ? 2 : 1);
  const [employeeSlots, setEmployeeSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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

  const service = services.find((s) => s.id === serviceId);

  const eligibleEmployees = useMemo(() => {
    if (!serviceId) return [];
    const ids = assignments.filter((a) => a.service_id === serviceId).map((a) => a.business_member_id);
    return employees.filter((e) => ids.includes(e.business_member_id));
  }, [serviceId, employees, assignments]);

  const employee = eligibleEmployees.find((e) => e.business_member_id === employeeId);

  // Igual que en la reserva del negocio: primero se busca la disponibilidad
  // de TODOS los profesionales elegibles para el servicio y día elegidos, así
  // las horas que se muestran siempre tienen a alguien disponible, y luego se
  // puede ver quién específicamente está libre a esa hora.
  useEffect(() => {
    if (!service || eligibleEmployees.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale slots when inputs are incomplete
      setEmployeeSlots({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    Promise.all(
      eligibleEmployees.map(async (e) => {
        const empSlots = await getAvailableSlots(e.business_member_id, day, service.duration_minutes);
        return [e.business_member_id, empSlots] as const;
      })
    ).then((results) => {
      if (cancelled) return;
      setEmployeeSlots(Object.fromEntries(results));
      setLoadingSlots(false);
    });
    return () => {
      cancelled = true;
    };
  }, [service, day, eligibleEmployees]);

  const candidateTimes = useMemo(() => {
    const all = new Set<string>();
    for (const e of eligibleEmployees) {
      for (const t of employeeSlots[e.business_member_id] ?? []) all.add(t);
    }
    return Array.from(all).sort();
  }, [eligibleEmployees, employeeSlots]);

  function isEmployeeAvailable(id: string) {
    return (employeeSlots[id] ?? []).includes(time);
  }

  function selectService(id: string) {
    setServiceId(id);
    setEmployeeId("");
    setTime("");
    setStep(2);
  }

  function selectTime(t: string) {
    setTime(t);
    setEmployeeId("");
    setStep(3);
  }

  function selectEmployee(id: string) {
    setEmployeeId(id);
    setStep(4);
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function goToLogin() {
    const params = new URLSearchParams({ service: serviceId, employee: employeeId, day, time });
    router.push(`/portal/login?redirect=${encodeURIComponent(`/${business.slug}?${params.toString()}`)}`);
  }

  async function handleConfirm() {
    if (!service || !employeeId || !time) return;

    if (!userEmail) {
      setGuestError(null);
      if (!guestName.trim()) return setGuestError("Escribe tu nombre.");
      if (!guestPhone.trim()) return setGuestError("Escribe tu número de WhatsApp.");
    }

    setConfirming(true);
    const result = await confirmBooking({
      businessId: business.id,
      serviceId: service.id,
      businessMemberId: employeeId,
      day,
      time,
      durationMinutes: service.duration_minutes,
      guestName: guestName.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
    });
    setConfirming(false);

    if (result.error) {
      showToast(result.error, "danger");
      return;
    }
    setConfirmed(true);
  }

  if (confirmed && service && employee) {
    return (
      <div className="gradient-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardBody className="space-y-4 py-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl [background:var(--color-success-soft)]">✓</div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Reserva confirmada</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                {service.name} con {employee.full_name}
                <br />
                {bogotaDateTime(day, "00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ })} · {formatTime12h(time)}
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
      <header className="mx-auto max-w-2xl px-4 pt-8 pb-2 md:px-8">
        <div className="mb-5 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={goBack}
              aria-label="Atrás"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)]/80 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)]"
            >
              ←
            </button>
          )}
          <BusinessMark name={business.name} logoUrl={business.logo_url} size={40} />
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">{business.name}</h1>
            <p className="text-xs text-[var(--color-ink-500)]">
              {[business.business_type, business.address].filter(Boolean).join(" · ") || "Reserva tu cita en línea"}
            </p>
          </div>
        </div>

        <Stepper step={step} />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
        {step === 1 && (
          <StepServicio services={services} selectedId={serviceId} onSelect={selectService} />
        )}

        {step === 2 && service && (
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
            onSelectTime={selectTime}
          />
        )}

        {step === 3 && service && time && (
          <StepProfesional employees={eligibleEmployees} selectedId={employeeId} isAvailable={isEmployeeAvailable} onSelect={selectEmployee} />
        )}

        {step === 4 && service && employee && time && (
          <StepConfirmar
            service={service}
            employee={employee}
            day={day}
            time={time}
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

function StepServicio({ services, selectedId, onSelect }: { services: Service[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">Elige un servicio</h2>
        {services.length === 0 ? (
          <EmptyState title="Aún no hay servicios disponibles" description="Vuelve pronto." />
        ) : (
          <div className="space-y-2">
            {services.map((s) => {
              const selected = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
                    selected
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-ink-900)]">{s.name}</span>
                    <span className="block text-xs text-[var(--color-ink-500)]">
                      {s.duration_minutes} min{s.category ? ` · ${s.category}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-ink-900)]">{currency.format(s.price)}</span>
                </button>
              );
            })}
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
  service,
  employee,
  day,
  time,
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
  service: Service;
  employee: Employee;
  day: string;
  time: string;
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
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
          <Avatar name={employee.full_name} src={employee.photo_url} size={44} />
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-900)]">{employee.full_name}</p>
            {employee.specialty && <p className="text-xs text-[var(--color-ink-500)]">{employee.specialty}</p>}
          </div>
        </div>

        <Row label="Servicio" value={`${service.name} · ${currency.format(service.price)}`} onEdit={() => onEdit(1)} />
        <Row label="Profesional" value={employee.full_name} onEdit={() => onEdit(2)} />
        <Row
          label="Fecha y hora"
          value={`${bogotaDateTime(day, "00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: BOGOTA_TZ })} · ${formatTime12h(time)}`}
          onEdit={() => onEdit(3)}
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
    <button onClick={onEdit} className="flex w-full items-center justify-between text-left text-sm">
      <span className="text-[var(--color-ink-500)]">{label}</span>
      <span className="font-medium capitalize text-[var(--color-ink-900)] hover:underline">{value}</span>
    </button>
  );
}
