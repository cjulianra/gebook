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
  const today = new Date();
  const todayKey = toDateKey(today);

  if (preset === "semana") {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    return { from: toDateKey(start), to: todayKey };
  }
  if (preset === "mes") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateKey(start), to: todayKey };
  }
  // "hoy" or default
  return { from: todayKey, to: todayKey };
}
