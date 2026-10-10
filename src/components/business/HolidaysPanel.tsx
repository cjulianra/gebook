"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";

export interface Holiday {
  id: string;
  business_id: string;
  holiday_date: string;
  name: string | null;
}

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${WEEKDAY_LABEL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Fechas puntuales marcadas como festivo: ese día usa el horario "Festivos" en vez del que le tocaría por día de la semana. */
export function HolidaysPanel({
  businessId,
  holidays,
  onChange,
}: {
  businessId: string;
  holidays: Holiday[];
  onChange: (holidays: Holiday[]) => void;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  async function handleAdd() {
    if (!date) return setError("Elige una fecha.");
    if (holidays.some((h) => h.holiday_date === date)) return setError("Esa fecha ya está marcada como festivo.");
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("business_holidays")
      .insert({ business_id: businessId, holiday_date: date, name: name.trim() || null })
      .select()
      .single();
    setLoading(false);
    if (insertError || !data) {
      setError("No pudimos agregar el festivo.");
      return;
    }
    onChange([...holidays, data]);
    setDate("");
    setName("");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("business_holidays").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError("No pudimos eliminar el festivo.");
      return;
    }
    onChange(holidays.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (opcional)" className="h-9" />
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={loading}>
          {loading ? "Agregando…" : "Agregar festivo"}
        </Button>
      </div>
      <FieldError>{error ?? undefined}</FieldError>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)]">Aún no has marcado ningún festivo.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {sorted.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-[var(--color-ink-900)]">{formatDate(h.holiday_date)}</span>
                {h.name && <span className="text-[var(--color-ink-500)]"> · {h.name}</span>}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(h.id)}
                disabled={deletingId === h.id}
                className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:opacity-50"
              >
                {deletingId === h.id ? "Eliminando…" : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
