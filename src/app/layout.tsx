import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENERGIA360 | Inteligencia Energética y Optimización para República Dominicana",
  description:
    "Entiende tu consumo. Controla tu energía. Reduce tus gastos. Plataforma independiente Local-First y Zero-Access para hogares y empresas en República Dominicana y Latinoamérica.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.svg",
    apple: "/icons/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#060D1E",
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
      <body className="min-h-screen bg-[#060D1E] text-slate-100 selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

