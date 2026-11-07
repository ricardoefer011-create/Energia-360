"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Home,
  Lock,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  UserCheck,
  Zap,
} from "lucide-react";
import { Energia360Logo } from "@/components/brand/Energia360Logo";
import { DistributorCode } from "@/types/energia360";
import {
  calculateDominicanTariffBill,
  resolveTariffSchedule,
} from "@/lib/engine/energy-engine";
import { TestAccountPresetId } from "@/lib/data/rd-energy-catalog";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AppleLandingAndAuthProps {
  onEnterWithTestAccount: (preset: TestAccountPresetId) => void;
  onStartPersonalWorkspace: () => void;
  hasExistingEncryptedVault: boolean;
  onOpenVaultUnlock: () => void;
}

const TEST_ACCOUNTS: Array<{
  id: TestAccountPresetId;
  name: string;
  role: string;
  email: string;
  distributor: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "hogar_santo_domingo",
    name: "Familia Rodríguez",
    role: "Hogar Residencial · Santo Domingo",
    email: "familia.rodriguez@energia360.do",
    distributor: "EDESUR · BTS-1",
    summary:
      "5 facturas históricas (495 a 735 kWh), 2 aires acondicionados, nevera, bomba de agua e inversor Trace de 3.6 kW.",
    icon: Home,
  },
  {
    id: "apartamento_santiago",
    name: "Ing. Carlos Méndez",
    role: "Apartamento Eficiente · Santiago",
    email: "carlos.mendez@energia360.do",
    distributor: "EDENORTE · BTS-1",
    summary:
      "Consumo optimizado de 332 kWh/mes con equipos Inverter, teletrabajo y margen amplio bajo el escalón de 700 kWh.",
    icon: Building2,
  },
  {
    id: "negocio_punta_cana",
    name: "Cafetería & Deli El Coral",
    role: "Pequeño Negocio · Zona Este",
    email: "administracion@delielcoral.do",
    distributor: "EDEESTE · BTS-2 Comercial",
    summary:
      "Consumo comercial de 1,185 kWh/mes con exhibidores refrigerados, freezer, inversor híbrido de 8 kW y simulación solar.",
    icon: Store,
  },
];

export function AppleLandingAndAuth({
  onEnterWithTestAccount,
  onStartPersonalWorkspace,
  hasExistingEncryptedVault,
  onOpenVaultUnlock,
}: AppleLandingAndAuthProps) {
  const [quickDistributor, setQuickDistributor] =
    useState<DistributorCode>("EDESUR");
  const [quickKwh, setQuickKwh] = useState<number>(640);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [selectedTestPreset, setSelectedTestPreset] =
    useState<TestAccountPresetId>("hogar_santo_domingo");
  const [authTab, setAuthTab] = useState<"test_user" | "real_account">(
    "test_user"
  );
  const [emailInput, setEmailInput] = useState("demo@energia360.do");
  const [passwordInput, setPasswordInput] = useState("Energia360RD!");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const quickBill = useMemo(() => {
    const sched = resolveTariffSchedule(quickDistributor, "BTS-1");
    return calculateDominicanTariffBill(quickKwh, sched);
  }, [quickDistributor, quickKwh]);

  async function handleRealSupabaseAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthMessage(null);

    if (
      emailInput.trim().toLowerCase().includes("energia360.do") ||
      emailInput.trim().toLowerCase() === "demo@energia360.do"
    ) {
      onEnterWithTestAccount(selectedTestPreset);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      onStartPersonalWorkspace();
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      if (error) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (signUpErr) {
          setAuthMessage(
            "Puedes acceder de inmediato con el Usuario de Prueba o crear tu espacio privado local."
          );
          setAuthLoading(false);
          return;
        }
      }
      setAuthLoading(false);
      onStartPersonalWorkspace();
    } catch {
      setAuthLoading(false);
      onStartPersonalWorkspace();
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900">
      {/* Barra Superior Minimalista Blanca / Gris Suave */}
      <header className="sticky top-0 z-40 apple-glass border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Energia360Logo size={36} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a
              href="#simulador-rapido"
              className="hover:text-zinc-900 transition"
            >
              Calculadora SIE
            </a>
            <a href="#modulos" className="hover:text-zinc-900 transition">
              Funcionalidades
            </a>
            <a
              href="#usuarios-prueba"
              className="hover:text-zinc-900 transition"
            >
              Usuarios de Prueba
            </a>
            <a href="#privacidad" className="hover:text-zinc-900 transition">
              Privacidad
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {hasExistingEncryptedVault && (
              <button
                onClick={onOpenVaultUnlock}
                className="px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 transition inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                Mi Bóveda
              </button>
            )}
            <button
              onClick={() => {
                setAuthTab("real_account");
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => {
                setAuthTab("test_user");
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition inline-flex items-center gap-1.5"
            >
              <span>Entrar a la App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO PRINCIPAL — BLANCO Y GRIS SUAVE */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 bg-white border-b border-zinc-200/70">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-zinc-900" />
            <span>
              Plataforma de Inteligencia Energética · EDESUR · EDENORTE ·
              EDEESTE · CEPM
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.05]">
            Entiende tu consumo.
            <br />
            <span className="text-zinc-400 font-semibold">
              Controla tu energía.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto font-normal leading-relaxed">
            Analiza tus facturas eléctricas, calcula el gasto real de cada
            equipo, evita el salto tarifario de los 701 kWh y evalúa paneles
            solares o inversores con precisión matemática y privacidad total.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
              className="px-7 py-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-base shadow-sm transition inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Entrar con Usuario de Prueba (1 Clic)</span>
            </button>

            <button
              onClick={onStartPersonalWorkspace}
              className="px-7 py-4 rounded-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 font-semibold text-base transition inline-flex items-center gap-2"
            >
              <span>Crear Mi Espacio Propio</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE USUARIOS DE PRUEBA (1 CLIC) */}
      <section id="usuarios-prueba" className="py-16 px-4 sm:px-6 bg-[#F8F9FA]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Demostración Interactiva Inmediata
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">
                Perfiles de prueba listos para explorar
              </h2>
            </div>
            <div className="text-xs text-zinc-600 bg-white px-4 py-2 rounded-full border border-zinc-200">
              Usuario Demo: <strong>demo@energia360.do</strong> · Clave:{" "}
              <strong>Energia360RD!</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TEST_ACCOUNTS.map((acct) => {
              const Icon = acct.icon;
              return (
                <div
                  key={acct.id}
                  className="apple-card apple-card-interactive p-7 flex flex-col justify-between bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-5">
                      <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-800">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {acct.distributor}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-900">
                      {acct.name}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 mb-3">
                      {acct.role}
                    </p>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {acct.summary}
                    </p>
                  </div>

                  <button
                    onClick={() => onEnterWithTestAccount(acct.id)}
                    className="mt-6 w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Entrar como {acct.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CALCULADORA SIE EN VIVO EN LA PORTADA */}
      <section
        id="simulador-rapido"
        className="py-16 px-4 sm:px-6 bg-white border-y border-zinc-200/70"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Pliego Tarifario Oficial SIE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mt-1">
              Simula tu factura y el escalón de 701 kWh
            </h2>
            <p className="text-base text-zinc-500 mt-3">
              En República Dominicana, al pasar de 700 a 701 kWh mensuales se
              pierde el subsidio escalonado. Desliza la barra para calcular tu
              factura al instante.
            </p>
          </div>

          <div className="rounded-3xl bg-[#F8F9FA] border border-zinc-200 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  1. Distribuidora Eléctrica
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["EDESUR", "EDENORTE", "EDEESTE", "CEPM"] as const).map(
                    (dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setQuickDistributor(dist)}
                        className={`py-2.5 px-4 rounded-2xl text-sm font-semibold transition ${
                          quickDistributor === dist
                            ? "bg-zinc-900 text-white shadow-xs"
                            : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                        }`}
                      >
                        {dist}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    2. Consumo mensual (kWh)
                  </label>
                  <span className="text-3xl font-bold text-zinc-900">
                    {quickKwh}{" "}
                    <span className="text-base font-normal text-zinc-500">
                      kWh/mes
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1100}
                  step={5}
                  value={quickKwh}
                  onChange={(e) => setQuickKwh(parseInt(e.target.value, 10))}
                  className="w-full accent-zinc-900"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                  <span>100 kWh</span>
                  <span className="font-semibold text-zinc-800">
                    700 kWh (Límite subsidio escalonado)
                  </span>
                  <span>1,100 kWh</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {quickBill.blocksBreakdown.map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between text-sm bg-white px-4 py-3 rounded-2xl border border-zinc-200/80"
                  >
                    <span className="text-zinc-800 font-medium">
                      {b.label}{" "}
                      <span className="text-zinc-500 text-xs">
                        ({b.kwhInBlock} kWh × RD$ {b.rateDop.toFixed(2)})
                      </span>
                    </span>
                    <span className="font-bold text-zinc-900">
                      RD$ {b.subtotalDop.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-7 border border-zinc-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Total Estimado ({quickDistributor})
                </span>
                <div className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-2 tracking-tight">
                  RD${" "}
                  {quickBill.totalEstimatedBillDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  Costo medio:{" "}
                  <strong className="text-zinc-900">
                    RD$ {quickBill.averageRateDopPerKwh.toFixed(2)} / kWh
                  </strong>{" "}
                  · Cargo fijo: RD$ {quickBill.fixedChargeDop.toFixed(2)}
                </div>

                {quickBill.lostStepSubsidy701 ? (
                  <div className="mt-5 p-4 rounded-2xl bg-zinc-100 border border-zinc-300 text-xs text-zinc-800 leading-relaxed">
                    <strong>Escalón &ge; 701 kWh activo:</strong> Al superar los
                    700 kWh pierdes los tramos subsidiados y pagas{" "}
                    <strong>
                      RD${" "}
                      {quickBill.subsidyLossPenaltyDop.toLocaleString("es-DO")}{" "}
                      adicionales
                    </strong>
                    .
                  </div>
                ) : (
                  <div className="mt-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 leading-relaxed">
                    <strong>Subsidio escalonado conservado:</strong> Tienes{" "}
                    <strong className="text-zinc-900">
                      {Math.max(0, 700 - quickKwh)} kWh
                    </strong>{" "}
                    de margen antes del salto tarifario de 701 kWh.
                  </div>
                )}
              </div>

              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="mt-6 w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
              >
                Abrir Analizador Completo &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID DE FUNCIONALIDADES */}
      <section id="modulos" className="py-16 px-4 sm:px-6 bg-[#F8F9FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Módulos de la Plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mt-1">
              Diseñada con sencillez y rigor técnico
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="apple-card p-8 bg-white">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                Analizador Local de Facturas (OCR)
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Carga tus recibos en PDF o imagen. El reconocimiento óptico se
                ejecuta 100% en tu navegador sin subir tus facturas privadas a
                ningún servidor.
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                Calculadora por Equipos en Tiempo Real
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Simula el impacto de tus aires acondicionados, neveras, bombas
                de agua e iluminación ajustando las horas de uso diario con un
                deslizador suave.
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-5">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                Simulador Solar por Provincia (HSP RD)
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Dimensiona paneles solares, superficie de techo e inversión
                recuperable utilizando las Horas Solares Pico reales de cada
                provincia dominicana.
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-5">
                <BatteryCharging className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                Respaldo de Inversores y Baterías
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Calcula tus horas reales de autonomía durante apagones según la
                química de tu banco de baterías (Plomo-Ácido, AGM o Litio
                LiFePO4).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACIDAD ZERO-ACCESS */}
      <section
        id="privacidad"
        className="py-16 px-4 sm:px-6 bg-white border-t border-zinc-200/70"
      >
        <div className="max-w-5xl mx-auto rounded-3xl bg-[#F3F4F6] border border-zinc-200 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              <ShieldCheck className="w-4 h-4 text-zinc-900" /> Arquitectura
              Local-First y Zero-Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Tus datos te pertenecen únicamente a ti.
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Tu información energética se cifra en el navegador con{" "}
              <strong>AES-256-GCM y PBKDF2 (310,000 iteraciones)</strong>.
              Ningún empleado o administrador puede consultar tus facturas ni
              descifrar tu bóveda.
            </p>
          </div>
          <button
            onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
            className="px-7 py-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shrink-0 transition"
          >
            Entrar con Usuario de Prueba &rarr;
          </button>
        </div>
      </section>

      {/* MODAL DE ACCESO */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Energia360Logo size={32} />
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-full bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-100 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthTab("test_user")}
                className={`py-2.5 rounded-xl transition ${
                  authTab === "test_user"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                Usuario de Prueba (1 Clic)
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("real_account")}
                className={`py-2.5 rounded-xl transition ${
                  authTab === "real_account"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                Cuenta / Espacio Propio
              </button>
            </div>

            {authTab === "test_user" ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Elige un perfil de prueba precargado para entrar directamente:
                </p>

                <div className="space-y-2.5">
                  {TEST_ACCOUNTS.map((acct) => (
                    <label
                      key={acct.id}
                      onClick={() => setSelectedTestPreset(acct.id)}
                      className={`block p-4 rounded-2xl border cursor-pointer transition ${
                        selectedTestPreset === acct.id
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:bg-zinc-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-zinc-900">
                          {acct.name}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {acct.distributor}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Usuario: <strong>{acct.email}</strong> · Clave:{" "}
                        <strong>Energia360RD!</strong>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onEnterWithTestAccount(selectedTestPreset)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
                >
                  Entrar con este Usuario de Prueba &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleRealSupabaseAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-100 border border-zinc-200 px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-100 border border-zinc-200 px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {authMessage && (
                  <div className="p-3 rounded-xl bg-zinc-100 text-xs text-zinc-700">
                    {authMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
                >
                  {authLoading ? "Accediendo..." : "Iniciar Sesión"}
                </button>

                <button
                  type="button"
                  onClick={onStartPersonalWorkspace}
                  className="w-full py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition"
                >
                  O configurar mi espacio local privado sin cuenta
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
