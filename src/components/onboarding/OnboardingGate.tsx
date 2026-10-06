"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Step = "servicios" | "empleados" | null;

const STEPS: { key: "servicios" | "empleados"; label: string }[] = [
  { key: "servicios", label: "Servicios" },
  { key: "empleados", label: "Empleados" },
];

const MESSAGES: Record<Exclude<Step, null>, { title: string; description: string }> = {
  servicios: {
    title: "Primero vamos a crear tus servicios ✨",
    description: "Son lo que tus clientes podrán reservar: define nombre, precio y duración. Crea al menos uno para continuar.",
  },
  empleados: {
    title: "¡Vas muy bien! Ahora crea tus empleados 🙌",
    description: "Agrega a las personas que atenderán las citas para poder asignarles reservas. Crea al menos una para continuar.",
  },
};

export function OnboardingGate({ slug, step, children }: { slug: string; step: Step; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const targetPath = step ? `/app/${slug}/${step}` : null;
  const onTarget = !targetPath || pathname === targetPath;

  useEffect(() => {
    if (targetPath && pathname !== targetPath) {
      router.replace(targetPath);
    }
  }, [targetPath, pathname, router]);

  if (targetPath && !onTarget) return null;

  return (
    <>
      {step && (
        <div className="mx-auto max-w-5xl px-4 pt-4 md:px-8 md:pt-8">
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-accent-soft)] px-5 py-4 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center gap-2">
              {STEPS.map((s, i) => {
                const stepIndex = STEPS.findIndex((x) => x.key === step);
                const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
                return (
                  <div key={s.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          state === "upcoming"
                            ? "bg-white/60 text-[var(--color-ink-400)]"
                            : "bg-[var(--color-ink-900)] text-white"
                        )}
                      >
                        {state === "done" ? "✓" : i + 1}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          state === "upcoming" ? "text-[var(--color-ink-400)]" : "text-[var(--color-ink-900)]"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-[var(--color-ink-900)]/15" />}
                  </div>
                );
              })}
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{MESSAGES[step].title}</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">{MESSAGES[step].description}</p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
