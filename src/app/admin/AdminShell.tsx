"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function AdminShell({ fullName, email, children }: { fullName: string; email: string; children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="gradient-canvas min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">Gebook · Panel de administración</p>
            <p className="text-xs text-[var(--color-ink-500)]">
              {fullName} · {email}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
