import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Gebook — Gestión para negocios de belleza";
const description = "Agenda, empleados, comisiones, reportes y reservas públicas para salones, barberías y spas — todo en un solo lugar.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gebook.site"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://gebook.site",
    siteName: "Gebook",
    images: [{ url: "/og-image.png", width: 780, height: 780 }],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
