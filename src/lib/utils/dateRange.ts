// El negocio solo opera en Colombia, así que toda fecha/hora real (reservas,
// "hoy", rangos de reportes) se ancla a hora de Bogotá de forma explícita —
// sin esto, el servidor de producción (que corre en UTC) desfasaría cada
// reserva y cada "hoy" hasta 5 horas frente a lo que el negocio ve en pantalla.
export const BOGOTA_TZ = "America/Bogota";
// Colombia no observa horario de verano: el offset es fijo todo el año.
const BOGOTA_OFFSET = "-05:00";

/** La fecha (YYYY-MM-DD) de "hoy" en Bogotá, sin importar la zona horaria del servidor. */
export function todayInBogota() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Construye el instante real de un día (YYYY-MM-DD) + hora (HH:MM o HH:MM:SS) en hora de Bogotá. */
export function bogotaDateTime(day: string, time: string) {
  return new Date(`${day}T${time}${BOGOTA_OFFSET}`);
}

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, como calendario puro (sin zona horaria real). */
export function weekdayOf(day: string) {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Convierte "HH:MM" (24h) a "h:MM AM/PM" para mostrar en pastillas y listas. */
export function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function presetRange(preset: string): { from: string; to: string } {
  const todayKey = todayInBogota();

  if (preset === "semana") {
    // Domingo de esta semana, calculado en calendario puro sobre la fecha de Bogotá.
    const start = new Date(`${todayKey}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    return { from: start.toISOString().slice(0, 10), to: todayKey };
  }
  if (preset === "mes") {
    const [y, m] = todayKey.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    return { from: start.toISOString().slice(0, 10), to: todayKey };
  }
  // "hoy" or default
  return { from: todayKey, to: todayKey };
}
