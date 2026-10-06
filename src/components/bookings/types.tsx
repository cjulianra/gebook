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

export const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  pending: "confirmed",
  confirmed: "completed",
  in_progress: "completed",
};
export const NEXT_LABEL: Partial<Record<BookingStatus, string>> = {
  pending: "Confirmar",
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
