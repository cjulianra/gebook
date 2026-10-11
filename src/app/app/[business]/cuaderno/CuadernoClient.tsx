"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, FieldError, SearchInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";
import { cn } from "@/lib/utils/cn";
import { createNotebookEntry, deleteNotebookEntry, reviewNotebookEntry } from "./actions";

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
  business_members?: { profiles: { full_name: string } | { full_name: string }[] | null } | { profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
}

function todayBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BOGOTA_TZ });
}

function statusLabel(status: EntryStatus) {
  if (status === "approved") return { label: "Aprobada", tone: "success" as const };
  if (status === "rejected") return { label: "Rechazada", tone: "danger" as const };
  return { label: "Pendiente", tone: "warning" as const };
}

export function CuadernoClient({
  businessId,
  isAdmin,
  services,
  initialEntries,
}: {
  businessId: string;
  memberId: string;
  isAdmin: boolean;
  services: Service[];
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);
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

  const pending = entries.filter((e) => e.status === "pending");
  const reviewed = entries.filter((e) => e.status !== "pending");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cuaderno"
        description={
          isAdmin
            ? "Revisa y aprueba las anotaciones de servicios que los empleados registraron por fuera de la agenda."
            : "Anota aquí los servicios que prestaste y no pasaron por la agenda. Quedan pendientes hasta que el dueño los apruebe."
        }
        action={!isAdmin && <Button onClick={() => setOpen(true)}>Nueva anotación</Button>}
      />

      {entries.length === 0 ? (
        <EmptyState
          title="Sin anotaciones"
          description={isAdmin ? "Cuando un empleado anote un servicio, aparecerá aquí para tu revisión." : "Registra un servicio que no quedó en la agenda."}
        />
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <Card className="divide-y divide-[var(--color-border)] p-0">
              {pending.map((entry) => (
                <EntryRow key={entry.id} entry={entry} isAdmin={isAdmin} onReview={handleReview} onDelete={handleDelete} />
              ))}
            </Card>
          )}
          {reviewed.length > 0 && (
            <Card className="divide-y divide-[var(--color-border)] p-0">
              {reviewed.map((entry) => (
                <EntryRow key={entry.id} entry={entry} isAdmin={isAdmin} onReview={handleReview} onDelete={handleDelete} />
              ))}
            </Card>
          )}
        </div>
      )}

      <NewEntryModal
        open={open}
        onClose={() => setOpen(false)}
        businessId={businessId}
        services={services}
        onCreated={(entry) => {
          setEntries((prev) => [entry, ...prev]);
          setOpen(false);
          showToast("Anotación guardada, queda pendiente de revisión.");
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
}: {
  entry: Entry;
  isAdmin: boolean;
  onReview: (entry: Entry, approve: boolean) => void;
  onDelete: (entry: Entry) => void;
}) {
  const status = statusLabel(entry.status);
  const employeeName = isAdmin ? one(entry.business_members)?.profiles ? one(one(entry.business_members)?.profiles) : undefined : undefined;
  const dateLabel = new Date(`${entry.performed_at}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: BOGOTA_TZ });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="font-medium text-[var(--color-ink-900)]">
          {entry.service_name}
          {entry.client_name && <span className="text-[var(--color-ink-500)]"> · {entry.client_name}</span>}
        </p>
        <p className="text-sm text-[var(--color-ink-500)]">
          {dateLabel} · {currency.format(entry.amount)}
          {employeeName && <> · {(employeeName as { full_name: string }).full_name}</>}
          {entry.note && <> · {entry.note}</>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {isAdmin && entry.status === "pending" && (
          <>
            <Button size="xs" variant="neutral-soft" onClick={() => onReview(entry, true)}>
              Aprobar
            </Button>
            <Button size="xs" variant="danger-soft" onClick={() => onReview(entry, false)}>
              Rechazar
            </Button>
          </>
        )}
        {!isAdmin && entry.status === "pending" && (
          <Button size="xs" variant="danger-soft" onClick={() => onDelete(entry)}>
            Borrar
          </Button>
        )}
      </div>
    </div>
  );
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
  onCreated: (entry: Entry) => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [query, setQuery] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState(todayBogota());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  function reset() {
    setServiceId("");
    setQuery("");
    setClientName("");
    setAmount("");
    setNote("");
    setPerformedAt(todayBogota());
    setError(null);
  }

  function selectService(s: Service) {
    setServiceId(s.id);
    setAmount(String(s.price));
  }

  async function handleSubmit() {
    setError(null);
    const service = services.find((s) => s.id === serviceId);
    const serviceName = service?.name ?? query.trim();
    if (!serviceName) return setError("Indica qué servicio hiciste.");
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) return setError("Indica un monto válido.");

    setLoading(true);
    const result = await createNotebookEntry(businessId, {
      serviceId: service?.id ?? null,
      serviceName,
      clientName,
      amount: parsedAmount,
      note,
      performedAt,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCreated({
      id: crypto.randomUUID(),
      business_member_id: "",
      service_id: service?.id ?? null,
      service_name: serviceName,
      client_name: clientName || null,
      amount: parsedAmount,
      note: note || null,
      performed_at: performedAt,
      status: "pending",
      created_at: new Date().toISOString(),
    });
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
          <Label>Servicio</Label>
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servicio…" className="mb-2" />
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
            {filteredServices.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-ink-500)]">
                Ningún servicio coincide. Si no está en la lista, escribe el nombre arriba y continúa.
              </p>
            ) : (
              filteredServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectService(s)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm",
                    serviceId === s.id
                      ? "border-transparent text-[var(--color-accent-ink)] [background:var(--gradient-accent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                  )}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs opacity-80">{currency.format(s.price)}</span>
                </button>
              ))
            )}
          </div>
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
            <Label>Monto cobrado</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
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
