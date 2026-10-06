"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";

export interface Schedule {
  id: string;
  business_member_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Horario semanal recurrente de un empleado — lo usan tanto el dueño/admin (Empleados > Configuración) como el propio empleado (Mi perfil). */
export function WeekSchedulePanel({
  memberId,
  schedules,
  onSaved,
}: {
  memberId: string;
  schedules: Schedule[];
  onSaved: (schedules: Schedule[]) => void;
}) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 7 }, (_, weekday) => {
      const existing = schedules.find((s) => s.weekday === weekday);
      return {
        weekday,
        enabled: !!existing,
        start: existing?.start_time?.slice(0, 5) ?? "09:00",
        end: existing?.end_time?.slice(0, 5) ?? "18:00",
      };
    })
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(weekday: number, patch: Partial<{ enabled: boolean; start: string; end: string }>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("work_schedules").delete().eq("business_member_id", memberId);
    if (deleteError) {
      setLoading(false);
      setError("No pudimos guardar el horario.");
      return;
    }

    const toInsert = rows
      .filter((r) => r.enabled)
      .map((r) => ({ business_member_id: memberId, weekday: r.weekday, start_time: r.start, end_time: r.end }));

    let saved: Schedule[] = [];
    if (toInsert.length > 0) {
      const { data, error: insertError } = await supabase.from("work_schedules").insert(toInsert).select();
      if (insertError) {
        setLoading(false);
        setError("No pudimos guardar el horario.");
        return;
      }
      saved = data ?? [];
    }
    setLoading(false);
    onSaved(saved);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3">
            <label className="flex w-32 shrink-0 items-center gap-2">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => updateRow(row.weekday, { enabled: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-ink-900)]">{WEEKDAYS[row.weekday]}</span>
            </label>
            <input
              type="time"
              value={row.start}
              disabled={!row.enabled}
              onChange={(e) => updateRow(row.weekday, { start: e.target.value })}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-40"
            />
            <span className="text-[var(--color-ink-400)]">–</span>
            <input
              type="time"
              value={row.end}
              disabled={!row.enabled}
              onChange={(e) => updateRow(row.weekday, { end: e.target.value })}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-40"
            />
          </div>
        ))}
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar horario"}
      </Button>
    </div>
  );
}
