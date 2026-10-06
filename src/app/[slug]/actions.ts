"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bogotaDateTime, weekdayOf } from "@/lib/utils/dateRange";

const SLOT_STEP_MINUTES = 30;
const DEFAULT_WINDOW = { start_time: "09:00", end_time: "19:00" };

interface Interval {
  start: Date;
  end: Date;
}

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function computeFreeSlots(businessMemberId: string, day: string, durationMinutes: number) {
  const supabase = await createClient();
  const weekday = weekdayOf(day);

  const [{ data: schedules }, { data: busy }] = await Promise.all([
    supabase.from("work_schedules").select("start_time, end_time").eq("business_member_id", businessMemberId).eq("weekday", weekday),
    supabase.from("public_busy_slots").select("start_at, end_at").eq("business_member_id", businessMemberId),
  ]);

  const windows = schedules && schedules.length > 0 ? schedules : [DEFAULT_WINDOW];
  const busyIntervals: Interval[] = (busy ?? []).map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) }));

  const now = new Date();
  const slots: string[] = [];

  for (const w of windows) {
    const startMin = timeToMinutes(w.start_time.slice(0, 5));
    const endMin = timeToMinutes(w.end_time.slice(0, 5));

    for (let m = startMin; m + durationMinutes <= endMin; m += SLOT_STEP_MINUTES) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const candidateStart = bogotaDateTime(day, `${hh}:${mm}:00`);
      const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60000);

      if (candidateStart < now) continue;
      if (busyIntervals.some((interval) => overlaps({ start: candidateStart, end: candidateEnd }, interval))) continue;

      slots.push(`${hh}:${mm}`);
    }
  }

  return slots;
}

export async function getAvailableSlots(businessMemberId: string, day: string, durationMinutes: number) {
  return computeFreeSlots(businessMemberId, day, durationMinutes);
}

interface ConfirmBookingInput {
  businessId: string;
  serviceId: string;
  businessMemberId: string;
  day: string;
  time: string;
  durationMinutes: number;
}

export async function confirmBooking(input: ConfirmBookingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "login_required" as const };
  }

  const freeSlots = await computeFreeSlots(input.businessMemberId, input.day, input.durationMinutes);
  if (!freeSlots.includes(input.time)) {
    return { error: "Ese horario ya no está disponible. Elige otro." };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", user.id).single();
  if (!profile) return { error: "No pudimos verificar tu cuenta." };

  let { data: clientRow } = await admin
    .from("clients")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clientRow) {
    const [firstName, ...rest] = profile.full_name.split(" ");
    const { data: created, error: createError } = await admin
      .from("clients")
      .insert({
        business_id: input.businessId,
        user_id: user.id,
        first_name: firstName || profile.full_name,
        last_name: rest.join(" ") || null,
        email: profile.email,
      })
      .select("id")
      .single();
    if (createError || !created) return { error: "No pudimos crear tu perfil de cliente en este negocio." };
    clientRow = created;
  }

  const startAt = bogotaDateTime(input.day, `${input.time}:00`);
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60000);

  const { error: bookingError } = await admin.from("bookings").insert({
    business_id: input.businessId,
    client_id: clientRow.id,
    service_id: input.serviceId,
    business_member_id: input.businessMemberId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "confirmed",
  });

  if (bookingError) return { error: "No pudimos crear la reserva. Intenta de nuevo." };

  return { data: true };
}
