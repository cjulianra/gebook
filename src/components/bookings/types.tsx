import type { BookingStatus } from "@/lib/types/database";

export function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export interface Employee {
  id: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  employee_details?: { photo_url: string | null } | { photo_url: string | null }[] | null;
}
export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}
export interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
}
export interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  notes: string | null;
  client_id: string;
  service_id: string;
  business_member_id: string;
  clients: Client | Client[] | null;
  services: Service | Service[] | null;
  business_members: Employee | Employee[] | null;
}
export interface Assignment {
  business_member_id: string;
  service_id: string;
}

// El estado "pending" ya no se usa: toda reserva nace "confirmed". El paso a
// "in_progress"/"completed" ocurre solo (ver syncBookingStatuses) según la
// hora real del servicio; la única acción manual que queda es poder marcar
// "Completada" antes de tiempo desde el menú de tres puntos.
export const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  confirmed: "completed",
  in_progress: "completed",
};
export const NEXT_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: "Completar",
  in_progress: "Completar",
};

export function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38a9.96 9.96 0 0 0 4.79 1.22h.01c5.52 0 10-4.48 10-10s-4.48-9.84-10.01-9.84Zm0 18.17h-.01a8.3 8.3 0 0 1-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.27-4.4c0-4.58 3.73-8.3 8.32-8.3 2.22 0 4.31.87 5.88 2.44a8.24 8.24 0 0 1 2.43 5.87c0 4.58-3.73 8.26-8.32 8.26Zm4.56-6.2c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.21-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.47-.01-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  );
}
