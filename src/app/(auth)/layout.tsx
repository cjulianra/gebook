export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-lg font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-sm)] [background:var(--gradient-accent)]">
            B
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Belleza</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Gestión para negocios de belleza</p>
        </div>
        {children}
      </div>
    </div>
  );
}
