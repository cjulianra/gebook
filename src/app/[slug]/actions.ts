"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bogotaDateTime, weekdayOf, formatTime12h } from "@/lib/utils/dateRange";
import { notifyNewBooking } from "@/lib/push/send";

const SLOT_STEP_MINUTES = 30;

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

  const { data: member } = await supabase
    .from("public_member_business")
    .select("business_id")
    .eq("business_member_id", businessMemberId)
    .single();
  if (!member) return [];

  const [{ data: blocked }, { data: holiday }, { data: busy }] = await Promise.all([
    supabase.from("employee_day_blocks").select("id").eq("business_member_id", businessMemberId).eq("block_date", day).maybeSingle(),
    supabase.from("business_holidays").select("id").eq("business_id", member.business_id).eq("holiday_date", day).maybeSingle(),
    supabase.from("public_busy_slots").select("start_at, end_at").eq("business_member_id", businessMemberId),
  ]);

  if (blocked) return [];

  const weekday = weekdayOf(day);
  const scheduleType = holiday ? "holiday" : weekday === 0 ? "sunday" : weekday === 6 ? "saturday" : "weekday";

  const { data: schedules } = await supabase
    .from("business_schedules")
    .select("start_time, end_time")
    .eq("business_id", member.business_id)
    .eq("schedule_type", scheduleType);

  const windows = schedules ?? [];
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
  guestName?: string;
  guestPhone?: string;
}

export async function confirmBooking(input: ConfirmBookingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const freeSlots = await computeFreeSlots(input.businessMemberId, input.day, input.durationMinutes);
  if (!freeSlots.includes(input.time)) {
    return { error: "Ese horario ya no está disponible. Elige otro." };
  }

  const admin = createAdminClient();

  let clientId: string;
  let clientName: string;

  if (user) {
    // Cliente con cuenta: se vincula a su user_id, así ve su historial en /portal.
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
    clientId = clientRow.id;
    clientName = profile.full_name;
  } else {
    // Invitado sin cuenta: solo necesita nombre y WhatsApp — no se exige login para reservar.
    const guestName = input.guestName?.trim();
    const guestPhone = input.guestPhone?.trim();
    if (!guestName || !guestPhone) {
      return { error: "Escribe tu nombre y tu número de WhatsApp." };
    }

    let { data: clientRow } = await admin
      .from("clients")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("phone", guestPhone)
      .is("user_id", null)
      .maybeSingle();

    if (!clientRow) {
      const [firstName, ...rest] = guestName.split(" ");
      const { data: created, error: createError } = await admin
        .from("clients")
        .insert({
          business_id: input.businessId,
          first_name: firstName || guestName,
          last_name: rest.join(" ") || null,
          phone: guestPhone,
        })
        .select("id")
        .single();
      if (createError || !created) return { error: "No pudimos crear tu reserva. Intenta de nuevo." };
      clientRow = created;
    }
    clientId = clientRow.id;
    clientName = guestName;
  }

  const startAt = bogotaDateTime(input.day, `${input.time}:00`);
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60000);

  const { error: bookingError } = await admin.from("bookings").insert({
    business_id: input.businessId,
    client_id: clientId,
    service_id: input.serviceId,
    business_member_id: input.businessMemberId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "confirmed",
  });

  if (bookingError) return { error: "No pudimos crear la reserva. Intenta de nuevo." };

  const { data: service } = await admin.from("services").select("name").eq("id", input.serviceId).single();
  notifyNewBooking(input.businessId, [input.businessMemberId], {
    title: "Nueva reserva",
    body: `${clientName}: ${service?.name ?? "un servicio"} el ${input.day} a las ${formatTime12h(input.time)}.`,
    link: "/reservas",
  }).catch(() => {});

  return { data: true };
}
