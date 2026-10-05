import { cn } from "@/lib/utils/cn";

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar lives in Supabase Storage, a dynamic external host
      <img
        src={src}
        alt={name}
        className="shrink-0 rounded-full border-2 border-[var(--color-surface)] object-cover shadow-[0_0_0_1px_var(--color-border-strong)]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-ink)]")}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </div>
  );
}
