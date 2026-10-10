"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScheduleType } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";

export interface BusinessSchedule {
  id: string;
  business_id: string;
  schedule_type: ScheduleType;
  start_time: string;
  end_time: string;
}

const TIERS: { type: ScheduleType; label: string }[] = [
  { type: "weekday", label: "Lunes a viernes" },
  { type: "saturday", label: "Sábado" },
  { type: "sunday", label: "Domingo" },
  { type: "holiday", label: "Festivos" },
];

/** Horario general del negocio: una sola configuración por tipo de día, aplicada a todos los empleados. */
export function BusinessSchedulePanel({
  businessId,
  schedules,
  onSaved,
}: {
  businessId: string;
  schedules: BusinessSchedule[];
  onSaved: (schedules: BusinessSchedule[]) => void;
}) {
  const [rows, setRows] = useState(() =>
    TIERS.map((tier) => {
      const existing = schedules.find((s) => s.schedule_type === tier.type);
      return {
        type: tier.type,
        enabled: !!existing,
        start: existing?.start_time?.slice(0, 5) ?? "09:00",
        end: existing?.end_time?.slice(0, 5) ?? "18:00",
      };
    })
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(type: ScheduleType, patch: Partial<{ enabled: boolean; start: string; end: string }>) {
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("business_schedules").delete().eq("business_id", businessId);
    if (deleteError) {
      setLoading(false);
      setError("No pudimos guardar el horario.");
      return;
    }

    const toInsert = rows
      .filter((r) => r.enabled)
      .map((r) => ({ business_id: businessId, schedule_type: r.type, start_time: r.start, end_time: r.end }));

    let saved: BusinessSchedule[] = [];
    if (toInsert.length > 0) {
      const { data, error: insertError } = await supabase.from("business_schedules").insert(toInsert).select();
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
      <div className="space-y-4">
        {rows.map((row) => {
          const tier = TIERS.find((t) => t.type === row.type)!;
          return (
            <div key={row.type} className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateRow(row.type, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-sm text-[var(--color-ink-900)]">{tier.label}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={row.start}
                  disabled={!row.enabled}
                  onChange={(e) => updateRow(row.type, { start: e.target.value })}
                  className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-40"
                />
                <span className="text-[var(--color-ink-400)]">–</span>
                <input
                  type="time"
                  value={row.end}
                  disabled={!row.enabled}
                  onChange={(e) => updateRow(row.type, { end: e.target.value })}
                  className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-40"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--color-ink-500)]">
        Si desmarcas un tipo de día, el negocio queda cerrado ese día para todos los empleados (no se podrán agendar reservas).
      </p>
      <FieldError>{error ?? undefined}</FieldError>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar horario"}
      </Button>
    </div>
  );
}
