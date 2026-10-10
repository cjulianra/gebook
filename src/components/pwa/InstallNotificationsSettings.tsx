"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePwaStatus } from "./usePwaStatus";

/** Sección fija (no se puede descartar) para instalar la app y activar notificaciones — vive en Configuración/Mi perfil como respaldo por si se cerró el banner flotante. */
export function InstallNotificationsSettings({ memberId }: { memberId: string }) {
  const { installEvent, standalone, ios, pushSupported, permission, promptInstall, subscribeToPush } = usePwaStatus();
  const [loading, setLoading] = useState<"install" | "notify" | null>(null);

  async function handleInstall() {
    setLoading("install");
    await promptInstall();
    setLoading(null);
  }

  async function handleEnableNotifications() {
    setLoading("notify");
    await subscribeToPush(memberId);
    setLoading(null);
  }

  const canInstall = !standalone && (!!installEvent || ios);
  const notifGranted = pushSupported && permission === "granted";
  const notifBlocked = pushSupported && permission === "denied";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-900)]">Instalar la app</p>
          <p className="text-xs text-[var(--color-ink-500)]">Ábrela desde tu pantalla de inicio, como cualquier app.</p>
        </div>
        {standalone ? (
          <Badge tone="success">Instalada</Badge>
        ) : ios ? (
          <Badge tone="neutral">Compartir → Agregar a inicio</Badge>
        ) : canInstall ? (
          <Button size="sm" variant="secondary" onClick={handleInstall} disabled={loading === "install"}>
            {loading === "install" ? "Instalando…" : "Instalar"}
          </Button>
        ) : (
          <Badge tone="neutral">No disponible en este navegador</Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-900)]">Notificaciones de reservas</p>
          <p className="text-xs text-[var(--color-ink-500)]">
            {ios && !standalone
              ? "Primero instala la app en tu iPhone para poder activarlas."
              : "Te avisamos al instante cuando entre una reserva nueva."}
          </p>
        </div>
        {!pushSupported ? (
          <Badge tone="neutral">No disponible en este navegador</Badge>
        ) : notifGranted ? (
          <Badge tone="success">Activadas</Badge>
        ) : notifBlocked ? (
          <Badge tone="danger">Bloqueadas — actívalas desde el navegador</Badge>
        ) : (
          <Button size="sm" variant="secondary" onClick={handleEnableNotifications} disabled={loading === "notify" || (ios && !standalone)}>
            {loading === "notify" ? "Activando…" : "Activar"}
          </Button>
        )}
      </div>
    </div>
  );
}
