import { cn } from "@/lib/utils/cn";
import type { BookingStatus } from "@/lib/types/database";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-[var(--color-canvas)] text-[var(--color-ink-700)] border-[var(--color-border-strong)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-transparent",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-transparent",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const bookingStatusMeta: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "info" },
  in_progress: { label: "En curso", tone: "accent" },
  completed: { label: "Completada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = bookingStatusMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
