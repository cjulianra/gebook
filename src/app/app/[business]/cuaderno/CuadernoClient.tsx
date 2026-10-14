"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, FieldError, SearchInput, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { WeekStrip } from "@/components/ui/WeekStrip";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";
import { cn } from "@/lib/utils/cn";
import { createNotebookEntry, deleteNotebookEntry, editAgendaEntry, editNotebookEntry, reviewNotebookEntry } from "./actions";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

type EntryStatus = "pending" | "approved" | "rejected";

export interface Entry {
  id: string;
  business_member_id: string;
  service_id: string | null;
  service_name: string;
  client_name: string | null;
  amount: number;
  note: string | null;
  performed_at: string;
  status: EntryStatus;
  created_at: string;
  /** "agenda" = generada automáticamente de una reserva completada (de solo lectura); "manual" (default) = anotada por el empleado. */
  source?: "manual" | "agenda";
  business_members?:
    | {
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null;
      }
    | {
        profiles: { full_name: string } | { full_name: string }[] | null;
        employee_details: { photo_url: string | null } | { photo_url: string | null }[] | null;
      }[]
    | null;
}

function todayBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BOGOTA_TZ });
}

// Si no está aprobada ni rechazada, está pendiente por definición — no hace
// falta una pastilla "Pendiente" aparte, basta con no mostrar ninguna.
function statusLabel(status: EntryStatus) {
  if (status === "approved") return { label: "Aprobada", tone: "success" as const };
  if (status === "rejected") return { label: "Rechazada", tone: "danger" as const };
  return null;
}

function employeeOf(entry: Entry) {
  const member = one(entry.business_members);
  const profile = member ? one(member.profiles) : undefined;
  const details = member ? one(member.employee_details) : undefined;
  return { name: profile?.full_name, photoUrl: details?.photo_url ?? null };
}

interface EmployeeOption {
  id: string;
  name: string | undefined;
}

export function CuadernoClient({
  businessId,
  isAdmin,
  services,
  employees,
  initialEntries,
}: {
  businessId: string;
  memberId: string;
  isAdmin: boolean;
  services: Service[];
  employees: EmployeeOption[];
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Entry | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const showToast = useToast();

  async function handleReview(entry: Entry, approve: boolean) {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: approve ? "approved" : "rejected" } : e)));
    const result = await reviewNotebookEntry(businessId, entry.id, approve);
    if (result.error) {
      showToast(result.error, "danger");
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: entry.status } : e)));
      return;
    }
    showToast(approve ? "Anotación aprobada." : "Anotación rechazada.");
  }

  async function handleDelete(entry: Entry) {
    const result = await deleteNotebookEntry(businessId, entry.id);
    if (result.error) {
      showToast(result.error, "danger");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast("Anotación borrada.");
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (isAdmin && employeeFilter && e.business_member_id !== employeeFilter) return false;
      if (dayFilter && e.performed_at !== dayFilter) return false;
      return true;
    });
  }, [entries, isAdmin, employeeFilter, dayFilter]);

  const dayGroups = useMemo(() => {
    const byDay = new Map<string, Entry[]>();
    for (const entry of filteredEntries) {
      const list = byDay.get(entry.performed_at) ?? [];
      list.push(entry);
      byDay.set(entry.performed_at, list);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayEntries]) => ({
        date,
        entries: [...dayEntries].sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1)),
        total: dayEntries.reduce((sum, e) => sum + e.amount, 0),
      }));
  }, [filteredEntries]);
  const hasFilters = isAdmin ? !!(employeeFilter || dayFilter) : !!dayFilter;
  const hasDayFilter = !!dayFilter;
  const weekAnchor = dayFilter ?? todayBogota();

  function shiftWeek(direction: -1 | 1) {
    const d = new Date(`${weekAnchor}T00:00:00`);
    d.setDate(d.getDate() + direction * 7);
    setDayFilter(d.toISOString().slice(0, 10));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Cuaderno"
        description={
          isAdmin
            ? "Revisa y aprueba las anotaciones de servicios que los empleados registraron por fuera de la agenda."
            : "Anota aquí los servicios que prestaste y no pasaron por la agenda. Quedan pendientes hasta que el dueño los apruebe."
        }
        action={!isAdmin && <Button onClick={() => setOpen(true)}>Nueva anotación</Button>}
      />

      <div className="space-y-3">
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1">
              <Label>Empleado</Label>
              <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
                <option value="">Todos los empleados</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name ?? "Sin nombre"}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <WeekStrip day={weekAnchor} onSelect={setDayFilter} onShiftWeek={shiftWeek} highlightSelected={hasDayFilter} />

        {hasDayFilter && (
          <Button size="sm" variant="neutral-soft" onClick={() => setDayFilter(null)}>
            Ver todos los días
          </Button>
        )}
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          title="Sin anotaciones"
          description={
            hasFilters
              ? "Ninguna anotación coincide con el filtro."
              : isAdmin
                ? "Cuando un empleado anote un servicio, aparecerá aquí para tu revisión."
                : "Registra un servicio que no quedó en la agenda."
          }
        />
      ) : (
        <div className="space-y-5">
          {dayGroups.map((group) => (
            <Card key={group.date} className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--color-border)]">
                {group.entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} isAdmin={isAdmin} onReview={handleReview} onDelete={handleDelete} onEdit={setToEdit} />
                ))}
              </div>
              <div className="flex items-center justify-between bg-[var(--color-canvas)] px-5 py-3">
                <span className="text-sm font-medium text-[var(--color-ink-700)]">
                  Total del {new Date(`${group.date}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: BOGOTA_TZ })}
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink-900)]">{currency.format(group.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewEntryModal
        open={open}
        onClose={() => setOpen(false)}
        businessId={businessId}
        services={services}
        onCreated={(newEntries) => {
          setEntries((prev) => [...newEntries, ...prev]);
          setOpen(false);
          showToast(newEntries.length === 1 ? "Anotación guardada, queda pendiente de revisión." : `${newEntries.length} anotaciones guardadas, quedan pendientes de revisión.`);
        }}
      />

      <EditEntryModal
        entry={toEdit}
        onClose={() => setToEdit(null)}
        businessId={businessId}
        onSaved={(updated) => {
          setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
          setToEdit(null);
          showToast("Anotación actualizada.");
        }}
      />
    </div>
  );
}

function EntryRow({
  entry,
  isAdmin,
  onReview,
  onDelete,
  onEdit,
}: {
  entry: Entry;
  isAdmin: boolean;
  onReview: (entry: Entry, approve: boolean) => void;
  onDelete: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
}) {
  const status = statusLabel(entry.status);
  const fromAgenda = entry.source === "agenda";
  const employee = isAdmin ? employeeOf(entry) : undefined;
  const dateLabel = new Date(`${entry.performed_at}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: BOGOTA_TZ });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 font-medium text-[var(--color-ink-900)]">
          <span className="truncate">{entry.service_name}</span>
          {employee?.name && (
            <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[var(--color-success)]">
              <span className="text-[var(--color-ink-300)]">·</span>
              <Avatar name={employee.name} src={employee.photoUrl} size={18} />
              {employee.name}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-ink-500)]">
          {dateLabel} · {currency.format(entry.amount)}
          {entry.client_name && <> · {entry.client_name}</>}
          {entry.note && <> · {entry.note}</>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {fromAgenda && (
          <span title="Viene de una reserva de la Agenda" className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-ink-500)]">
            <AgendaIcon className="h-4 w-4" />
          </span>
        )}
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
        {isAdmin && (
          <Button size="xs" variant="neutral-soft" onClick={() => onEdit(entry)}>
            Editar
          </Button>
        )}
        {!fromAgenda && isAdmin && entry.status === "pending" && (
          <>
            <Button size="xs" variant="neutral-soft" onClick={() => onReview(entry, true)}>
              Aprobar
            </Button>
            <Button size="xs" variant="danger-soft" onClick={() => onReview(entry, false)}>
              Rechazar
            </Button>
          </>
        )}
        {!fromAgenda && isAdmin && entry.status === "approved" && (
          <Button size="xs" variant="danger-soft" onClick={() => onReview(entry, false)}>
            Cancelar
          </Button>
        )}
        {!fromAgenda && !isAdmin && entry.status === "pending" && (
          <Button size="xs" variant="danger-soft" onClick={() => onDelete(entry)}>
            Borrar
          </Button>
        )}
      </div>
    </div>
  );
}

function AgendaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3v2M17 3v2M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

interface DraftLine {
  serviceId: string | null;
  name: string;
  amount: string;
}

function NewEntryModal({
  open,
  onClose,
  businessId,
  services,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  services: Service[];
  onCreated: (entries: Entry[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState(todayBogota());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedIds = new Set(lines.map((l) => l.serviceId).filter(Boolean));

  function reset() {
    setQuery("");
    setLines([]);
    setClientName("");
    setNote("");
    setPerformedAt(todayBogota());
    setError(null);
  }

  function toggleService(s: Service) {
    setLines((prev) =>
      prev.some((l) => l.serviceId === s.id)
        ? prev.filter((l) => l.serviceId !== s.id)
        : [...prev, { serviceId: s.id, name: s.name, amount: String(s.price) }]
    );
  }

  function addCustom() {
    setLines((prev) => [...prev, { serviceId: null, name: query.trim(), amount: "" }]);
    setQuery("");
  }

  function updateAmount(index: number, amount: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, amount } : l)));
  }

  function updateName(index: number, name: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    if (lines.length === 0) return setError("Elige al menos un servicio.");
    const parsedLines: { serviceId: string | null; serviceName: string; amount: number }[] = [];
    for (const line of lines) {
      if (!line.name.trim()) return setError("Indica el nombre del servicio.");
      const parsedAmount = Number(line.amount);
      if (!line.amount || Number.isNaN(parsedAmount) || parsedAmount < 0) return setError(`Indica un monto válido para "${line.name}".`);
      parsedLines.push({ serviceId: line.serviceId, serviceName: line.name, amount: parsedAmount });
    }

    setLoading(true);
    const result = await createNotebookEntry(
      businessId,
      parsedLines.map((l) => ({ serviceId: l.serviceId, serviceName: l.serviceName, clientName, amount: l.amount, note, performedAt }))
    );
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCreated(
      parsedLines.map((l) => ({
        id: crypto.randomUUID(),
        business_member_id: "",
        service_id: l.serviceId,
        service_name: l.serviceName,
        client_name: clientName || null,
        amount: l.amount,
        note: note || null,
        performed_at: performedAt,
        status: "pending",
        created_at: new Date().toISOString(),
      }))
    );
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Nueva anotación"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Servicios (puedes elegir varios)</Label>
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servicio…" className="mb-2" />
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
            {filteredServices.length === 0 && (
              <p className="px-2 py-3 text-sm text-[var(--color-ink-500)]">Ningún servicio coincide con tu búsqueda.</p>
            )}
            {filteredServices.map((s) => {
              const selected = selectedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm",
                    selected
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                  )}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs opacity-80">{currency.format(s.price)}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={addCustom}
              className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-3 py-2 text-left text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-xs">+</span>
              <span className="font-medium">Otro</span>
            </button>
          </div>
        </div>

        {lines.length > 0 && (
          <div>
            <Label>Monto por servicio</Label>
            <div className="space-y-2">
              {lines.map((line, i) =>
                line.serviceId === null ? (
                  <div key={`custom-${i}`} className="flex items-center gap-2">
                    <Input
                      value={line.name}
                      onChange={(e) => updateName(i, e.target.value)}
                      placeholder="Nombre del servicio"
                      className="min-w-0 flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      placeholder="0"
                      style={{ width: "7rem", flex: "none" }}
                    />
                    <button type="button" onClick={() => removeLine(i)} aria-label="Quitar" className="text-[var(--color-ink-500)] hover:text-[var(--color-danger)]">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div key={line.serviceId} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink-900)]">{line.name}</span>
                    <Input
                      type="number"
                      min="0"
                      value={line.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      placeholder="0"
                      style={{ width: "7rem", flex: "none" }}
                    />
                    <button type="button" onClick={() => removeLine(i)} aria-label="Quitar" className="text-[var(--color-ink-500)] hover:text-[var(--color-danger)]">
                      ✕
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div>
          <Label>Cliente (opcional)</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
        </div>

        <div>
          <Label>Fecha</Label>
          <Input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
        </div>

        <div>
          <Label>Nota (opcional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: no alcancé a registrarla en la agenda" />
        </div>

        <FieldError>{error ?? undefined}</FieldError>
      </div>
    </Modal>
  );
}

function EditEntryModal({
  entry,
  onClose,
  businessId,
  onSaved,
}: {
  entry: Entry | null;
  onClose: () => void;
  businessId: string;
  onSaved: (entry: Entry) => void;
}) {
  const [serviceName, setServiceName] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [status, setStatus] = useState<EntryStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastId, setLastId] = useState<string | null>(null);
  if (entry && entry.id !== lastId) {
    setLastId(entry.id);
    setServiceName(entry.service_name);
    setClientName(entry.client_name ?? "");
    setAmount(String(entry.amount));
    setNote(entry.note ?? "");
    setPerformedAt(entry.performed_at);
    setStatus(entry.status);
    setError(null);
  }

  if (!entry) return null;
  const fromAgenda = entry.source === "agenda";

  async function handleSubmit() {
    if (!entry) return;
    setError(null);
    if (!serviceName.trim()) return setError("Indica el servicio.");
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) return setError("Indica un monto válido.");

    setLoading(true);
    const result = fromAgenda
      ? await editAgendaEntry(businessId, entry.id.replace(/^booking-/, ""), entry.business_member_id, {
          serviceName: serviceName.trim(),
          clientName,
          amount: parsedAmount,
          note,
          performedAt,
        })
      : await editNotebookEntry(businessId, entry.id, {
          serviceName: serviceName.trim(),
          clientName,
          amount: parsedAmount,
          note,
          performedAt,
          status,
        });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved({
      ...entry,
      service_name: serviceName.trim(),
      client_name: clientName || null,
      amount: parsedAmount,
      note: note || null,
      performed_at: performedAt,
      status: fromAgenda ? entry.status : status,
    });
  }

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title="Editar anotación"
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
      <div className="space-y-4">
        <div>
          <Label>Servicio</Label>
          <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
        </div>
        <div>
          <Label>Cliente (opcional)</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
          </div>
          <div>
            <Label>Monto</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Nota (opcional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {!fromAgenda && (
          <div>
            <Label>Estado</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as EntryStatus)}>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
            </Select>
          </div>
        )}
        <FieldError>{error ?? undefined}</FieldError>
      </div>
    </Modal>
  );
}
