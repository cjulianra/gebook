"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BusinessMark } from "@/components/layout/AppShell";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { EmptyState } from "@/components/ui/States";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { formatTime12h } from "@/lib/utils/dateRange";
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

const STEPS = ["Servicio", "Profesional", "Fecha y hora", "Confirmar"] as const;
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
  return new Date().toISOString().slice(0, 10);
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
  const [step, setStep] = useState<Step>(initialTime ? 4 : initialEmployee ? 3 : initialService ? 2 : 1);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

  useEffect(() => {
    if (!service || !employeeId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-dependency-change is the intended pattern here
    setLoadingSlots(true);
    getAvailableSlots(employeeId, day, service.duration_minutes)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [service, employeeId, day]);

  function selectService(id: string) {
    setServiceId(id);
    setEmployeeId("");
    setTime("");
    setSlots([]);
    setStep(2);
  }

  function selectEmployee(id: string) {
    setEmployeeId(id);
    setTime("");
    setSlots([]);
    setStep(3);
  }

  function selectTime(t: string) {
    setTime(t);
    setStep(4);
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function goToLogin() {
    const params = new URLSearchParams({ service: serviceId, employee: employeeId, day, time });
    router.push(`/portal/login?redirect=${encodeURIComponent(`/b/${business.slug}?${params.toString()}`)}`);
  }

  async function handleConfirm() {
    if (!service || !employeeId || !time) return;
    setConfirming(true);
    const result = await confirmBooking({
      businessId: business.id,
      serviceId: service.id,
      businessMemberId: employeeId,
      day,
      time,
      durationMinutes: service.duration_minutes,
    });
    setConfirming(false);

    if (result.error === "login_required") {
      goToLogin();
      return;
    }
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
                {new Date(`${day}T${time}:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })} · {formatTime12h(time)}
              </p>
            </div>
            <Button onClick={() => router.push("/portal")} className="w-full">
              Ver mis reservas
            </Button>
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
          <StepProfesional employees={eligibleEmployees} selectedId={employeeId} onSelect={selectEmployee} />
        )}

        {step === 3 && service && employeeId && (
          <StepFechaHora
            day={day}
            time={time}
            slots={slots}
            loading={loadingSlots}
            onDay={(d) => { setDay(d); setTime(""); setSlots([]); }}
            onShiftWeek={(dir) => {
              const d = new Date(`${day}T00:00:00`);
              d.setDate(d.getDate() + dir * 7);
              setDay(d.toISOString().slice(0, 10));
              setTime("");
              setSlots([]);
            }}
            onSelectTime={selectTime}
          />
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
            onEdit={(target) => setStep(target)}
            onConfirm={handleConfirm}
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

function StepProfesional({ employees, selectedId, onSelect }: { employees: Employee[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">Elige profesional</h2>
        {employees.length === 0 ? (
          <EmptyState title="Sin profesionales disponibles para este servicio" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {employees.map((e) => {
              const selected = e.business_member_id === selectedId;
              return (
                <button
                  key={e.business_member_id}
                  onClick={() => onSelect(e.business_member_id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border px-3 py-4 text-center transition-all",
                    selected
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                  )}
                >
                  <Avatar name={e.full_name} src={e.photo_url} size={56} />
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-ink-900)]">{e.full_name}</span>
                    {e.specialty && <span className="block text-xs text-[var(--color-ink-500)]">{e.specialty}</span>}
                  </span>
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
  slots,
  loading,
  onDay,
  onShiftWeek,
  onSelectTime,
}: {
  day: string;
  time: string;
  slots: string[];
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
          ) : slots.length === 0 ? (
            <EmptyState title="Sin horarios disponibles este día" description="Elige otro día en el calendario." />
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((t) => (
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
  onEdit,
  onConfirm,
}: {
  service: Service;
  employee: Employee;
  day: string;
  time: string;
  authChecked: boolean;
  loggedIn: boolean;
  confirming: boolean;
  onEdit: (step: Step) => void;
  onConfirm: () => void;
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
          value={`${new Date(`${day}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })} · ${formatTime12h(time)}`}
          onEdit={() => onEdit(3)}
        />

        {authChecked && !loggedIn && <Badge tone="info">Necesitas una cuenta para confirmar</Badge>}

        <Button className="w-full" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Confirmando…" : loggedIn ? "Confirmar reserva" : "Iniciar sesión y confirmar"}
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
