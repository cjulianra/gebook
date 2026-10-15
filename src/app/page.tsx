import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { cn } from "@/lib/utils/cn";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Software para Salones de Belleza",
  description:
    "Gestiona las citas, empleados, comisiones y servicios de tu salón de belleza desde un solo lugar. Ofrece reservas online y organiza tu negocio con Gebook.",
};

const FEATURES = [
  {
    icon: (
      <path d="M7 3v2M17 3v2M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    ),
    title: "Agenda de citas por empleado",
    description:
      "Organiza las reservas de tu salón por profesional, consulta los horarios disponibles y gestiona las citas desde una agenda compartida. También puedes permitir que tus clientes reserven directamente desde el enlace de tu negocio.",
  },
  {
    icon: <path d="M12 2 9.5 7l-5.5.8 4 3.9-1 5.3L12 14.5l4.9 2.5-.9-5.3 4-3.9L14.5 7 12 2Z" />,
    title: "Reservas online las 24 horas",
    description:
      "Comparte tu página de reservas para que tus clientes elijan los servicios y horarios disponibles sin necesidad de crear una cuenta. Las reservas se incorporan a la agenda del negocio.",
  },
  {
    icon: (
      <path d="M16 11a4 4 0 1 0-4-4M16 11a4 4 0 0 1 0 0ZM2 20c0-3.3 2.7-6 6-6M22 20c0-2.8-2-5.1-4.7-5.7M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 4c3.3 0 6 2.7 6 6H2c0-3.3 2.7-6 6-6Z" />
    ),
    title: "Control de empleados y comisiones",
    description:
      "Configura las comisiones de cada empleado, administra sus permisos y consulta los servicios realizados y las liquidaciones pendientes. Mantén la información organizada para que el cálculo de las comisiones no dependa de hojas de cálculo.",
  },
  {
    icon: (
      <path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm0 5h1M6 12h1M6 16h1M10 8h7M10 12h7M10 16h4" />
    ),
    title: "Registro de servicios realizados",
    description:
      "Registra los servicios que se atendieron fuera de la agenda o que no se anotaron a tiempo. Revisa las anotaciones de tu equipo y aprueba los registros antes de que se reflejen en los reportes y las comisiones.",
  },
  {
    icon: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
    title: "Reportes para conocer el rendimiento del negocio",
    description:
      "Consulta los ingresos registrados, los servicios completados y las comisiones por periodo y empleado. Revisa el desempeño de tu negocio con información centralizada y actualizada según los registros del sistema.",
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    title: "Historial y seguimiento de las reservas",
    description:
      "Mantén las reservas y los servicios realizados organizados para consultar la actividad del negocio y hacer seguimiento a la operación diaria.",
  },
];

const SHOWCASE = [
  {
    image: "/landing/mock-agenda.png",
    alt: "Agenda de citas para salones de belleza",
    title: "Agenda de citas para salones de belleza",
    intro:
      "Organiza las reservas de tu negocio en una agenda centralizada, con los servicios y empleados correspondientes. Crea citas manualmente, consulta las próximas atenciones y marca los servicios completados para mantener la información de tu equipo al día.",
    bullets: [
      "Crea y administra reservas para tus clientes en segundos.",
      "Consulta las citas organizadas por empleado.",
      "Envía los detalles de cada reserva por WhatsApp.",
      "Lleva el seguimiento de los servicios realizados.",
    ],
  },
  {
    image: "/landing/mock-public.png",
    alt: "Sistema de reservas online para salones de belleza",
    title: "Sistema de reservas online para tus clientes",
    intro:
      "Dale a tu negocio una página de reservas online con su propio enlace. Compártelo por WhatsApp, Instagram o tus otros canales para que tus clientes puedan consultar los servicios y reservar cuando lo necesiten, incluso fuera de tu horario de atención.",
    bullets: [
      "Permite reservar sin necesidad de crear una cuenta.",
      "Ofrece la posibilidad de seleccionar varios servicios en una misma reserva.",
      "Muestra el precio total antes de confirmar.",
      "Centraliza las reservas online y las citas creadas desde tu negocio.",
    ],
  },
  {
    image: "/landing/mock-empleados.png",
    alt: "Control de empleados y comisiones",
    title: "Control de empleados y comisiones",
    intro:
      "Gestiona el equipo de tu salón de belleza o barbería con mayor claridad. Configura las comisiones de cada empleado y consulta los valores pendientes de pago, los servicios realizados y la información que corresponde a cada integrante del equipo.",
    bullets: [
      "Define el porcentaje de comisión de cada empleado.",
      "Consulta los servicios completados por persona.",
      "Lleva el control de las comisiones pendientes.",
      "Administra los permisos de acceso según las funciones de cada empleado.",
    ],
  },
  {
    image: "/landing/mock-reportes.png",
    alt: "Reportes de ingresos y servicios por empleado",
    title: "Reportes de ingresos y servicios por empleado",
    intro:
      "Consulta el rendimiento de tu negocio con reportes de ingresos, comisiones y servicios completados. Filtra la información por día, semana o mes para entender mejor la actividad de tu salón y revisar los resultados individuales de tu equipo.",
    bullets: [
      "Consulta los ingresos y las comisiones registradas.",
      "Filtra los resultados por período.",
      "Revisa la actividad de cada empleado.",
      "Compara los resultados del equipo desde un mismo panel.",
    ],
  },
  {
    image: "/landing/mock-cuaderno-admin.png",
    alt: "Registro diario de servicios",
    title: "Registro diario de servicios: no pierdas ninguna venta",
    intro:
      "Registra los servicios que se realizaron fuera de la agenda para mantener un control más completo de la actividad del negocio. Los empleados pueden enviar sus anotaciones con el cliente, el valor y la fecha; después, el administrador puede aprobarlas o rechazarlas antes de que se reflejen en las comisiones y los reportes.",
    bullets: [
      "Registra los servicios realizados que no estaban en la agenda.",
      "Revisa y aprueba las anotaciones de cada empleado.",
      "Consulta los registros por empleado o por día.",
      "Visualiza el total de cada jornada sin hacer los cálculos manualmente.",
    ],
  },
];

const STEPS = [
  { n: "1", title: "Crea la cuenta de tu negocio", description: "Registra tu negocio y configura el espacio desde el que administrarás la operación." },
  {
    n: "2",
    title: "Agrega tus servicios y empleados",
    description: "Define los servicios que ofreces, sus precios, los profesionales que los realizan y sus comisiones.",
  },
  {
    n: "3",
    title: "Comparte tu página de reservas",
    description: "Envía el enlace a tus clientes para que puedan consultar la disponibilidad y elegir sus servicios.",
  },
  {
    n: "4",
    title: "Administra la actividad diaria",
    description: "Organiza las citas, registra los servicios realizados y consulta los reportes de tu negocio desde el celular o el computador.",
  },
];

const FAQS = [
  {
    q: "¿Qué es Gebook?",
    a: "Gebook es una plataforma para gestionar la operación de salones de belleza, peluquerías y barberías. Reúne agenda de citas, reservas online, empleados, comisiones, registro de servicios y reportes.",
  },
  {
    q: "¿Mis clientes pueden reservar sin crear una cuenta?",
    a: "Sí. Cada negocio tiene una página pública de reservas que puede compartir con sus clientes. Desde allí pueden seleccionar servicios y horarios disponibles sin registrarse.",
  },
  {
    q: "¿Puedo administrar las citas de varios empleados?",
    a: "Sí. La agenda permite organizar las reservas por empleado y gestionar las citas del equipo desde un mismo lugar.",
  },
  {
    q: "¿Cómo puedo controlar las comisiones de mis empleados?",
    a: "Puedes configurar la comisión de cada empleado y consultar los servicios que se han completado o aprobado, junto con los reportes correspondientes.",
  },
  {
    q: "¿Qué ocurre con los servicios que no se registraron en la agenda?",
    a: "Puedes utilizar el Cuaderno para registrar servicios realizados fuera de la agenda. El administrador revisa las anotaciones y aprueba o rechaza cada registro antes de que cuente para las comisiones y los reportes.",
  },
  {
    q: "¿Puedo usar Gebook desde el celular y el computador?",
    a: "Sí. Gebook está diseñado para utilizarse desde el celular o el computador, y puede instalarse como una aplicación web progresiva (PWA) en dispositivos compatibles.",
  },
  {
    q: "¿Para qué tipos de negocio está pensado Gebook?",
    a: "Está pensado para salones de belleza, peluquerías, barberías, spas y otros negocios de belleza que necesiten organizar sus citas y controlar la actividad de su equipo.",
  },
];

const BENEFITS = [
  { title: "Organiza las citas", description: "consulta quién atiende cada servicio y cuándo." },
  { title: "Reduce los registros dispersos", description: "reúne los servicios agendados y las anotaciones del Cuaderno." },
  { title: "Controla las comisiones", description: "revisa qué servicios se han aprobado y qué corresponde a cada empleado." },
  { title: "Consulta los resultados", description: "revisa los servicios y las cifras registradas por periodo." },
  { title: "Facilita las reservas", description: "comparte un enlace para que tus clientes puedan agendar por su cuenta." },
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
  wide,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Recorta por abajo a una altura fija compartida, para que varios celulares en fila
      se vean del mismo tamaño sin forzar un aspect-ratio que corte texto a los lados. */
  matchHeight?: boolean;
  /** Ocupa todo el ancho disponible (hasta un máximo mayor) en vez del tamaño fijo
      de celular pequeño — para cuando el pantallazo es el protagonista de su mitad de fila. */
  wide?: boolean;
}) {
  return (
    <div className={cn("relative mx-auto shrink-0", wide ? "w-full max-w-[300px] sm:max-w-[380px]" : "w-[220px] sm:w-[240px]", className)}>
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
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
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
            Software para salones de belleza, peluquerías y barberías
          </h1>
          <p className="mt-5 max-w-md text-balance text-lg text-[var(--color-ink-700)]">
            Organiza las citas, administra tu equipo y controla las comisiones desde un solo lugar. Con Gebook puedes gestionar los
            servicios de tu negocio y permitir que tus clientes reserven online, sin depender de cuadernos ni conversaciones
            dispersas.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-[var(--radius-pill)] px-6 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-md)] [background:var(--gradient-accent-strong)]"
            >
              Comenzar gratis
            </Link>
            <a
              href="#funciona"
              className="rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
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
            Gestiona tu salón de belleza desde un solo lugar
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Deja atrás los registros dispersos y reúne la operación diaria de tu negocio en una plataforma. Organiza la agenda,
            administra los servicios, lleva el control de tus empleados y consulta los resultados de tu salón sin reconstruir la
            información al final del día.
          </p>
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
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Conoce el software de gestión para salones de belleza
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Administra tu salón de belleza, barbería o spa desde una sola plataforma. Organiza las citas, gestiona a tus
            empleados, controla las comisiones y consulta los resultados de tu negocio. Con Gebook, tú y tus clientes pueden
            crear reservas desde una misma agenda, sin depender de mensajes dispersos o registros en papel.
          </p>
        </div>

        <div className="flex flex-col gap-20">
          {SHOWCASE.map((item, i) => (
            <div key={item.title} className={cn("flex flex-col items-center gap-10 md:flex-row md:gap-12", i % 2 === 1 && "md:flex-row-reverse")}>
              <div className="flex w-full justify-center md:w-1/2">
                <PhoneFrame src={item.image} alt={item.alt} wide />
              </div>
              <div className="w-full md:w-1/2">
                <h3 style={{ fontFamily: "var(--font-display)" }} className="text-center text-2xl font-semibold text-[var(--color-ink-900)] md:text-left">
                  {item.title}
                </h3>
                <p className="mt-3 text-center text-[var(--color-ink-700)] md:text-left">{item.intro}</p>
                <ul className="mt-4 space-y-2.5">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-[var(--color-ink-700)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--gradient-accent-strong)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Desktop showcase */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Administra tu salón de belleza desde el computador o el celular
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Accede a la gestión de tu negocio desde diferentes dispositivos. Organiza las citas, administra a tus empleados y
            consulta la información de tu salón sin depender de un único computador o de una libreta para llevar los registros.
          </p>
        </div>
        <DesktopFrame src="/landing/mock-desktop-agenda.png" alt="Agenda del negocio en computador" />
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Menos trabajo administrativo, más control de tu negocio
          </h2>
          <p className="mt-3 text-[var(--color-ink-700)]">
            Gebook conecta la agenda, el equipo y los servicios realizados para que la información no quede repartida entre
            libretas, mensajes y archivos separados.
          </p>
        </div>
        <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-ink)] [background:var(--gradient-accent)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <p className="text-sm text-[var(--color-ink-700)]">
                <span className="font-semibold text-[var(--color-ink-900)]">{b.title}:</span> {b.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="funciona" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Empieza a gestionar tu salón de belleza con Gebook
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

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 md:py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Preguntas frecuentes sobre el software para salones de belleza
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-5 open:bg-white/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--color-ink-900)]">
                {item.q}
                <span className="shrink-0 text-xl text-[var(--color-ink-400)] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--color-ink-700)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 md:py-24">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-8 py-14 shadow-[var(--shadow-sm)]">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
            Dedica menos tiempo a organizar y más tiempo a tu negocio
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--color-ink-700)]">
            Centraliza las reservas, los servicios y la gestión de tu equipo en Gebook. Empieza a organizar tu negocio de belleza
            desde un solo lugar.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-block rounded-[var(--radius-pill)] px-7 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-md)] [background:var(--gradient-accent-strong)]"
            >
              Crear mi cuenta
            </Link>
            <a
              href="https://wa.me/573044460871"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] px-7 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Contactar asesor
            </a>
          </div>
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
