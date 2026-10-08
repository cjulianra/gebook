export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in /public */}
          <img src="/landing/logo-gebook.png" alt="Gebook" className="mx-auto mb-3 h-8 w-auto" />
          <p className="text-sm text-[var(--color-ink-500)]">Tus reservas, en un solo lugar</p>
        </div>
        {children}
      </div>
    </div>
  );
}
