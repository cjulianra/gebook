"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";

export interface DayBlock {
  id: string;
  business_member_id: string;
  block_date: string;
  reason: string | null;
}

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${WEEKDAY_LABEL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Bloqueo puntual: marca que un empleado no puede atender un día concreto (permiso, incapacidad), sin tocar el horario general del negocio. */
export function EmployeeDayBlocksPanel({
  memberId,
  blocks,
  onChange,
}: {
  memberId: string;
  blocks: DayBlock[];
  onChange: (blocks: DayBlock[]) => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...blocks].sort((a, b) => a.block_date.localeCompare(b.block_date));

  async function handleAdd() {
    if (!date) return setError("Elige una fecha.");
    if (blocks.some((b) => b.block_date === date)) return setError("Ese día ya está bloqueado.");
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("employee_day_blocks")
      .insert({ business_member_id: memberId, block_date: date, reason: reason.trim() || null })
      .select()
      .single();
    setLoading(false);
    if (insertError || !data) {
      setError("No pudimos agregar el bloqueo.");
      return;
    }
    onChange([...blocks, data]);
    setDate("");
    setReason("");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("employee_day_blocks").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError("No pudimos quitar el bloqueo.");
      return;
    }
    onChange(blocks.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-ink-500)]">
        El horario general lo define el negocio en Configuración. Usa esto solo para casos puntuales: un día en que este empleado no
        pueda atender (permiso, incapacidad, etc.). Ese día no le llegarán reservas nuevas.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        <div className="flex-1 min-w-[140px]">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="h-9" />
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={loading}>
          {loading ? "Agregando…" : "Bloquear día"}
        </Button>
      </div>
      <FieldError>{error ?? undefined}</FieldError>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)]">Sin bloqueos registrados.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {sorted.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-[var(--color-ink-900)]">{formatDate(b.block_date)}</span>
                {b.reason && <span className="text-[var(--color-ink-500)]"> · {b.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(b.id)}
                disabled={deletingId === b.id}
                className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:opacity-50"
              >
                {deletingId === b.id ? "Quitando…" : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
