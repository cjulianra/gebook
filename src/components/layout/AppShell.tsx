"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { NAV_ITEMS } from "./nav-items";
import { NavIcon } from "./icons";
import { useBusiness } from "@/lib/context/BusinessContext";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

// En mobile solo caben unos pocos tabs abajo; el resto vive detrás del menú hamburguesa.
const PRIMARY_MOBILE_HREFS = ["reservas", "clientes", "reportes"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { business, membership, profile, onboardingStep } = useBusiness();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(membership.role));
  const primaryItems = items.filter((item) => PRIMARY_MOBILE_HREFS.includes(item.href));
  const moreItems = items.filter((item) => !PRIMARY_MOBILE_HREFS.includes(item.href));
  const base = `/app/${business.slug}`;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="gradient-canvas min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col px-3 py-4 md:flex">
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] p-1.5">
          <BusinessMark name={business.name} logoUrl={business.logo_url} size={88} fill />
        </div>

        <nav className="flex-1 space-y-1 py-4">
          {items.map((item) => {
            const href = `${base}/${item.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                prefetch={onboardingStep ? false : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-pill)] px-4 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[var(--color-ink-900)] text-white shadow-[var(--shadow-sm)]"
                    : "text-[var(--color-ink-700)] hover:bg-white/50"
                )}
              >
                <NavIcon name={item.icon} className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)]/70 p-2 text-left shadow-[var(--shadow-sm)] hover:bg-[var(--color-surface)]"
          >
            <Avatar name={profile.full_name} src={profile.avatar_url} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{profile.full_name}</p>
              <p className="truncate text-xs capitalize text-[var(--color-ink-500)]">{roleLabel(membership.role)}</p>
            </div>
          </button>
          {menuOpen && (
            <button
              onClick={handleLogout}
              className="absolute inset-x-0 bottom-16 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-left text-sm text-[var(--color-ink-700)] shadow-[var(--shadow-popover)] hover:bg-[var(--color-canvas)]"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="relative flex items-center justify-between px-4 py-3 md:hidden">
        <div className="flex items-center rounded-[var(--radius-md)] bg-[var(--color-surface)]/80 px-2 py-1.5 shadow-[var(--shadow-sm)]">
          <BusinessMark name={business.name} logoUrl={business.logo_url} size={44} fill />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell className="rounded-full bg-[var(--color-surface)]/80 shadow-[var(--shadow-sm)]" />
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)]/80 text-[var(--color-ink-700)] shadow-[var(--shadow-sm)]"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex rounded-[var(--radius-pill)] bg-[var(--color-surface)]/95 px-1 py-1 shadow-[var(--shadow-popover)] md:hidden">
        {primaryItems.map((item) => {
          const href = `${base}/${item.href}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              prefetch={onboardingStep ? false : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-pill)] py-2 text-[10px] font-medium transition-colors",
                active ? "bg-[var(--color-ink-900)] text-white" : "text-[var(--color-ink-500)]"
              )}
            >
              <NavIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <MoreMenuPanel
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        base={base}
        pathname={pathname}
        onLogout={handleLogout}
        noPrefetch={!!onboardingStep}
      />
    </div>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function MoreMenuPanel({
  open,
  onClose,
  items,
  base,
  pathname,
  onLogout,
  noPrefetch,
}: {
  open: boolean;
  onClose: () => void;
  items: typeof NAV_ITEMS;
  base: string;
  pathname: string | null;
  onLogout: () => void;
  noPrefetch?: boolean;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-[var(--color-ink-900)]/40" onClick={onClose} />
      <div className="absolute right-4 top-16 w-56 space-y-1 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-popover)]">
        {items.map((item) => {
          const href = `${base}/${item.href}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              onClick={onClose}
              prefetch={noPrefetch ? false : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-[var(--color-ink-900)] text-white" : "text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
              )}
            >
              <NavIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {items.length > 0 && <div className="my-1 h-px bg-[var(--color-border)]" />}
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
        >
          <LogoutIcon className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>,
    document.body
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function roleLabel(role: string) {
  if (role === "owner") return "Propietario";
  if (role === "admin") return "Administrador";
  return "Empleado";
}

export function BusinessMark({
  name,
  logoUrl,
  size,
  rounded = "sm",
  fill = false,
}: {
  name: string;
  logoUrl: string | null;
  size: number;
  rounded?: "sm" | "full";
  /** El contenedor padre ya aporta el padding; el logo ocupa todo el alto disponible. */
  fill?: boolean;
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-[var(--radius-sm)]";
  if (logoUrl) {
    // Los logos suelen ser horizontales: se muestran completos (sin recortar),
    // solos (sin nombre al lado), con una esquina apenas redondeada — no el
    // óvalo/círculo de `rounded="full"`, que recortaría un logo horizontal.
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- logo lives in Supabase Storage, a dynamic external host
        <img src={logoUrl} alt={name} className="w-full rounded-[8px] object-contain" style={{ height: size }} />
      );
    }
    return (
      <div className="flex shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-surface)] px-3 py-2.5" style={{ height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo lives in Supabase Storage, a dynamic external host */}
        <img src={logoUrl} alt={name} className="h-full w-auto object-contain" style={{ minWidth: size - 20 }} />
      </div>
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center font-semibold text-[var(--color-accent-ink)] [background:var(--gradient-accent)]", radius)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
