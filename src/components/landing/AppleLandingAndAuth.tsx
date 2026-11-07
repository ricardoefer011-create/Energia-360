"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Check,
  Copy,
  FileSpreadsheet,
  Flame,
  Hash,
  KeyRound,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import { Energia360Logo } from "@/components/brand/Energia360Logo";
import {
  TEST_USER_ACCOUNTS,
  TestAccountPresetId,
} from "@/lib/data/rd-energy-catalog";

interface AppleLandingAndAuthProps {
  onEnterWithTestAccount: (presetId: TestAccountPresetId) => void;
  onStartPersonalWorkspace: () => void;
  hasExistingEncryptedVault: boolean;
  onOpenVaultUnlock: () => void;
}

export function AppleLandingAndAuth({
  onEnterWithTestAccount,
  onStartPersonalWorkspace,
  hasExistingEncryptedVault,
  onOpenVaultUnlock,
}: AppleLandingAndAuthProps) {
  const [selectedPreset, setSelectedPreset] = useState<TestAccountPresetId>(
    "hogar_santo_domingo"
  );
  const [emailInput, setEmailInput] = useState("demo.hogar@energia360.do");
  const [passwordInput, setPasswordInput] = useState("DemoRD2026!");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleSelectPresetCard(presetId: TestAccountPresetId) {
    setSelectedPreset(presetId);
    const found = TEST_USER_ACCOUNTS.find((a) => a.id === presetId);
    if (found) {
      setEmailInput(found.email);
      setPasswordInput(found.password);
    }
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  }

  function handleFormLogin(e: React.FormEvent) {
    e.preventDefault();
    const matched = TEST_USER_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === emailInput.trim().toLowerCase()
    );
    if (matched) {
      onEnterWithTestAccount(matched.id);
    } else {
      onEnterWithTestAccount(selectedPreset);
    }
  }

  return (
    <div className="min-h-screen bg-[#23272A] text-white flex flex-col overflow-x-hidden">
      {/* ================= HERO ESTILO DISCORD.COM (#404EED) ================= */}
      <div className="discord-hero-bg discord-stars relative overflow-hidden">
        {/* Blobs decorativos orgánicos no lineales */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#EB459E]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-32 -right-28 w-[28rem] h-[28rem] rounded-full bg-[#57F287]/20 blur-3xl" />

        {/* Barra de navegación estilo Discord */}
        <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <Energia360Logo size={40} showTagline variant="dark" />

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-white/90">
            <a
              href="#como-funciona"
              className="hover:underline underline-offset-4 transition"
            >
              Descubrir
            </a>
            <a
              href="#ahorro-sie"
              className="hover:underline underline-offset-4 transition"
            >
              Subsidio 700 kWh
            </a>
            <a
              href="#solar-nitro"
              className="hover:underline underline-offset-4 transition"
            >
              Solar &amp; Inversor
            </a>
            <a
              href="#servidores-demo"
              className="hover:underline underline-offset-4 transition"
            >
              Usuarios de Prueba
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {hasExistingEncryptedVault && (
              <button
                onClick={onOpenVaultUnlock}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full bg-[#23272A]/80 hover:bg-[#23272A] text-white transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#57F287]" />
                <span>Mi Bóveda</span>
              </button>
            )}
            <button
              onClick={() => onEnterWithTestAccount(selectedPreset)}
              className="text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full bg-white text-[#23272A] hover:text-[#5865F2] hover:shadow-lg transition cursor-pointer"
            >
              Abrir ENERGIA360
            </button>
          </div>
        </header>

        {/* Contenido Principal del Hero */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-24 md:pt-16 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#23272A]/60 backdrop-blur-md border border-white/15 text-xs font-bold text-[#57F287] mb-6 shadow-lg -rotate-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              EDESUR · EDENORTE · EDEESTE · CEPM — Hecho para República Dominicana
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[0.98] max-w-4xl mx-auto drop-shadow-sm">
            IMAGINA UN LUGAR...{" "}
            <span className="text-[#FEE75C] inline-block rotate-[-1deg]">
              DONDE EL RECIBO
            </span>{" "}
            DE LA LUZ NO ASUSTE.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
            ...un espacio donde puedes descubrir qué aire acondicionado se está
            comiendo tus cuartos, proteger tu subsidio de los{" "}
            <strong className="text-[#57F287]">700 kWh</strong> y saber cuántas
            horas te dura el inversor cuando se va la luz. Sin trucos y 100%
            privado en tu navegador.
          </p>

          {/* Dos botones píldora icónicos de Discord */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onEnterWithTestAccount(selectedPreset)}
              className="px-8 py-4 rounded-full bg-white text-[#23272A] hover:text-[#5865F2] font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition inline-flex items-center gap-2.5 cursor-pointer"
            >
              <Zap className="w-5 h-5 text-[#5865F2]" />
              <span>Entrar con Usuario de Prueba (1 Clic)</span>
            </button>

            <a
              href="#servidores-demo"
              className="px-8 py-4 rounded-full bg-[#23272A] hover:bg-[#313338] text-white font-extrabold text-sm sm:text-base shadow-xl hover:-translate-y-0.5 transition inline-flex items-center gap-2"
            >
              <span>Ver Cuentas Demo y Credenciales</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Escenario Visual No-Lineal (Tarjetas flotantes inclinadas + Ventana Discord) */}
          <div className="mt-14 relative max-w-5xl mx-auto">
            {/* Sticker Flotante Izquierdo (Inclinado) */}
            <div className="hidden lg:block discord-float-left absolute -left-8 -top-8 z-30 w-72 rounded-3xl bg-[#2B2D31] border-2 border-[#5865F2] p-4 text-left shadow-2xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center font-black text-xs">
                  BOT
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-white">
                      Vigía SIE
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#5865F2] text-white">
                      APP
                    </span>
                  </div>
                  <span className="text-[10px] text-[#B5BAC1]">
                    Hoy a las 10:42 AM
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#F2F3F5] leading-snug">
                ¡Ojo familia! Si bajan el Split del cuarto{" "}
                <strong className="text-[#57F287]">1.5 horas</strong>, no cruzan
                los 700 kWh y se ahorran{" "}
                <strong className="text-[#FEE75C]">RD$ 2,640</strong> este mes.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#5865F2]/25 border border-[#5865F2] text-white font-bold">
                  ⚡ 18
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#383A40] text-[#B5BAC1] font-bold">
                  🇩🇴 9
                </span>
              </div>
            </div>

            {/* Sticker Flotante Derecho (Inclinado) */}
            <div className="hidden lg:block discord-float-right absolute -right-6 -bottom-6 z-30 w-72 rounded-3xl bg-[#1E1F22] border-2 border-[#57F287] p-4 text-left shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#57F287]">
                  <Volume2 className="w-4 h-4" /> Canal de Respaldo Activo
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#57F287] animate-pulse" />
              </div>
              <div className="p-3 rounded-2xl bg-[#2B2D31] flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#B5BAC1]">
                    Inversor Trace 3.6 kW
                  </div>
                  <div className="text-base font-black text-white">
                    6h 36m en apagón
                  </div>
                </div>
                <BatteryCharging className="w-7 h-7 text-[#57F287]" />
              </div>
            </div>

            {/* Ventana Principal tipo Discord Mockup */}
            <div className="rounded-[28px] bg-[#313338] border-4 border-[#1E1F22] shadow-2xl overflow-hidden text-left grid grid-cols-1 md:grid-cols-12">
              {/* Mini barra de servidores izquierda */}
              <div className="hidden md:flex md:col-span-1 bg-[#1E1F22] py-4 flex-col items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white font-black shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="w-8 h-0.5 bg-[#35363C] rounded-full" />
                <div
                  onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                  title="Hogar Santo Domingo"
                  className="w-11 h-11 rounded-3xl hover:rounded-2xl bg-[#2B2D31] hover:bg-[#5865F2] text-xs font-black flex items-center justify-center cursor-pointer transition-all"
                >
                  SD
                </div>
                <div
                  onClick={() => onEnterWithTestAccount("apartamento_santiago")}
                  title="Apartamento Santiago"
                  className="w-11 h-11 rounded-3xl hover:rounded-2xl bg-[#2B2D31] hover:bg-[#23A55A] text-xs font-black flex items-center justify-center cursor-pointer transition-all"
                >
                  STI
                </div>
                <div
                  onClick={() => onEnterWithTestAccount("negocio_punta_cana")}
                  title="Negocio Punta Cana"
                  className="w-11 h-11 rounded-3xl hover:rounded-2xl bg-[#2B2D31] hover:bg-[#EB459E] text-xs font-black flex items-center justify-center cursor-pointer transition-all"
                >
                  PC
                </div>
              </div>

              {/* Lista de canales */}
              <div className="hidden md:flex md:col-span-3 bg-[#2B2D31] p-4 flex-col justify-between">
                <div>
                  <div className="font-extrabold text-sm text-white pb-3 mb-3 border-b border-white/10 flex items-center justify-between">
                    <span>Hogar Naco (EDESUR)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#57F287]/20 text-[#57F287]">
                      BTS-1
                    </span>
                  </div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#949BA4] mb-2">
                    Canales de Energía
                  </div>
                  <div className="space-y-1 text-xs font-bold">
                    <div className="px-2.5 py-2 rounded-lg bg-[#404249] text-white flex items-center gap-2">
                      <Hash className="w-4 h-4 text-[#B5BAC1]" />
                      <span>resumen-mensual</span>
                    </div>
                    <div className="px-2.5 py-2 rounded-lg text-[#949BA4] hover:bg-[#35373C] hover:text-white flex items-center justify-between transition">
                      <span className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span>escaner-facturas</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F23F43] text-white">
                        OCR
                      </span>
                    </div>
                    <div className="px-2.5 py-2 rounded-lg text-[#949BA4] hover:bg-[#35373C] hover:text-white flex items-center gap-2 transition">
                      <Hash className="w-4 h-4" />
                      <span>mis-equipos</span>
                    </div>
                    <div className="px-2.5 py-2 rounded-lg text-[#949BA4] hover:bg-[#35373C] hover:text-white flex items-center gap-2 transition">
                      <Hash className="w-4 h-4" />
                      <span>solar-e-inversor</span>
                    </div>
                  </div>
                </div>

                {/* Barra de usuario inferior tipo Discord */}
                <div className="p-2.5 rounded-xl bg-[#23272A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center font-black text-xs">
                        RD
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23A55A] border-2 border-[#23272A]" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white leading-none">
                        Familia Pérez
                      </div>
                      <div className="text-[10px] text-[#57F287] mt-0.5">
                        ● En línea · Demo
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido del canal */}
              <div className="md:col-span-8 p-5 sm:p-6 bg-[#313338] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-[#949BA4]" />
                    <span className="font-extrabold text-sm text-white">
                      resumen-mensual
                    </span>
                    <span className="hidden sm:inline text-xs text-[#949BA4]">
                      | Monitoreo en vivo de tu factura EDESUR
                    </span>
                  </div>
                  <button
                    onClick={() => onEnterWithTestAccount(selectedPreset)}
                    className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white transition cursor-pointer"
                  >
                    Interactuar en vivo &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-[#2B2D31] border border-white/5">
                    <div className="text-[11px] font-bold text-[#B5BAC1]">
                      Consumo Actual
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      645 kWh
                    </div>
                    <div className="text-[11px] font-bold text-[#57F287] mt-1">
                      Dentro del subsidio (&lt;700)
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#2B2D31] border border-white/5">
                    <div className="text-[11px] font-bold text-[#B5BAC1]">
                      Factura Estimada SIE
                    </div>
                    <div className="text-2xl font-black text-[#FEE75C] mt-1">
                      RD$ 6,129
                    </div>
                    <div className="text-[11px] text-[#B5BAC1] mt-1">
                      Promedio RD$ 9.50/kWh
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#2B2D31] border border-white/5">
                    <div className="text-[11px] font-bold text-[#B5BAC1]">
                      Potencial Ahorro IA
                    </div>
                    <div className="text-2xl font-black text-[#EB459E] mt-1">
                      -RD$ 1,850
                    </div>
                    <div className="text-[11px] text-[#B5BAC1] mt-1">
                      Ajustando 2 equipos
                    </div>
                  </div>
                </div>

                {/* Termómetro visual divertido */}
                <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5">
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-white">
                      Termómetro del Escalón 701 kWh (Pérdida de Subsidio)
                    </span>
                    <span className="text-[#FEE75C]">
                      Te quedan 55 kWh de margen
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#2B2D31] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5865F2] via-[#57F287] to-[#FEE75C]"
                      style={{ width: "88%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divisor de Onda Orgánica Estilo Discord */}
        <div className="w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-12 sm:h-20 preserve-3d"
            preserveAspectRatio="none"
          >
            <path
              d="M0 40C320 110 720 -20 1440 60V100H0V40Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      </div>

      {/* ================= SECCIÓN ZIG-ZAG 1 (FONDO BLANCO COMO DISCORD.COM) ================= */}
      <section
        id="como-funciona"
        className="bg-white text-[#23272A] py-16 sm:py-24 px-4 sm:px-8"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Tarjeta visual juguetona inclinada a la izquierda */}
          <div className="lg:col-span-7 relative">
            <div className="rounded-[32px] bg-[#F6F6F6] p-6 sm:p-8 border-2 border-[#E3E5E8] shadow-xl -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5865F2] text-white text-xs font-extrabold">
                  <Flame className="w-4 h-4" /> Top Equipos Tragones del Mes
                </span>
                <span className="text-xs font-bold text-[#4E5058]">
                  Desliza para simular en vivo
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-sm text-[#23272A]">
                      ❄️ Aire Split 12,000 BTU (Habitación Principal)
                    </div>
                    <div className="text-xs text-[#4E5058] mt-0.5">
                      8 horas/día · Compresor Inverter · 214 kWh/mes
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-[#5865F2]/10 text-[#5865F2] font-black text-sm">
                    RD$ 2,390/mes
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-sm text-[#23272A]">
                      🧊 Nevera Inverter 18 pies³
                    </div>
                    <div className="text-xs text-[#4E5058] mt-0.5">
                      24 horas/día · En Inversor · 92 kWh/mes
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-[#23A55A]/15 text-[#23A55A] font-black text-sm">
                    RD$ 1,030/mes
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#23272A] text-white flex items-center justify-between rotate-1 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EB459E] flex items-center justify-center font-black">
                      IA
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-[#57F287]">
                        CONSEJO RÁPIDO
                      </div>
                      <div className="text-xs text-white/90">
                        Pon el aire en 24°C después de las 11 PM y ahorras RD$
                        680/mes.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Texto conversacional a la derecha */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/10 text-[#5865F2] text-xs font-extrabold uppercase">
              Sin Matemáticas Aburridas
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] text-[#23272A]">
              Descubre quién se está comiendo tus cuartos en casa.
            </h2>
            <p className="text-base sm:text-lg text-[#4E5058] leading-relaxed">
              No tienes que ser ingeniero eléctrico. Elige tus equipos del
              catálogo dominicano (aires, neveras, bombas de agua, abanicos y
              freidoras) y mueve la barra de horas para ver al instante cuánto
              impacta cada aparato en pesos dominicanos.
            </p>
            <button
              onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
              className="px-6 py-3.5 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-sm shadow-lg transition inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Probar la Calculadora Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Onda divisoria hacia gris suave */}
      <div className="bg-white w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16"
          preserveAspectRatio="none"
        >
          <path
            d="M0 20C480 90 960 -10 1440 50V90H0V20Z"
            fill="#F6F6F6"
          />
        </svg>
      </div>

      {/* ================= SECCIÓN ZIG-ZAG 2 (FONDO #F6F6F6) ================= */}
      <section
        id="ahorro-sie"
        className="bg-[#F6F6F6] text-[#23272A] py-16 sm:py-24 px-4 sm:px-8"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Texto a la izquierda */}
          <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EB459E]/15 text-[#EB459E] text-xs font-extrabold uppercase">
              Escáner Local + Subsidio SIE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] text-[#23272A]">
              Sube tu factura como quien manda una foto por chat.
            </h2>
            <p className="text-base sm:text-lg text-[#4E5058] leading-relaxed">
              ¿Sabías que al pasar de <strong>700 kWh a 701 kWh</strong> en
              tarifa BTS-1 pierdes los escalones subsidiados y toda tu energía se
              cobra al precio más alto? Nuestro detector analiza tu recibo PDF o
              foto directamente en tu navegador sin enviar tus datos privados a
              nadie.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-xs font-extrabold text-[#23272A]">
                🔒 Cifrado AES-256-GCM
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-xs font-extrabold text-[#23272A]">
                📄 Lector PDF/Foto Local
              </span>
            </div>
          </div>

          {/* Tarjeta visual a la derecha */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="rounded-[32px] bg-[#2B2D31] text-white p-6 sm:p-8 shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm">
                      Detector de Escalones SIE (BTS-1)
                    </div>
                    <div className="text-xs text-[#B5BAC1]">
                      Comparativa real 700 kWh vs 701 kWh
                    </div>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#57F287]/20 text-[#57F287]">
                  Verificado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#1E1F22] border-2 border-[#23A55A]">
                  <div className="text-xs font-bold text-[#57F287] uppercase">
                    Con 700 kWh (Con Subsidio)
                  </div>
                  <div className="text-3xl font-black text-white mt-2">
                    RD$ 6,545
                  </div>
                  <p className="text-xs text-[#B5BAC1] mt-2">
                    Conservas los primeros 3 bloques económicos de la SIE.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1E1F22] border-2 border-[#F23F43]">
                  <div className="text-xs font-bold text-[#F23F43] uppercase">
                    Con 701 kWh (Pierdes Subsidio)
                  </div>
                  <div className="text-3xl font-black text-[#FEE75C] mt-2">
                    RD$ 9,191
                  </div>
                  <p className="text-xs text-[#B5BAC1] mt-2">
                    ¡Pagas <strong>+RD$ 2,646 extra</strong> por solo 1 kWh de
                    diferencia!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 3: SERVIDORES DE PRUEBA (ESTILO DISCORD SERVERS) ================= */}
      <section
        id="servidores-demo"
        className="bg-[#23272A] text-white py-20 px-4 sm:px-8 relative"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#5865F2] text-white text-xs font-extrabold uppercase tracking-wider mb-4">
              <Users className="w-3.5 h-3.5" /> Acceso Inmediato sin Registro
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">
              Elige un Servidor de Prueba y Entra en 1 Clic
            </h2>
            <p className="text-sm sm:text-base text-[#B5BAC1] mt-3">
              Preparamos 3 espacios dominicanos completos con facturas, equipos,
              inversores y paneles solares para que pruebes todo ahora mismo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tarjetas de los 3 Servidores Demo */}
            <div className="lg:col-span-7 space-y-4">
              {TEST_USER_ACCOUNTS.map((acc, idx) => {
                const isSelected = selectedPreset === acc.id;
                const badgeColors = [
                  "bg-[#5865F2]",
                  "bg-[#23A55A]",
                  "bg-[#EB459E]",
                ];
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectPresetCard(acc.id)}
                    className={`p-5 sm:p-6 rounded-[26px] cursor-pointer transition-all border-2 ${
                      isSelected
                        ? "bg-[#313338] border-[#5865F2] shadow-xl scale-[1.01]"
                        : "bg-[#2B2D31] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-13 h-13 rounded-2xl ${
                            badgeColors[idx % badgeColors.length]
                          } flex items-center justify-center font-black text-base text-white shadow-md shrink-0`}
                        >
                          {acc.distributor.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-base sm:text-lg text-white">
                              {acc.title}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#23A55A]/20 text-[#57F287]">
                              ● Online
                            </span>
                          </div>
                          <div className="text-xs text-[#B5BAC1] mt-0.5">
                            {acc.subtitle} ·{" "}
                            <strong className="text-white">
                              {acc.highlightMetric}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnterWithTestAccount(acc.id);
                        }}
                        className="px-4 py-2 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-extrabold transition cursor-pointer"
                      >
                        Entrar al Servidor &rarr;
                      </button>
                    </div>

                    <p className="text-xs text-[#B5BAC1] mt-3 leading-relaxed">
                      {acc.summary}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Caja de Login Estilo Discord */}
            <div className="lg:col-span-5 rounded-[28px] bg-[#313338] border border-white/10 p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-5">
                <h3 className="text-xl font-black text-white">
                  ¡Qué bueno verte por aquí!
                </h3>
                <p className="text-xs text-[#B5BAC1] mt-1">
                  Las credenciales de prueba ya están listas abajo
                </p>
              </div>

              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#B5BAC1] mb-1.5">
                    <span>Correo del Usuario Demo</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(emailInput, "email")}
                      className="text-[#5865F2] hover:underline inline-flex items-center gap-1"
                    >
                      {copiedField === "email" ? (
                        <>
                          <Check className="w-3 h-3 text-[#57F287]" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded-xl bg-[#1E1F22] border border-black/40 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#B5BAC1] mb-1.5">
                    <span>Contraseña de Prueba</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(passwordInput, "pass")}
                      className="text-[#5865F2] hover:underline inline-flex items-center gap-1"
                    >
                      {copiedField === "pass" ? (
                        <>
                          <Check className="w-3 h-3 text-[#57F287]" /> Copiada
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-xl bg-[#1E1F22] border border-black/40 px-4 py-3 text-sm font-mono font-bold text-[#57F287] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-sm shadow-lg shadow-[#5865F2]/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Iniciar Sesión con Usuario de Prueba</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="my-5 border-t border-white/10" />

              <button
                type="button"
                onClick={onStartPersonalWorkspace}
                className="w-full py-3 rounded-xl bg-[#2B2D31] hover:bg-[#383A40] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#57F287]" />
                <span>Crear Mi Propio EspacioDesde Cero</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ESTILO DISCORD ================= */}
      <footer className="bg-[#1E1F22] border-t border-white/10 py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Energia360Logo size={34} showTagline variant="dark" />
          <p className="text-xs text-[#949BA4] text-center sm:text-right">
            ENERGIA360 República Dominicana · Cálculos con tarifas SIE y
            privacidad Zero-Access AES-256-GCM.
          </p>
        </div>
      </footer>
    </div>
  );
}
