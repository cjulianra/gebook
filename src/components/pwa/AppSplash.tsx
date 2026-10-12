"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import icon from "@/app/icon.png";

/**
 * Pantalla de apertura breve — se ve apenas se carga/abre la app (sobre todo
 * útil en el arranque "en frío" de la PWA instalada, cuando la pantalla
 * blanca de carga del navegador se nota más). Se desvanece sola en cuanto el
 * cliente termina de hidratar; con un mínimo de tiempo visible para que no
 * sea un parpadeo imperceptible en conexiones rápidas.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 350);
    const hideTimer = setTimeout(() => setVisible(false), 600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 250ms ease-out",
        background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <Image src={icon} alt="" width={64} height={64} className="animate-pulse rounded-[18px] shadow-[var(--shadow-sm)]" priority />
      </div>
    </div>
  );
}
