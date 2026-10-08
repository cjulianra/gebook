import Link from "next/link";
import { Fraunces } from "next/font/google";
import { cn } from "@/lib/utils/cn";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });

const FEATURES = [
  {
    icon: (
      <path d="M7 3v2M17 3v2M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    ),
    title: "Agenda del día a día",
    description:
      "Crea reservas tú mismo para tus clientes, o deja que ellos agenden solos — las dos entran a la misma agenda, organizada por empleado.",
  },
  {
    icon: <path d="M12 2 9.5 7l-5.5.8 4 3.9-1 5.3L12 14.5l4.9 2.5-.9-5.3 4-3.9L14.5 7 12 2Z" />,
    title: "Página pública de reservas",
    description: "Cada negocio recibe su propio link (gebook.site/tu-negocio) para que los clientes agenden solos, a cualquier hora.",
  },
  {
    icon: (
      <path d="M16 11a4 4 0 1 0-4-4M16 11a4 4 0 0 1 0 0ZM2 20c0-3.3 2.7-6 6-6M22 20c0-2.8-2-5.1-4.7-5.7M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 4c3.3 0 6 2.7 6 6H2c0-3.3 2.7-6 6-6Z" />
    ),
    title: "Empleados con su propia comisión",
    description: "Define el % de cada empleado, lleva su cuenta de pagos pendientes y controla qué puede ver o hacer cada uno.",
  },
  {
    icon: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
    title: "Reportes por período",
    description: "Ingresos, comisiones y servicios completados, filtrados por hoy, esta semana o este mes — para el negocio y para cada empleado.",
  },
  {
    icon: (
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38a9.96 9.96 0 0 0 4.79 1.22h.01c5.52 0 10-4.48 10-10s-4.48-9.84-10.01-9.84Zm4.56 14.17c-.25.34-1.1.89-1.98 1.18-.59.19-1.13.16-1.56.1-.48-.07-1.47-.6-1.67-1.18" />
    ),
    title: "WhatsApp integrado",
    description: "Envía el resumen de cada reserva al cliente, y a cada empleado su código de acceso, con un solo toque.",
  },
  {
    icon: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.7-.5a6.9 6.9 0 0 0-.6-1.5l1-1.6-1.4-1.4-1.6 1a7 7 0 0 0-1.5-.6L14 4h-2l-.5 1.7a7 7 0 0 0-1.5.6l-1.6-1L7 6.7l1 1.6a6.9 6.9 0 0 0-.6 1.5L4.8 10v2l1.7.5c.1.5.3 1 .6 1.5l-1 1.6 1.4 1.4 1.6-1c.5.3 1 .5 1.5.6L11 19h2l.5-1.7c.5-.1 1-.3 1.5-.6l1.6 1 1.4-1.4-1-1.6c.3-.5.5-1 .6-1.5l1.7-.5v-2Z" />
    ),
    title: "Acceso de empleados sin correo",
    description: "Cada empleado entra con su celular y un código de 4 dígitos — nada de contraseñas ni correos que confirmar.",
  },
];

const STEPS = [
  { n: "1", title: "Crea tu cuenta", description: "Regístrate con tu correo y dale un nombre a tu negocio." },
  { n: "2", title: "Agrega servicios y empleados", description: "Define qué ofreces, quién lo hace y su comisión." },
  { n: "3", title: "Comparte tu link", description: "Tu página pública de reservas queda lista al instante." },
  { n: "4", title: "Recibe reservas", description: "Gestiona tu agenda día a día, desde el computador o el celular." },
];

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {children}
    </svg>
  );
}

function PhoneFrame({
  src,
  alt,
  className,
  matchHeight,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Recorta por abajo a una altura fija compartida, para que varios celulares en fila
      se vean del mismo tamaño sin forzar un aspect-ratio que corte texto a los lados. */
  matchHeight?: boolean;
}) {
  return (
    <div className={cn("relative mx-auto w-[220px] shrink-0 sm:w-[240px]", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-[1.3rem] border-[7px] border-[var(--color-ink-900)] bg-[var(--color-ink-900)] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-ink-900)]/15",
          matchHeight && "h-[355px] sm:h-[388px]"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- mockups son archivos estáticos en /public */}
        <img src={src} alt={alt} className="block h-auto w-full" />
      </div>
    </div>
  );
}

function DesktopFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[var(--radius-md)] border-[7px] border-[var(--color-ink-900)] bg-[var(--color-ink-900)] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-ink-900)]/15">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- mockups are static files in /public, not remote/optimizable content */}
      <img src={src} alt={alt} className="block h-auto w-full" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={cn("gradient-canvas min-h-screen", fraunces.variable)}>
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in /public */}
        <img src="/landing/logo-gebook.png" alt="Gebook" className="h-7 w-auto" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-white/50"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-sm)] [background:var(--gradient-accent)]"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 sm:px-8 md:grid-cols-2 md:gap-8 md:pb-28 md:pt-12">
        <div>
          <p className="mb-4 inline-flex items-center rounded-[var(--radius-pill)] bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--color-accent-ink)]">
            Para salones, barberías y spas
          </p>
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-balance text-4xl font-semibold leading-[1.1] text-[var(--color-ink-900)] sm:text-5xl"
          >
            Tu negocio de belleza, organizado de principio a fin
          </h1>
          <p className="mt-5 max-w-md text-balance text-lg text-[var(--color-ink-700)]">
            Agenda, empleados, comisiones, reportes y reservas públicas para tus clientes — todo en un solo lugar, pensado para
            salones, barberías, spas y estudios de belleza.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-[var(--radius-pill)] px-6 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-md)] [background:var(--gradient-accent-strong)]"
            >
              Crea tu cuenta gratis
            </Link>
            <a
              href="#funciona"
              className="rounded-[var(--radius-pill)] px-6 py-3 text-sm font-medium text-[var(--color-ink-700)] hover:bg-white/50"
            >
              Ver cómo funciona ↓
            </a>
          </div>
          <p className="mt-5 text-xs text-[var(--color-ink-500)]">Tu página de reservas queda lista en minutos.</p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <PhoneFrame src="/landing/mock-public.png" alt="Página pública de reservas" className="z-10 rotate-[-4deg]" />
          <PhoneFrame src="/landing/mock-agenda.png" alt="Agenda del negocio" className="-ml-10 hidden translate-y-6 rotate-[4deg] sm:block" />
        </div>
      </section>

      {/* Features */}
      <section id="funciones" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Todo lo que tu negocio necesita
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">Sin planillas sueltas, sin WhatsApp perdido entre chats — un solo sistema para administrar tu día a día.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent-ink)] [background:var(--gradient-accent)]">
                <FeatureIcon>{f.icon}</FeatureIcon>
              </div>
              <h2 className="font-semibold text-[var(--color-ink-900)]">{f.title}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-ink-500)]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Así se ve por dentro
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Tu negocio puede crear reservas directo desde la Agenda, y al mismo tiempo tus clientes reservan solos desde su propio link —
            las dos vías alimentan la misma agenda.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="text-center">
            <PhoneFrame src="/landing/mock-agenda.png" alt="Agenda del negocio" matchHeight />
            <h2 className="mt-5 font-semibold text-[var(--color-ink-900)]">Agenda del negocio</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">Crea reservas tú mismo y envía el resumen por WhatsApp a cada cliente.</p>
          </div>
          <div className="text-center">
            <PhoneFrame src="/landing/mock-public.png" alt="Página pública de reservas" matchHeight />
            <h2 className="mt-5 font-semibold text-[var(--color-ink-900)]">Reserva pública</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">Tus clientes también pueden reservar solos, 24/7, sin crear una cuenta.</p>
          </div>
          <div className="text-center">
            <PhoneFrame src="/landing/mock-reportes.png" alt="Reportes del negocio" matchHeight />
            <h2 className="mt-5 font-semibold text-[var(--color-ink-900)]">Reportes del negocio</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">Ingresos, comisiones y rendimiento por empleado, de un vistazo.</p>
          </div>
        </div>
      </section>

      {/* Desktop showcase */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Software de gestión para tu negocio de belleza, también desde el computador
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Administra la agenda de todo tu equipo, crea reservas para tus clientes y lleva el control del negocio desde cualquier pantalla.
          </p>
        </div>
        <DesktopFrame src="/landing/mock-desktop-agenda.png" alt="Agenda del negocio en computador" />
      </section>

      {/* How it works */}
      <section id="funciona" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Empieza en cuatro pasos
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ink-900)] text-sm font-semibold text-white">
                {s.n}
              </div>
              <h2 className="font-semibold text-[var(--color-ink-900)]">{s.title}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-ink-500)]">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 md:py-24">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-8 py-14 shadow-[var(--shadow-sm)]">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Tu negocio merece algo mejor que una libreta
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--color-ink-700)]">
            Crea tu cuenta gratis y ten tu agenda, tu equipo y tu página de reservas listos hoy mismo.
          </p>
          <Link
            href="/register"
            className="mt-7 inline-block rounded-[var(--radius-pill)] px-7 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-md)] [background:var(--gradient-accent-strong)]"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-8 text-sm text-[var(--color-ink-500)] sm:flex-row sm:px-8">
        <span>© {new Date().getFullYear()} Gebook</span>
        <Link href="/login" className="hover:text-[var(--color-ink-700)]">
          Iniciar sesión
        </Link>
      </footer>
    </div>
  );
}
