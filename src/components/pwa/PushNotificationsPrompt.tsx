"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const INSTALL_DISMISS_KEY = "gebook_install_dismissed";
const PUSH_DISMISS_KEY = "gebook_push_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari/iOS no tiene display-mode: standalone fiable — usa su propia bandera.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

/**
 * Banner único para instalar la app y activar notificaciones push de
 * reservas nuevas. Android/Chrome/Edge pueden instalar con un clic
 * (beforeinstallprompt); iOS/Safari no tiene esa API — ahí solo se puede
 * guiar al usuario a "Compartir → Agregar a inicio" manualmente, y además
 * Apple solo permite pedir permiso de notificaciones DESPUÉS de que la app
 * ya quedó instalada en la pantalla de inicio (modo standalone).
 */
export function PushNotificationsPrompt({ memberId }: { memberId: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only platform checks can't run during render
    setStandalone(isStandaloneDisplay());
    setIos(isIos());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstallEvent(null);
      setStandalone(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const installDismissed = !!localStorage.getItem(INSTALL_DISMISS_KEY);
    const pushDismissed = !!localStorage.getItem(PUSH_DISMISS_KEY);
    const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const permission = pushSupported ? Notification.permission : "denied";

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
  }, [standalone, ios, installEvent]);

  async function handleInstall() {
    if (!installEvent) return; // iOS: no hay prompt nativo, el banner solo muestra instrucciones
    setLoading(true);
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setLoading(false);
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setShowInstall(false);
  }

  async function handleEnableNotifications() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShowNotify(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setShowNotify(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      const supabase = createClient();
      await supabase.from("push_subscriptions").upsert(
        {
          business_member_id: memberId,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "endpoint" }
      );
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
