"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

type Service = Database["public"]["Tables"]["services"]["Row"];

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function ServicesClient({ businessId, initialServices }: { businessId: string; initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const showToast = useToast();

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", toDelete.id);
    if (error) {
      showToast("No pudimos eliminar el servicio.", "danger");
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== toDelete.id));
    showToast("Servicio eliminado.");
  }

  async function handleToggleActive(service: Service) {
    const supabase = createClient();
    const { error } = await supabase.from("services").update({ is_active: !service.is_active }).eq("id", service.id);
    if (error) {
      showToast("No pudimos actualizar el estado.", "danger");
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s)));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Servicios"
        description="Los servicios que ofrece tu negocio y que podrás asignar a empleados."
        action={<Button onClick={openCreate}>Nuevo servicio</Button>}
      />

      <Card>
        {services.length === 0 ? (
          <EmptyState
            title="Aún no tienes servicios"
            description="Crea tu primer servicio para empezar a recibir reservas."
            action={{ label: "Crear servicio", onClick: openCreate }}
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {services.map((service) => (
              <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--color-ink-900)]">{service.name}</p>
                    {!service.is_active && <Badge tone="neutral">Inactivo</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                    {currency.format(service.price)} · {service.duration_minutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(service)}>
                    {service.is_active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(service)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" onClick={() => setToDelete(service)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        businessId={businessId}
        service={editing}
        onSaved={(saved, isNew) => {
          setServices((prev) => (isNew ? [saved, ...prev] : prev.map((s) => (s.id === saved.id ? saved : s))));
          setModalOpen(false);
          showToast(isNew ? "Servicio creado." : "Servicio actualizado.");
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar servicio"
        description={`¿Seguro que quieres eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

function ServiceFormModal({
  open,
  onClose,
  businessId,
  service,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  service: Service | null;
  onSaved: (service: Service, isNew: boolean) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [duration, setDuration] = useState(service?.duration_minutes?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset form fields whenever a different service (or "new") is opened.
  const [lastServiceId, setLastServiceId] = useState<string | null>(service?.id ?? null);
  if (open && (service?.id ?? null) !== lastServiceId) {
    setLastServiceId(service?.id ?? null);
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setPrice(service?.price?.toString() ?? "");
    setDuration(service?.duration_minutes?.toString() ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNumber = Number(price);
    const durationNumber = Number(duration);
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (!durationNumber || durationNumber <= 0) return setError("La duración debe ser mayor a 0.");

    setLoading(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNumber || 0,
      duration_minutes: durationNumber,
    };

    const result = service
      ? await supabase.from("services").update(payload).eq("id", service.id).select().single()
      : await supabase.from("services").insert({ ...payload, business_id: businessId }).select().single();

    setLoading(false);

    if (result.error || !result.data) {
      setError("No pudimos guardar el servicio. Intenta de nuevo.");
      return;
    }

    onSaved(result.data, !service);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? "Editar servicio" : "Nuevo servicio"}
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Manicure semipermanente" />
        </div>
        <div>
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Precio (COP)</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" />
          </div>
          <div>
            <Label htmlFor="duration">Duración (min)</Label>
            <Input id="duration" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
          </div>
        </div>
        <FieldError>{error ?? undefined}</FieldError>
      </form>
    </Modal>
  );
}
