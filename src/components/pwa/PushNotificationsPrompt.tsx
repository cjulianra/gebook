"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePwaStatus } from "./usePwaStatus";

const INSTALL_DISMISS_KEY = "gebook_install_dismissed";
const PUSH_DISMISS_KEY = "gebook_push_dismissed";

/**
 * Banner único para instalar la app y activar notificaciones push de
 * reservas nuevas. Se puede descartar — queda disponible de nuevo desde
 * Configuración > Instalación y notificaciones si se cambia de opinión.
 */
export function PushNotificationsPrompt({ memberId }: { memberId: string }) {
  const { installEvent, standalone, ios, pushSupported, permission, promptInstall, subscribeToPush } = usePwaStatus();
  const [showInstall, setShowInstall] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const installDismissed = !!localStorage.getItem(INSTALL_DISMISS_KEY);
    const pushDismissed = !!localStorage.getItem(PUSH_DISMISS_KEY);

    if (!standalone && (installEvent || ios) && !installDismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from browser-only state computed above
      setShowInstall(true);
      setShowNotify(false);
      return;
    }
    // En iOS, pedir el permiso solo tiene efecto una vez instalada (modo standalone).
    if (standalone && pushSupported && permission === "default" && !pushDismissed) {
      setShowNotify(true);
      setShowInstall(false);
      return;
    }
    setShowInstall(false);
    setShowNotify(false);
  }, [standalone, ios, installEvent, pushSupported, permission]);

  async function handleInstall() {
    setLoading(true);
    await promptInstall();
    setLoading(false);
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setShowInstall(false);
  }

  async function handleEnableNotifications() {
    setLoading(true);
    try {
      await subscribeToPush(memberId);
    } finally {
      setLoading(false);
      setShowNotify(false);
    }
  }

  function dismissNotify() {
    localStorage.setItem(PUSH_DISMISS_KEY, "1");
    setShowNotify(false);
  }

  if (!showInstall && !showNotify) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-popover)] md:left-auto md:right-4">
      {showInstall ? (
        ios ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-ink-900)]">Instala Gebook en tu iPhone</p>
            <p className="text-xs text-[var(--color-ink-500)]">
              Toca el botón <span className="font-semibold">Compartir</span> (el cuadrito con la flecha hacia arriba) y luego{" "}
              <span className="font-semibold">&quot;Agregar a inicio&quot;</span>. Así la abres como una app y te llegan las
              notificaciones de reservas nuevas.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={dismissInstall} className="text-xs font-medium text-[var(--color-ink-500)] hover:underline">
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink-900)]">Instala la app</p>
              <p className="text-xs text-[var(--color-ink-500)]">Ábrela como una app y recibe notificaciones de reservas nuevas.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={dismissInstall} className="text-xs font-medium text-[var(--color-ink-500)] hover:underline">
                Ahora no
              </button>
              <Button size="sm" onClick={handleInstall} disabled={loading}>
                {loading ? "Instalando…" : "Instalar"}
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink-900)]">Activa las notificaciones</p>
            <p className="text-xs text-[var(--color-ink-500)]">Te avisamos al instante cuando entre una reserva nueva.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={dismissNotify} className="text-xs font-medium text-[var(--color-ink-500)] hover:underline">
              Ahora no
            </button>
            <Button size="sm" onClick={handleEnableNotifications} disabled={loading}>
              {loading ? "Activando…" : "Activar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
