import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Energia360 — Inteligencia Energética para República Dominicana",
  description:
    "Entiende tu consumo. Controla tu energía. Reduce tus gastos. La plataforma inteligente de ahorro eléctrico, paneles solares e inversores para hogares y negocios en RD.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.svg",
    apple: "/icons/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F5F7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-DO">
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-[#0071E3] selection:text-white">
        {children}
      </body>
    </html>
  );
}
