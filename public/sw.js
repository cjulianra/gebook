// Service worker de Gebook: solo existe para habilitar la instalación como
// PWA y recibir notificaciones push — no cachea nada (cada navegación va a
// la red), así los datos de reservas nunca quedan desactualizados.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Gebook", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Gebook", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: payload.link || "/app" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(link) && "focus" in client) return client.focus();
      }
      for (const client of clientList) {
        if ("navigate" in client && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
