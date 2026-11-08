import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ENERGIA360 — Inteligencia Energética y Gestión Eléctrica Integral en RD",
  description:
    "Plataforma corporativa y residencial de gestión eléctrica, auditoría de facturas SIE (EDESUR, EDENORTE, EDEESTE y CEPM), simulación de equipos, dimensionamiento solar e inversores en República Dominicana.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#091197",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${plusJakarta.className} min-h-screen bg-white text-[#091197] antialiased selection:bg-[#03A9EC] selection:text-white`}
      >
        {/* Franja superior corporativa .safe-top estilo GrupaMar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#091197] z-50 pointer-events-none" />
        {children}
      </body>
    </html>
  );
}
