"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AccountModal, currency, type Payout } from "./AccountModal";

export function AccountButton({
  businessId,
  memberId,
  memberName,
  initialPayouts,
  earned,
}: {
  businessId: string;
  memberId: string;
  memberName: string;
  initialPayouts: Payout[];
  earned: number;
}) {
  const [open, setOpen] = useState(false);
  const [payouts, setPayouts] = useState(initialPayouts);

  const paid = payouts.reduce((sum, p) => sum + p.amount, 0);
  const balance = earned - paid;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Cuenta
        {balance > 0 && (
          <span className="ml-1.5 rounded-full bg-[var(--color-danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-danger)]">
            {currency.format(balance)}
          </span>
        )}
      </Button>
      {open && (
        <AccountModal
          memberId={memberId}
          memberName={memberName}
          payouts={payouts}
          earned={earned}
          businessId={businessId}
          onClose={() => setOpen(false)}
          onRegistered={(payout) => setPayouts((prev) => [payout, ...prev])}
        />
      )}
    </>
  );
}
