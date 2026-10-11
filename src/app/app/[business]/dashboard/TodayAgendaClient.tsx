"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useBusiness } from "@/lib/context/BusinessContext";
import { BookingRow } from "@/components/bookings/BookingRow";
import { EditBookingModal } from "@/components/bookings/EditBookingModal";
import { AddExtraServiceModal } from "@/components/bookings/AddExtraServiceModal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { notifyBookingCreated } from "../reservas/actions";
import { type Assignment, type Booking, type Employee, type Service, one } from "@/components/bookings/types";

/** Misma fila y mismas acciones (Editar, Cancelar) que la Agenda, para la lista "Agenda de hoy" del Panel. */
export function TodayAgendaClient({
  businessId,
  initialBookings,
  employees,
  services,
  assignments,
}: {
  businessId: string;
  initialBookings: Booking[];
  employees: Employee[];
  services: Service[];
  assignments: Assignment[];
}) {
  const { membership } = useBusiness();
  const isEmployee = membership.role === "employee";
  const [bookings, setBookings] = useState(initialBookings);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [toEdit, setToEdit] = useState<Booking | null>(null);
  const [toAddExtra, setToAddExtra] = useState<Booking | null>(null);
  const showToast = useToast();

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

  if (bookings.length === 0) {
    return <EmptyState title="Sin reservas hoy" description="Cuando agendes una reserva aparecerá aquí." />;
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-border)]">
        {bookings.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            onEdit={setToEdit}
            onCancel={setToCancel}
            onAddExtra={setToAddExtra}
          />
        ))}
      </div>

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

      <AddExtraServiceModal
        booking={toAddExtra}
        onClose={() => setToAddExtra(null)}
        businessId={businessId}
        services={services}
        employees={employees}
        assignments={assignments}
        lockedEmployeeId={isEmployee ? membership.id : undefined}
        onCreated={(created) => {
          setBookings((prev) => [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at)));
          setToAddExtra(null);
          showToast("Servicio extra agregado.");
          if (created.business_member_id !== membership.id) {
            const client = one(created.clients);
            const service = one(created.services);
            const clientName = client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : "un cliente";
            notifyBookingCreated(businessId, [created.business_member_id], "Servicio extra agregado", `${clientName}: ${service?.name ?? "un servicio"}.`).catch(() => {});
          }
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
    </>
  );
}
