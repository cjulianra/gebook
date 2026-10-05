"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/lib/context/BusinessContext";
import { cn } from "@/lib/utils/cn";

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell({ className }: { className?: string }) {
  const { business, membership } = useBusiness();
  const router = useRouter();
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/client portal-mount guard
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .eq("business_member_id", membership.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setItems(data ?? []);
    }
    load();

    const channel = supabase
      .channel(`notifications-${membership.id}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `business_member_id=eq.${membership.id}` },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [membership.id, instanceId]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      const supabase = createClient();
      const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  }

  function handleClickItem(n: Notification) {
    setOpen(false);
    if (n.link) router.push(`/app/${business.slug}${n.link}`);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && mounted &&
        createPortal(
          <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <NotificationPanel items={items} onClickItem={handleClickItem} anchorClassName={className} />
          </>,
          document.body
        )}
    </div>
  );
}

function NotificationPanel({
  items,
  onClickItem,
}: {
  items: Notification[];
  onClickItem: (n: Notification) => void;
  anchorClassName?: string;
}) {
  return (
    <div className="fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-popover)] md:absolute md:right-0 md:top-12">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">Notificaciones</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-500)]">Sin notificaciones por ahora.</p>
      ) : (
        <div className="max-h-96 divide-y divide-[var(--color-border)] overflow-y-auto">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={cn(
                "block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-canvas)]",
                !n.read_at && "bg-[var(--color-accent-soft)]"
              )}
            >
              <p className="text-sm font-medium text-[var(--color-ink-900)]">{n.title}</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
