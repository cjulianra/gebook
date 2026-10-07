"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { useBusiness } from "@/lib/context/BusinessContext";
import { BOGOTA_TZ } from "@/lib/utils/dateRange";
import { type Booking, WhatsAppIcon, NEXT_LABEL, NEXT_STATUS, one } from "./types";

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
  onAdvance,
  onEdit,
  onCancel,
}: {
  booking: Booking;
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

  // Emojis escritos como \u{...} (no el carácter literal) para que nunca dependan de
  // cómo el editor/pipeline de build interprete la codificación del archivo fuente.
  const WAVE = "\u{1F44B}";
  const CALENDAR = "\u{1F4C5}";
  const CLOCK = "\u{1F550}";
  const SCISSORS = "\u{1F487}";
  const PERSON = "\u{1F464}";

  const whatsappHref = client?.phone
    ? `https://wa.me/${toWhatsAppNumber(client.phone)}?text=${encodeURIComponent(
        `Hola ${client.first_name} ${WAVE}, te confirmamos tu reserva en ${business.name}:\n\n${CALENDAR} ${dateLabel}\n${CLOCK} ${startTime} - ${endTime}\n${SCISSORS} ${service?.name ?? ""}\n${PERSON} Con ${one(employee?.profiles)?.full_name ?? ""}\n\n¡Te esperamos!`
      )}`
    : null;

  return (
    <div className="space-y-2 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="whitespace-nowrap text-sm font-bold text-[var(--color-ink-900)]">
          {startTime}
          {" – "}
          {endTime}
        </p>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Enviar resumen por WhatsApp"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#25D366] hover:bg-[var(--color-canvas)]"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        )}
      </div>

      <p className="flex min-w-0 items-center gap-x-2 text-sm">
        <span className="truncate font-medium text-[var(--color-ink-900)]">
          {client?.first_name} {client?.last_name ?? ""}
        </span>
        <span className="h-3 w-px shrink-0 bg-[var(--color-border-strong)]" />
        <span className="inline-flex min-w-0 shrink items-center gap-1.5 text-[var(--color-ink-500)]">
          <Avatar name={one(employee?.profiles)?.full_name ?? ""} src={one(employee?.employee_details)?.photo_url} size={18} />
          <span className="truncate">{one(employee?.profiles)?.full_name}</span>
        </span>
        <span className="h-3 w-px shrink-0 bg-[var(--color-border-strong)]" />
        <span className="min-w-0 truncate text-[var(--color-ink-500)]">{service?.name}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={booking.status} />
        {editable && (
          <>
            {next && (
              <Button size="xs" variant="info-soft" onClick={() => onAdvance(booking)}>
                {NEXT_LABEL[booking.status]}
              </Button>
            )}
            <Button size="xs" variant="neutral-soft" onClick={() => onEdit(booking)}>
              Editar
            </Button>
            <Button size="xs" variant="danger-soft" onClick={() => onCancel(booking)}>
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
