import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENERGIA360 — Tu Servidor Inteligente de Energía en RD",
  description:
    "Plataforma jovial e inteligente para dominar tu recibo de luz en República Dominicana (EDESUR, EDENORTE, EDEESTE y CEPM), calcular equipos, simular paneles solares y medir tu inversor.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#5865F2",
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
      <body className="min-h-screen bg-[#313338] text-[#F2F3F5] antialiased selection:bg-[#5865F2] selection:text-white">
        {children}
      </body>
    </html>
  );
}
