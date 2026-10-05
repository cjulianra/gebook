"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export interface Payout {
  id: string;
  business_member_id: string;
  amount: number;
  note: string | null;
  paid_at: string;
  created_at: string;
}

/** Contenido de la cuenta (saldo + registrar pago + historial), sin el Modal que lo envuelve. */
export function AccountPanel({
  memberId,
  payouts,
  earned,
  businessId,
  onRegistered,
  readOnly = false,
}: {
  memberId: string;
  payouts: Payout[];
  earned: number;
  businessId: string;
  onRegistered?: (payout: Payout) => void;
  readOnly?: boolean;
}) {
  const paid = payouts.reduce((sum, p) => sum + p.amount, 0);
  const balance = earned - paid;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Ingresa un monto mayor a 0.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("employee_payouts")
      .insert({ business_id: businessId, business_member_id: memberId, amount: value, note: note.trim() || null })
      .select()
      .single();
    setLoading(false);
    if (insertError || !data) {
      setError("No pudimos registrar el pago.");
      return;
    }
    onRegistered?.(data);
    setAmount("");
    setNote("");
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas)] px-4 py-3">
          <p className="text-lg font-semibold tabular-nums text-[var(--color-ink-900)]">{currency.format(earned)}</p>
          <p className="text-xs text-[var(--color-ink-500)]">Comisión ganada (histórico)</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas)] px-4 py-3">
          <p className="text-lg font-semibold tabular-nums text-[var(--color-ink-900)]">{currency.format(paid)}</p>
          <p className="text-xs text-[var(--color-ink-500)]">Pagado hasta hoy</p>
        </div>
        <div className={balanceClasses(balance)}>
          <p className="text-lg font-semibold tabular-nums">{currency.format(Math.max(balance, 0))}</p>
          <p className="text-xs opacity-80">{balance > 0 ? "Saldo pendiente" : "Al día"}</p>
        </div>
      </div>

      {!readOnly && (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">Registrar pago</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Abono quincena" />
            </div>
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <div className="flex gap-2">
            {balance > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setAmount(String(balance))}>
                Usar saldo completo ({currency.format(balance)})
              </Button>
            )}
            <Button size="sm" onClick={handleRegister} disabled={loading}>
              {loading ? "Registrando…" : "Registrar pago"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--color-ink-900)]">Historial de pagos</p>
        {payouts.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">Aún no se han registrado pagos.</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-ink-900)]">{currency.format(p.amount)}</p>
                  {p.note && <p className="truncate text-xs text-[var(--color-ink-500)]">{p.note}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-ink-500)]">
                  {new Date(`${p.paid_at}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Versión en Modal independiente (se usa en la página de Reportes por empleado). */
export function AccountModal({
  memberId,
  memberName,
  payouts,
  earned,
  businessId,
  onClose,
  onRegistered,
}: {
  memberId: string;
  memberName: string;
  payouts: Payout[];
  earned: number;
  businessId: string;
  onClose: () => void;
  onRegistered: (payout: Payout) => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Cuenta de ${memberName}`} size="lg">
      <AccountPanel memberId={memberId} payouts={payouts} earned={earned} businessId={businessId} onRegistered={onRegistered} />
    </Modal>
  );
}

function balanceClasses(balance: number) {
  const base = "rounded-[var(--radius-md)] px-4 py-3";
  if (balance > 0) return `${base} bg-[var(--color-danger-soft)] text-[var(--color-danger)]`;
  return `${base} [background:var(--color-success-soft)] text-[var(--color-success)]`;
}
