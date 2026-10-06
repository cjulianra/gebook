"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  businesses: { name: string } | { name: string }[] | null;
  services: { name: string; price: number } | { name: string; price: number }[] | null;
  business_members: { profiles: { full_name: string } | { full_name: string }[] | null } | { profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
}

export function PortalClient({ fullName, bookings }: { fullName: string; bookings: Booking[] }) {
  return (
    <ToastProvider>
      <PortalInner fullName={fullName} initialBookings={bookings} />
    </ToastProvider>
  );
}

function PortalInner({ fullName, initialBookings }: { fullName: string; initialBookings: Booking[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const showToast = useToast();

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    for (const b of bookings) {
      if (b.status === "cancelled" || new Date(b.start_at).getTime() < now) past.push(b);
      else upcoming.push(b);
    }
    return { upcoming, past };
  }, [bookings, now]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/portal/login");
    router.refresh();
  }

  async function handleCancel() {
    if (!toCancel) return;
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", toCancel.id);
    if (error) {
      showToast("No pudimos cancelar tu reserva.", "danger");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === toCancel.id ? { ...b, status: "cancelled" } : b)));
    showToast("Reserva cancelada.");
  }

  return (
    <div className="gradient-canvas min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-8 md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">Hola, {fullName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">Tus reservas en todos los negocios de Gebook.</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)]/80 text-xs text-[var(--color-ink-500)] shadow-[var(--shadow-sm)]"
        >
          ⏻
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Próximas</CardTitle>
          </CardHeader>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No tienes reservas próximas"
              description="Cuando un negocio te agende una cita, aparecerá aquí."
            />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} onCancel={() => setToCancel(b)} />
              ))}
            </div>
          )}
        </Card>

        {past.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <div className="divide-y divide-[var(--color-border)]">
              {past.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          </Card>
        )}
      </main>

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        description="El negocio será notificado y el horario quedará disponible para otros clientes."
        confirmLabel="Cancelar reserva"
        danger
      />
    </div>
  );

  function BookingRow({ booking, onCancel }: { booking: Booking; onCancel?: () => void }) {
    const business = one(booking.businesses);
    const service = one(booking.services);
    const member = one(booking.business_members);
    const employee = member && one(member.profiles);
    const canCancel = onCancel && booking.status !== "cancelled" && booking.status !== "completed";

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-900)]">{service?.name}</p>
          <p className="text-xs text-[var(--color-ink-500)]">
            {[business?.name, employee?.full_name].filter(Boolean).join(" · ")} ·{" "}
            {new Date(booking.start_at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BookingStatusBadge status={booking.status} />
          {canCancel && (
            <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }
}
