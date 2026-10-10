import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:info@gebook.site",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

async function sendPushToMembers(memberIds: string[], payload: PushPayload) {
  if (memberIds.length === 0) return;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*").in("business_member_id", memberIds);
  if (!subs || subs.length === 0) return;

  // El número en el globo rojo del ícono de la app debe reflejar las
  // notificaciones SIN LEER de cada destinatario, no un contador global —
  // por eso se calcula uno por miembro antes de enviarle su push.
  const unreadByMember = new Map<string, number>();
  await Promise.all(
    memberIds.map(async (id) => {
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("business_member_id", id)
        .is("read_at", null);
      unreadByMember.set(id, count ?? 0);
    })
  );

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const badgeCount = unreadByMember.get(sub.business_member_id) ?? undefined;
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...payload, badgeCount })
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // La suscripción ya no existe del lado del navegador (desinstaló la
        // app, borró datos, etc.) — limpiarla para no seguir intentando.
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

/**
 * Notifica de una reserva nueva a los administradores/dueño del negocio y al
 * empleado asignado — tanto por push (si tienen la app instalada y activaron
 * notificaciones) como dejando la notificación en la campanita de la app.
 * `excludeMemberId` evita auto-notificar a quien acaba de crear la reserva
 * (por ejemplo, un admin registrando su propia cita).
 */
export async function notifyNewBooking(
  businessId: string,
  employeeIds: string[],
  payload: PushPayload,
  options?: { excludeMemberId?: string }
) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  const recipientIds = Array.from(new Set([...(admins ?? []).map((a) => a.id), ...employeeIds])).filter(
    (id) => id !== options?.excludeMemberId
  );
  if (recipientIds.length === 0) return;

  await admin.from("notifications").insert(
    recipientIds.map((id) => ({
      business_id: businessId,
      business_member_id: id,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
    }))
  );

  await sendPushToMembers(recipientIds, payload);
}
