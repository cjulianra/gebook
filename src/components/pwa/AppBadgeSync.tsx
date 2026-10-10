"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function applyBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (!nav.setAppBadge || !nav.clearAppBadge) return;
  if (count > 0) nav.setAppBadge(count).catch(() => {});
  else nav.clearAppBadge().catch(() => {});
}

/** Mantiene el numerito del ícono de la app sincronizado con las notificaciones sin leer mientras la app está abierta (el push ya lo actualiza cuando está cerrada). */
export function AppBadgeSync({ memberId }: { memberId: string }) {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function syncCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("business_member_id", memberId)
        .is("read_at", null);
      if (!cancelled) applyBadge(count ?? 0);
    }
    syncCount();

    const channel = supabase
      .channel(`app-badge-${memberId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `business_member_id=eq.${memberId}` }, () => {
        syncCount();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [memberId]);

  return null;
}
