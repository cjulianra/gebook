"use client";

import { cn } from "@/lib/utils/cn";
import { todayInBogota } from "@/lib/utils/dateRange";

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Franja de 7 días centrada en el día seleccionado, con navegación circular estilo cápsula. */
export function WeekStrip({
  day,
  onSelect,
  onShiftWeek,
}: {
  day: string;
  onSelect: (day: string) => void;
  onShiftWeek: (direction: -1 | 1) => void;
}) {
  const selected = new Date(`${day}T00:00:00`);
  const start = new Date(selected);
  start.setDate(start.getDate() - start.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const todayKey = todayInBogota();

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--color-ink-900)]">
          {MONTH_LABEL[selected.getMonth()]}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onShiftWeek(-1)}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-canvas)]"
          >
            ‹
          </button>
          <button
            onClick={() => onShiftWeek(1)}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-canvas)]"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = toKey(d);
          const isSelected = key === day;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] py-2 transition-colors"
            >
              <span className="text-xs font-medium text-[var(--color-ink-400)]">{WEEKDAY_LABEL[d.getDay()]}</span>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
                  isSelected
                    ? "bg-[var(--color-ink-900)] text-white"
                    : isToday
                      ? "text-[var(--color-accent-ink)] [background:var(--color-accent-soft)]"
                      : "text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
