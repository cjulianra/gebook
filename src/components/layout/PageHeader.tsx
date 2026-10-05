export function PageHeader({ title, description, action }: { title: React.ReactNode; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--color-ink-500)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
