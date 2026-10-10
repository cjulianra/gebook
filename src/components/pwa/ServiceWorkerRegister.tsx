"use client";

import { useEffect } from "react";

/** Registra el service worker una sola vez por sesión de navegador — necesario tanto para instalar la PWA como para recibir push. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
