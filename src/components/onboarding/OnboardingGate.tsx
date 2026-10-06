"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type Step = "servicios" | "empleados" | null;

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
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{MESSAGES[step].title}</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">{MESSAGES[step].description}</p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
