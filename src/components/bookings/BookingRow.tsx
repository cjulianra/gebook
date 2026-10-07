"use client";

import { Avatar } from "@/components/ui/Avatar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { useBusiness } from "@/lib/context/BusinessContext";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";
import { type Booking, DotsIcon, WhatsAppIcon, NEXT_LABEL, NEXT_STATUS, one } from "./types";

// Colombia (57) por defecto: la mayoría de clientes registran su número a 10
// dígitos sin indicativo. Si ya viene con uno, se respeta tal cual.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

/** Fila de reserva compartida entre Agenda y "Agenda de hoy" del Panel — mismo look y mismas acciones en los dos lugares. */
export function BookingRow({
  booking,
  menuOpen,
  onToggleMenu,
  onAdvance,
  onEdit,
  onCancel,
}: {
  booking: Booking;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onAdvance: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
}) {
  const { business } = useBusiness();
  const client = one(booking.clients);
  const service = one(booking.services);
  const employee = one(booking.business_members);
  const next = NEXT_STATUS[booking.status];
  const editable = booking.status !== "completed" && booking.status !== "cancelled";

  const startTime = new Date(booking.start_at).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ });
  const endTime = new Date(booking.end_at).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: BOGOTA_TZ });
  const dateLabel = new Date(booking.start_at).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: BOGOTA_TZ,
  });

  const whatsappHref = client?.phone
    ? `https://wa.me/${toWhatsAppNumber(client.phone)}?text=${encodeURIComponent(
        `Hola ${client.first_name} 👋, te confirmamos tu reserva en ${business.name}:\n\n📅 ${dateLabel}\n🕐 ${startTime} – ${endTime}\n💇 ${service?.name ?? ""}\n👤 Con ${one(employee?.profiles)?.full_name ?? ""}\n\n¡Te esperamos!`
      )}`
    : null;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="whitespace-nowrap text-sm font-bold text-[var(--color-ink-900)]">
          {startTime}
          {" – "}
          {endTime}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enviar resumen por WhatsApp"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#25D366] hover:bg-[var(--color-canvas)]"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          )}
          {editable && (
            <div className="relative">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label="Más acciones"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-canvas)]"
              >
                <DotsIcon className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={onToggleMenu} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-popover)]">
                    {next && (
                      <button
                        type="button"
                        onClick={() => onAdvance(booking)}
                        className="block w-full px-4 py-2 text-left text-sm text-[var(--color-info)] hover:bg-[var(--color-canvas)]"
                      >
                        {NEXT_LABEL[booking.status]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(booking)}
                      className="block w-full px-4 py-2 text-left text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancel(booking)}
                      className="block w-full px-4 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-canvas)]"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-[var(--color-ink-900)]">
        {client?.first_name} {client?.last_name ?? ""}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-500)]">
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <Avatar name={one(employee?.profiles)?.full_name ?? ""} src={one(employee?.employee_details)?.photo_url} size={20} />
          <span className="truncate">{one(employee?.profiles)?.full_name}</span>
        </span>
        <span className="h-3 w-px shrink-0 bg-[var(--color-border-strong)]" />
        <span className="max-w-full truncate">{service?.name}</span>
      </p>
    </div>
  );
}
