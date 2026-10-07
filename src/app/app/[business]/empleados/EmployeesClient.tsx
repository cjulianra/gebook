"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/lib/context/BusinessContext";
import { useOnboardingRefresh } from "@/components/onboarding/OnboardingGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { AccountPanel, currency, type Payout } from "@/components/employees/AccountModal";
import { WeekSchedulePanel, type Schedule } from "@/components/employees/WeekSchedulePanel";
import { cn } from "@/lib/utils/cn";
import { createEmployee, getInviteDetails, removeEmployee } from "./actions";

interface Member {
  id: string;
  role: string;
  status: string;
  profiles: { id: string; full_name: string; email: string; avatar_url: string | null } | { id: string; full_name: string; email: string; avatar_url: string | null }[];
  employee_details:
    | { phone: string | null; specialty: string | null; photo_url: string | null; commission_rate: number; can_create_bookings: boolean }
    | { phone: string | null; specialty: string | null; photo_url: string | null; commission_rate: number; can_create_bookings: boolean }[]
    | null;
}

interface Service {
  id: string;
  name: string;
}

interface Assignment {
  business_member_id: string;
  service_id: string;
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.7-.5a6.9 6.9 0 0 0-.6-1.5l1-1.6-1.4-1.4-1.6 1a7 7 0 0 0-1.5-.6L14 4h-2l-.5 1.7a7 7 0 0 0-1.5.6l-1.6-1L7 6.7l1 1.6a6.9 6.9 0 0 0-.6 1.5L4.8 10v2l1.7.5c.1.5.3 1 .6 1.5l-1 1.6 1.4 1.4 1.6-1c.5.3 1 .5 1.5.6L11 19h2l.5-1.7c.5-.1 1-.3 1.5-.6l1.6 1 1.4-1.4-1-1.6c.3-.5.5-1 .6-1.5l1.7-.5v-2Z" />
    </svg>
  );
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export function EmployeesClient({
  businessId,
  initialMembers,
  services,
  initialAssignments,
  initialSchedules,
  initialPayouts,
  earnedCommissions,
}: {
  businessId: string;
  initialMembers: Member[];
  services: Service[];
  initialAssignments: Assignment[];
  initialSchedules: Schedule[];
  initialPayouts: Payout[];
  earnedCommissions: Record<string, number>;
}) {
  const { business, onboardingStep } = useBusiness();
  const refreshOnboarding = useOnboardingRefresh();
  const [members, setMembers] = useState(initialMembers);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [configFor, setConfigFor] = useState<Member | null>(null);
  const showToast = useToast();

  async function handleDeactivate(member: Member) {
    const result = await removeEmployee(businessId, member.id);
    if (result.error) {
      showToast(result.error, "danger");
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: "inactive" } : m)));
    setConfigFor(null);
    showToast("Empleado desactivado.");
  }

  async function handleInvite(member: Member) {
    const result = await getInviteDetails(businessId, member.id);
    if (result.error || !result.data) {
      showToast(result.error ?? "No pudimos preparar la invitación.", "danger");
      return;
    }
    const profile = one(member.profiles)!;
    const phoneDigits = result.data.phone.replace(/\D/g, "");
    const waNumber = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits;
    const loginUrl = `${window.location.origin}/${business.slug}/acceso`;
    const message = `Hola ${profile.full_name} \u{1F44B}, ya puedes entrar a tu panel de ${business.name} en Gebook.\n\nIngresa en: ${loginUrl}\nCon tu celular y este código de acceso: ${result.data.accessCode}`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Empleados"
        description="Las personas que atienden en tu negocio y los servicios que realizan."
        action={<Button onClick={() => setInviteOpen(true)}>{members.length === 0 ? "Crear empleado" : "Agregar otro empleado"}</Button>}
      />

      <Card>
        {members.length === 0 ? (
          <EmptyState
            title="Aún no tienes empleados"
            description="Invita a tu equipo por correo para que puedan ver su agenda."
            action={{ label: "Crear empleado", onClick: () => setInviteOpen(true) }}
          />
        ) : (
          <>
            {/* Desktop: una sola grilla para todas las filas, así cada columna
                queda alineada de verdad entre empleados (no una fila flex por
                separado, que deja cada dato donde le quepa). */}
            <div className="hidden md:block">
              {members.map((member) => {
                const profile = one(member.profiles)!;
                const details = one(member.employee_details);
                const earned = earnedCommissions[member.id] ?? 0;
                const paid = payouts.filter((p) => p.business_member_id === member.id).reduce((sum, p) => sum + p.amount, 0);
                const balance = earned - paid;

                return (
                  <div
                    key={member.id}
                    className="grid grid-cols-[minmax(0,1fr)_150px_160px_auto] items-center gap-3 border-b border-[var(--color-border)] px-5 py-3 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={profile.full_name} src={details?.photo_url} size={36} />
                      <p className="truncate font-medium text-[var(--color-ink-900)]">{profile.full_name}</p>
                    </div>
                    <Badge tone="accent" className="w-fit">
                      Comisión {details?.commission_rate ?? 40}%
                    </Badge>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {member.status === "inactive" && <Badge tone="neutral">Inactivo</Badge>}
                      {balance > 0 && <Badge tone="danger">Debe {currency.format(balance)}</Badge>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 justify-self-end">
                      <Button size="sm" variant="info-soft" onClick={() => handleInvite(member)}>
                        Invitar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setConfigFor(member)}>
                        Configuración
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: tarjeta por empleado con pares etiqueta/valor en su propia
                celda, para que todos los datos queden alineados entre tarjetas. */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {members.map((member) => {
                const profile = one(member.profiles)!;
                const details = one(member.employee_details);
                const earned = earnedCommissions[member.id] ?? 0;
                const paid = payouts.filter((p) => p.business_member_id === member.id).reduce((sum, p) => sum + p.amount, 0);
                const balance = earned - paid;

                return (
                  <div key={member.id} className="space-y-2.5 px-4 py-4">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={profile.full_name} src={details?.photo_url} size={36} />
                        <p className="truncate font-medium text-[var(--color-ink-900)]">{profile.full_name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="xs" variant="info-soft" onClick={() => handleInvite(member)}>
                          Invitar
                        </Button>
                        <button
                          onClick={() => setConfigFor(member)}
                          aria-label="Configuración"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[var(--color-ink-700)] hover:bg-[var(--color-border)]"
                        >
                          <GearIcon className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                      {member.status === "inactive" && (
                        <Badge tone="neutral" className="shrink-0">
                          Inactivo
                        </Badge>
                      )}
                      <Badge tone="accent" className="shrink-0">
                        Comisión {details?.commission_rate ?? 40}%
                      </Badge>
                      <Badge tone={balance > 0 ? "danger" : "success"} className="shrink-0">
                        {balance > 0 ? `Debe ${currency.format(balance)}` : "Al día"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {onboardingStep === "empleados" && members.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-accent-soft)] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">¡Todo listo! 🎉</p>
            <p className="text-sm text-[var(--color-ink-700)]">Puedes seguir agregando empleados o ir directo a tu Agenda.</p>
          </div>
          <Link href={`/app/${business.slug}/reservas`} prefetch={false}>
            <Button>Ir a mi Agenda →</Button>
          </Link>
        </Card>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        businessId={businessId}
        services={services}
        onInvited={(member, serviceIds) => {
          setMembers((prev) => [member, ...prev]);
          setAssignments((prev) => [...prev, ...serviceIds.map((service_id) => ({ business_member_id: member.id, service_id }))]);
          refreshOnboarding?.();
        }}
      />

      {configFor && (
        <EmployeeConfigModal
          member={configFor}
          businessId={businessId}
          services={services}
          assignedServiceIds={assignments.filter((a) => a.business_member_id === configFor.id).map((a) => a.service_id)}
          schedules={schedules.filter((s) => s.business_member_id === configFor.id)}
          payouts={payouts.filter((p) => p.business_member_id === configFor.id)}
          earned={earnedCommissions[configFor.id] ?? 0}
          onClose={() => setConfigFor(null)}
          onServicesSaved={(serviceIds) => {
            setAssignments((prev) => [
              ...prev.filter((a) => a.business_member_id !== configFor.id),
              ...serviceIds.map((service_id) => ({ business_member_id: configFor.id, service_id })),
            ]);
            showToast("Servicios actualizados.");
          }}
          onScheduleSaved={(saved) => {
            setSchedules((prev) => [...prev.filter((s) => s.business_member_id !== configFor.id), ...saved]);
            showToast("Horario actualizado.");
          }}
          onCommissionSaved={(rate) => {
            setMembers((prev) =>
              prev.map((m) => {
                if (m.id !== configFor.id) return m;
                const details = one(m.employee_details);
                return {
                  ...m,
                  employee_details: { ...(details ?? { phone: null, specialty: null, photo_url: null, can_create_bookings: true }), commission_rate: rate },
                };
              })
            );
            showToast("Comisión actualizada.");
          }}
          onPayoutRegistered={(payout) => {
            setPayouts((prev) => [payout, ...prev]);
            showToast("Pago registrado.");
          }}
          onPermissionSaved={(canCreateBookings: boolean) => {
            setMembers((prev) =>
              prev.map((m) => {
                if (m.id !== configFor.id) return m;
                const details = one(m.employee_details);
                return {
                  ...m,
                  employee_details: { ...(details ?? { phone: null, specialty: null, photo_url: null, commission_rate: 40 }), can_create_bookings: canCreateBookings },
                };
              })
            );
            showToast("Permisos actualizados.");
          }}
          onPhotoSaved={(photoUrl) => {
            setMembers((prev) =>
              prev.map((m) => {
                if (m.id !== configFor.id) return m;
                const details = one(m.employee_details);
                return {
                  ...m,
                  employee_details: { ...(details ?? { phone: null, specialty: null, commission_rate: 40, can_create_bookings: true }), photo_url: photoUrl },
                };
              })
            );
            showToast("Foto actualizada.");
          }}
          onDeactivate={() => handleDeactivate(configFor)}
        />
      )}
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  businessId,
  services,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  services: Service[];
  onInvited: (member: Member, serviceIds: string[]) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [canCreateBookings, setCanCreateBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function resetForm() {
    setFullName("");
    setPhone("");
    setSelectedServiceIds([]);
    setCanCreateBookings(true);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createEmployee({ businessId, fullName, phone, canCreateBookings, serviceIds: selectedServiceIds });
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "No pudimos crear al empleado.");
      return;
    }

    onInvited(
      {
        id: result.data.id,
        role: "employee",
        status: "active",
        profiles: { id: result.data.user_id, full_name: fullName, email: "", avatar_url: null },
        employee_details: { phone, specialty: null, photo_url: null, commission_rate: 40, can_create_bookings: canCreateBookings },
      },
      selectedServiceIds
    );

    resetForm();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Crear empleado"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando…" : "Crear empleado"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Laura Gómez" />
        </div>
        <div>
          <Label htmlFor="phone">Celular</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
        </div>
        <div>
          <Label>Servicios que puede realizar</Label>
          {services.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-500)]">Aún no tienes servicios creados. Crea servicios primero para poder asignarlos.</p>
          ) : (
            <div className="space-y-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--color-canvas)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-ink-900)]">{service.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5">
          <input
            type="checkbox"
            checked={canCreateBookings}
            onChange={(e) => setCanCreateBookings(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--color-ink-900)]">Puede crear reservas</span>
            <span className="block text-xs text-[var(--color-ink-500)]">
              Si lo desactivas, solo el dueño o un administrador podrán agendarle citas a este empleado.
            </span>
          </span>
        </label>
        <FieldError>{error ?? undefined}</FieldError>
        <p className="text-xs text-[var(--color-ink-500)]">
          Se crea la cuenta al instante. Después usa el botón de WhatsApp junto a su nombre para enviarle su código de acceso.
        </p>
      </form>
    </Modal>
  );
}

const TABS = [
  { key: "foto", label: "Foto" },
  { key: "servicios", label: "Servicios" },
  { key: "horario", label: "Horario" },
  { key: "comision", label: "Comisión" },
  { key: "permisos", label: "Permisos" },
  { key: "cuenta", label: "Liquidar" },
  { key: "desactivar", label: "Desactivar" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function EmployeeConfigModal({
  member,
  businessId,
  services,
  assignedServiceIds,
  schedules,
  payouts,
  earned,
  onClose,
  onServicesSaved,
  onScheduleSaved,
  onCommissionSaved,
  onPayoutRegistered,
  onPhotoSaved,
  onPermissionSaved,
  onDeactivate,
}: {
  member: Member;
  businessId: string;
  services: Service[];
  assignedServiceIds: string[];
  schedules: Schedule[];
  payouts: Payout[];
  earned: number;
  onClose: () => void;
  onServicesSaved: (serviceIds: string[]) => void;
  onScheduleSaved: (schedules: Schedule[]) => void;
  onCommissionSaved: (rate: number) => void;
  onPayoutRegistered: (payout: Payout) => void;
  onPhotoSaved: (photoUrl: string) => void;
  onPermissionSaved: (canCreateBookings: boolean) => void;
  onDeactivate: () => void;
}) {
  const profile = one(member.profiles)!;
  const [tab, setTab] = useState<TabKey>("foto");

  return (
    <Modal open onClose={onClose} title={`Configuración de ${profile.full_name}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-transparent bg-[var(--color-ink-900)] text-white"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "foto" && <PhotoPanel member={member} businessId={businessId} onSaved={onPhotoSaved} />}
        {tab === "servicios" && (
          <ServicesPanel member={member} services={services} assignedServiceIds={assignedServiceIds} onSaved={onServicesSaved} />
        )}
        {tab === "horario" && <WeekSchedulePanel memberId={member.id} schedules={schedules} onSaved={onScheduleSaved} />}
        {tab === "comision" && <CommissionPanel member={member} onSaved={onCommissionSaved} />}
        {tab === "permisos" && <PermissionsPanel member={member} onSaved={onPermissionSaved} />}
        {tab === "cuenta" && (
          <AccountPanel memberId={member.id} payouts={payouts} earned={earned} businessId={businessId} onRegistered={onPayoutRegistered} />
        )}
        {tab === "desactivar" && <DeactivatePanel member={member} onConfirm={onDeactivate} />}
      </div>
    </Modal>
  );
}

function ServicesPanel({
  member,
  services,
  assignedServiceIds,
  onSaved,
}: {
  member: Member;
  services: Service[];
  assignedServiceIds: string[];
  onSaved: (serviceIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(assignedServiceIds);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("employee_services").delete().eq("business_member_id", member.id);
    if (selected.length > 0) {
      await supabase.from("employee_services").insert(selected.map((service_id) => ({ business_member_id: member.id, service_id })));
    }
    setLoading(false);
    onSaved(selected);
  }

  return (
    <div className="space-y-4">
      {services.length === 0 ? (
        <EmptyState title="No hay servicios activos" description="Crea servicios primero para poder asignarlos." />
      ) : (
        <div className="space-y-1">
          {services.map((service) => (
            <label
              key={service.id}
              className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-[var(--color-canvas)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(service.id)}
                onChange={() => toggle(service.id)}
                className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-ink-900)]">{service.name}</span>
            </label>
          ))}
        </div>
      )}
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar servicios"}
      </Button>
    </div>
  );
}

function CommissionPanel({ member, onSaved }: { member: Member; onSaved: (rate: number) => void }) {
  const current = one(member.employee_details)?.commission_rate ?? 40;
  const [rate, setRate] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const value = Number(rate);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setError("Ingresa un porcentaje entre 0 y 100.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("employee_details")
      .upsert({ business_member_id: member.id, commission_rate: value });
    setLoading(false);
    if (updateError) {
      setError("No pudimos guardar la comisión.");
      return;
    }
    onSaved(value);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="rate">Porcentaje sobre cada servicio completado</Label>
        <div className="flex items-center gap-2">
          <Input id="rate" type="number" min={0} max={100} value={rate} onChange={(e) => setRate(e.target.value)} className="w-24" />
          <span className="text-sm text-[var(--color-ink-500)]">%</span>
        </div>
        <FieldError>{error ?? undefined}</FieldError>
        <p className="mt-2 text-xs text-[var(--color-ink-500)]">
          Se aplica a todos los servicios que {one(member.profiles)?.full_name.split(" ")[0]} complete. Podrás ver el detalle en Reportes.
        </p>
      </div>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar comisión"}
      </Button>
    </div>
  );
}

function PermissionsPanel({ member, onSaved }: { member: Member; onSaved: (canCreateBookings: boolean) => void }) {
  const current = one(member.employee_details)?.can_create_bookings ?? true;
  const [canCreateBookings, setCanCreateBookings] = useState(current);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("employee_details").upsert({ business_member_id: member.id, can_create_bookings: canCreateBookings });
    setLoading(false);
    onSaved(canCreateBookings);
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5">
        <input
          type="checkbox"
          checked={canCreateBookings}
          onChange={(e) => setCanCreateBookings(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
        />
        <span>
          <span className="block text-sm font-medium text-[var(--color-ink-900)]">Puede crear reservas</span>
          <span className="block text-xs text-[var(--color-ink-500)]">
            Si lo desactivas, solo el dueño o un administrador podrán agendarle citas a {one(member.profiles)?.full_name.split(" ")[0]}.
          </span>
        </span>
      </label>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar permisos"}
      </Button>
    </div>
  );
}

function DeactivatePanel({ member, onConfirm }: { member: Member; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const profile = one(member.profiles)!;

  if (member.status === "inactive") {
    return <p className="text-sm text-[var(--color-ink-500)]">Este empleado ya está desactivado.</p>;
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4">
      <p className="text-sm text-[var(--color-danger)]">
        {profile.full_name} perderá acceso al negocio. Su historial de reservas y pagos se conserva.
      </p>
      {confirming ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            Sí, desactivar
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          Desactivar empleado
        </Button>
      )}
    </div>
  );
}

function PhotoPanel({ member, businessId, onSaved }: { member: Member; businessId: string; onSaved: (photoUrl: string) => void }) {
  const profile = one(member.profiles)!;
  const details = one(member.employee_details);
  const [photo, setPhoto] = useState(details?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${businessId}/${member.id}/photo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      return;
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("employee_details").upsert({ business_member_id: member.id, photo_url: publicUrl.publicUrl });

    setUploading(false);
    setPhoto(publicUrl.publicUrl);
    onSaved(publicUrl.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={profile.full_name} src={photo} size={64} />
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Subiendo…" : photo ? "Cambiar foto" : "Subir foto"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">Se usará en la agenda, reportes y la página pública de reserva.</p>
      </div>
    </div>
  );
}
