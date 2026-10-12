/**
 * Cargador de página completa — usado por los `loading.tsx` de cada sección
 * (se muestra automáticamente mientras Next.js resuelve los datos del
 * servidor para la ruta a la que se está navegando) y por el splash inicial
 * de apertura de la app.
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8">
      <Spinner />
      {label && <p className="text-sm font-medium text-[var(--color-ink-500)]">{label}</p>}
    </div>
  );
}

export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Cargando"
    >
      <circle cx="12" cy="12" r="9.5" stroke="var(--color-border-strong)" strokeWidth="2.5" />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
