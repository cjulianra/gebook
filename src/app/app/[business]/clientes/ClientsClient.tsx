"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

type Client = Database["public"]["Tables"]["clients"]["Row"];

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length <= 10 ? `57${digits}` : digits;
  return `https://wa.me/${withCountryCode}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M23.47 8.52A10.26 10.26 0 0 0 16.06 5.5c-5.68 0-10.3 4.6-10.3 10.26 0 1.81.48 3.57 1.38 5.13L5.5 26.5l5.76-1.51a10.3 10.3 0 0 0 4.79 1.22h.01c5.68 0 10.3-4.6 10.3-10.26 0-2.74-1.07-5.32-3.02-7.25l.13-.18ZM16.06 24.3a8.6 8.6 0 0 1-4.37-1.2l-.31-.19-3.42.9.91-3.32-.2-.34a8.5 8.5 0 0 1-1.31-4.52c0-4.7 3.84-8.52 8.57-8.52a8.55 8.55 0 0 1 8.56 8.52c0 4.7-3.84 8.52-8.56 8.52Zm4.7-6.38c-.26-.13-1.53-.75-1.77-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.08-.4-2.06-1.27a7.72 7.72 0 0 1-1.43-1.78c-.15-.26-.02-.4.11-.53.11-.11.26-.3.39-.44.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.42-.44-.58-.44h-.5c-.17 0-.44.06-.67.32-.23.26-.87.85-.87 2.08 0 1.22.89 2.4 1.01 2.57.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.11-.23-.17-.49-.3Z"
      />
    </svg>
  );
}

export function ClientsClient({ businessId, initialClients }: { businessId: string; initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const showToast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Clientes"
        description="La base de clientes de tu negocio."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Nuevo cliente
          </Button>
        }
      />

      {clients.length > 0 && (
        <Input placeholder="Buscar por nombre, teléfono o correo…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
      )}

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            title="Aún no tienes clientes"
            description="Se irán agregando cuando crees reservas, o puedes añadirlos manualmente."
            action={{ label: "Agregar cliente", onClick: () => setModalOpen(true) }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Prueba con otro término de búsqueda." />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((client) => (
              <div key={client.id} className="flex items-center gap-2 px-5 py-2">
                <button
                  onClick={() => {
                    setEditing(client);
                    setModalOpen(true);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] py-1 text-left hover:bg-[var(--color-canvas)]"
                >
                  <Avatar name={`${client.first_name} ${client.last_name ?? ""}`} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-ink-900)]">
                      {client.first_name} {client.last_name ?? ""}
                    </p>
                    <p className="truncate text-sm text-[var(--color-ink-500)]">{[client.phone, client.email].filter(Boolean).join(" · ") || "Sin contacto"}</p>
                  </div>
                </button>
                {client.phone && (
                  <a
                    href={whatsappLink(client.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Enviar WhatsApp a ${client.first_name}`}
                    title="Enviar WhatsApp"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
                  >
                    <WhatsAppIcon className="h-8 w-8" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        businessId={businessId}
        client={editing}
        onSaved={(saved, isNew) => {
          setClients((prev) => (isNew ? [saved, ...prev] : prev.map((c) => (c.id === saved.id ? saved : c))));
          setModalOpen(false);
          showToast(isNew ? "Cliente agregado." : "Cliente actualizado.");
        }}
      />
    </div>
  );
}

function ClientFormModal({
  open,
  onClose,
  businessId,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  client: Client | null;
  onSaved: (client: Client, isNew: boolean) => void;
}) {
  const [firstName, setFirstName] = useState(client?.first_name ?? "");
  const [lastName, setLastName] = useState(client?.last_name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastClientId, setLastClientId] = useState<string | null>(client?.id ?? null);
  if (open && (client?.id ?? null) !== lastClientId) {
    setLastClientId(client?.id ?? null);
    setFirstName(client?.first_name ?? "");
    setLastName(client?.last_name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setNotes(client?.notes ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return setError("El nombre es obligatorio.");
    if (!phone.trim()) return setError("El número de WhatsApp es obligatorio.");

    setLoading(true);
    const supabase = createClient();
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    };

    const result = client
      ? await supabase.from("clients").update(payload).eq("id", client.id).select().single()
      : await supabase.from("clients").insert({ ...payload, business_id: businessId }).select().single();

    setLoading(false);
    if (result.error || !result.data) {
      setError("No pudimos guardar el cliente.");
      return;
    }
    onSaved(result.data, !client);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Editar cliente" : "Nuevo cliente"}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Número de WhatsApp</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <FieldError>{error ?? undefined}</FieldError>
      </form>
    </Modal>
  );
}
