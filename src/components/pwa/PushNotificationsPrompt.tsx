"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "gebook_push_dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Banner discreto para activar notificaciones push de nuevas reservas — solo aparece si el navegador las soporta y el usuario no las ha activado ni descartado el aviso antes. */
export function PushNotificationsPrompt({ memberId }: { memberId: string }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only checks (Notification/localStorage) can't run during render
    setVisible(true);
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setVisible(false);
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
      setVisible(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-popover)] md:left-auto md:right-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink-900)]">Activa las notificaciones</p>
        <p className="text-xs text-[var(--color-ink-500)]">Te avisamos al instante cuando entre una reserva nueva.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={handleDismiss} className="text-xs font-medium text-[var(--color-ink-500)] hover:underline">
          Ahora no
        </button>
        <Button size="sm" onClick={handleEnable} disabled={loading}>
          {loading ? "Activando…" : "Activar"}
        </Button>
      </div>
    </div>
  );
}
