"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

// Permite que ServicesClient/EmployeesClient avisen "ya hay un registro nuevo" sin
// depender de una navegación — ver el comentario junto al useEffect de abajo.
const OnboardingRefreshContext = createContext<(() => void) | null>(null);

export function useOnboardingRefresh() {
  return useContext(OnboardingRefreshContext);
}

export function OnboardingGate({
  businessId,
  slug,
  gated,
  initialStep,
  children,
}: {
  businessId: string;
  slug: string;
  /** Solo owner/admin pasan por el onboarding; empleados nunca quedan bloqueados. */
  gated: boolean;
  initialStep: Step;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);

  const check = useCallback(async () => {
    if (!gated) return;
    const supabase = createClient();
    const [{ count: servicesCount }, { count: employeesCount }] = await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      supabase
        .from("business_members")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("role", "employee"),
    ]);
    if (!servicesCount) setStep("servicios");
    else if (!employeesCount) setStep("empleados");
    else setStep(null);
  }, [gated, businessId]);


  // Next no vuelve a ejecutar este layout compartido al navegar entre rutas
  // hermanas (p. ej. /servicios -> /empleados) — por eso el conteo se vuelve a
  // pedir aquí, en el cliente, cada vez que cambia la ruta, en lugar de confiar
  // únicamente en el valor calculado por el servidor en el primer render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga el conteo desde Supabase, no es un cálculo derivable de las props
    check();
  }, [check, pathname]);

  const targetPath = step ? `/app/${slug}/${step}` : null;
  const servicesPath = `/app/${slug}/servicios`;
  // Una vez hay al menos un servicio, el paso vigente es "empleados", pero dejamos
  // que el usuario se quede libremente en Servicios (agregar más) o pase a Empleados
  // cuando quiera — solo bloqueamos el resto de la app (Agenda, Clientes, etc.).
  const onTarget = !targetPath || pathname === targetPath || (step === "empleados" && pathname === servicesPath);

  useEffect(() => {
    if (targetPath && !onTarget) {
      router.replace(targetPath);
    }
  }, [targetPath, onTarget, router]);

  if (targetPath && !onTarget) return null;

  // El paso que se resalta en el indicador es el de la página donde está parado,
  // no necesariamente el "pendiente" — así Servicios no se ve raro una vez ya hay uno creado.
  const displayStep: Exclude<Step, null> | null = step && (pathname === servicesPath ? "servicios" : step);
  // Si ya avanzó a "empleados" pero volvió a Servicios, el mensaje de "crea al menos uno" ya no aplica.
  const revisitingServicios = step === "empleados" && pathname === servicesPath;

  return (
    <OnboardingRefreshContext.Provider value={check}>
      {displayStep && (
        <div className="mx-auto max-w-5xl px-4 pt-4 md:px-8 md:pt-8">
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-accent-soft)] px-5 py-4 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center gap-2">
              {STEPS.map((s, i) => {
                const stepIndex = STEPS.findIndex((x) => x.key === displayStep);
                const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
                // "Servicios" siempre se puede revisitar; "Empleados" se habilita en cuanto
                // ya hay al menos un servicio (step dejó de ser "servicios").
                const navigable = s.key === "servicios" || step !== "servicios";
                const stepContent = (
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
                );
                return (
                  <div key={s.key} className="flex flex-1 items-center last:flex-none">
                    {navigable ? (
                      <Link href={`/app/${slug}/${s.key}`} prefetch={false} className="rounded-[var(--radius-sm)] transition-opacity hover:opacity-70">
                        {stepContent}
                      </Link>
                    ) : (
                      stepContent
                    )}
                    {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-[var(--color-ink-900)]/15" />}
                  </div>
                );
              })}
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
              {revisitingServicios ? "¡Buen primer servicio! ✨" : MESSAGES[displayStep].title}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">
              {revisitingServicios
                ? "Agrega más si quieres, o continúa más abajo para crear tus empleados."
                : MESSAGES[displayStep].description}
            </p>
          </div>
        </div>
      )}
      {children}
    </OnboardingRefreshContext.Provider>
  );
}
