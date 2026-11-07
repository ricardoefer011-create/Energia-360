"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileText,
  Home,
  KeyRound,
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
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "hogar_santo_domingo",
    name: "Familia Rodríguez",
    role: "Hogar Residencial · Santo Domingo",
    email: "familia.rodriguez@energia360.do",
    distributor: "EDESUR · Tarifa BTS-1",
    summary:
      "Incluye 5 facturas históricas (495 a 735 kWh), 2 aires acondicionados, nevera, bomba de agua e inversor Trace de 3.6 kW.",
    badgeColor: "bg-[#0071E3]/10 text-[#0071E3]",
    icon: Home,
  },
  {
    id: "apartamento_santiago",
    name: "Ing. Carlos Méndez",
    role: "Apartamento Eficiente · Santiago",
    email: "carlos.mendez@energia360.do",
    distributor: "EDENORTE · Tarifa BTS-1",
    summary:
      "Consumo optimizado de 332 kWh/mes con tecnología Inverter, teletrabajo y margen seguro bajo el escalón de 700 kWh.",
    badgeColor: "bg-[#28CD41]/15 text-[#1D832D]",
    icon: Building2,
  },
  {
    id: "negocio_punta_cana",
    name: "Cafetería & Deli El Coral",
    role: "Pequeño Negocio · Zona Este",
    email: "administracion@delielcoral.do",
    distributor: "EDEESTE · Tarifa Comercial BTS-2",
    summary:
      "Consumo comercial de 1,185 kWh/mes con exhibidores refrigerados, freezer, inversor híbrido de 8 kW y simulación solar.",
    badgeColor: "bg-[#FF9500]/15 text-[#B26600]",
    icon: Store,
  },
];

export function AppleLandingAndAuth({
  onEnterWithTestAccount,
  onStartPersonalWorkspace,
  hasExistingEncryptedVault,
  onOpenVaultUnlock,
}: AppleLandingAndAuthProps) {
  // Simulador interactivo en vivo en la portada
  const [quickDistributor, setQuickDistributor] =
    useState<DistributorCode>("EDESUR");
  const [quickKwh, setQuickKwh] = useState<number>(640);

  // Modal / Sección de Acceso con Usuario de Prueba o Cuenta Real
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

    // Si usa el correo de demostración, entra directo al perfil de prueba seleccionado
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
        // Si no existe, registramos o abrimos espacio personal
        const { error: signUpErr } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (signUpErr) {
          setAuthMessage(
            "Nota: Puedes entrar de inmediato con cualquiera de los Usuarios de Prueba de 1 clic o iniciar tu espacio local privado."
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
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Barra de Navegación Superior Estilo Apple (Frosted Glass) */}
      <header className="sticky top-0 z-40 apple-glass border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Energia360Logo size={36} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6E6E73]">
            <a
              href="#simulador-rapido"
              className="hover:text-[#1D1D1F] transition"
            >
              Calculadora Rápida
            </a>
            <a href="#modulos" className="hover:text-[#1D1D1F] transition">
              Cómo Funciona
            </a>
            <a
              href="#usuarios-prueba"
              className="hover:text-[#1D1D1F] transition"
            >
              Usuarios de Prueba
            </a>
            <a href="#privacidad" className="hover:text-[#1D1D1F] transition">
              Privacidad Zero-Access
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {hasExistingEncryptedVault && (
              <button
                onClick={onOpenVaultUnlock}
                className="px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-black/10 text-[#1D1D1F] hover:bg-black/5 transition inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                Mi Bóveda
              </button>
            )}
            <button
              onClick={() => {
                setAuthTab("real_account");
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-[#1D1D1F] hover:bg-black/[0.05] transition"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => {
                setAuthTab("test_user");
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm transition inline-flex items-center gap-1.5"
            >
              <span>Entrar a la Plataforma</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO PRINCIPAL ESTILO APPLE */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/[0.07] shadow-2xs text-xs font-semibold text-[#1D1D1F] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#28CD41]" />
            <span>
              Inteligencia Energética para República Dominicana · EDESUR ·
              EDENORTE · EDEESTE · CEPM
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1D1D1F] leading-[1.06]">
            Tu electricidad,{" "}
            <span className="bg-gradient-to-r from-[#0071E3] via-[#0091FF] to-[#20B857] bg-clip-text text-transparent">
              por fin clara.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[#6E6E73] max-w-2xl mx-auto font-normal leading-relaxed">
            Descubre cuánto consumes, qué equipos elevan tu factura, cómo evitar
            el salto tarifario de los 701 kWh y cuándo te conviene invertir en
            paneles solares o baterías. Todo con privacidad total.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
              className="px-7 py-4 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-base shadow-md hover:shadow-lg transition inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Entrar con Usuario de Prueba (1 Clic)</span>
            </button>

            <button
              onClick={onStartPersonalWorkspace}
              className="px-7 py-4 rounded-full bg-white hover:bg-black/[0.03] text-[#1D1D1F] border border-black/10 font-semibold text-base shadow-xs transition inline-flex items-center gap-2"
            >
              <span>Crear Mi Espacio Propio</span>
              <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
            </button>
          </div>

          {/* Tarjeta de Acceso Rápido a los 3 Perfiles de Prueba */}
          <div
            id="usuarios-prueba"
            className="mt-14 text-left max-w-5xl mx-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">
                  Cuentas de Prueba Preconfiguradas
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F]">
                  Elige un perfil real para explorar toda la plataforma al
                  instante
                </h2>
              </div>
              <span className="text-xs text-[#6E6E73] bg-white px-3 py-1.5 rounded-full border border-black/[0.06]">
                Credencial demo: <strong>demo@energia360.do</strong> /{" "}
                <strong>Energia360RD!</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TEST_ACCOUNTS.map((acct) => {
                const Icon = acct.icon;
                return (
                  <div
                    key={acct.id}
                    className="apple-card apple-card-interactive p-6 flex flex-col justify-between bg-white"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-[#0071E3]">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${acct.badgeColor}`}
                        >
                          {acct.distributor}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#1D1D1F]">
                        {acct.name}
                      </h3>
                      <p className="text-xs font-medium text-[#6E6E73] mb-3">
                        {acct.role} · {acct.email}
                      </p>
                      <p className="text-sm text-[#6E6E73] leading-relaxed">
                        {acct.summary}
                      </p>
                    </div>

                    <button
                      onClick={() => onEnterWithTestAccount(acct.id)}
                      className="mt-6 w-full py-3 rounded-2xl bg-[#F5F5F7] hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Entrar como {acct.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CALCULADORA INTERACTIVA EN VIVO EN LA WEB (PLIEGO SIE + ESCALÓN 701 KWH) */}
      <section id="simulador-rapido" className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">
              Transparencia Tarifaria SIE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
              Comprende el salto de los 701 kWh en segundos.
            </h2>
            <p className="text-base text-[#6E6E73] mt-3">
              En República Dominicana, al pasar de 700 a 701 kWh al mes pierdes
              el subsidio escalonado y cada kWh se cobra al precio más alto.
              Desliza la barra para comprobarlo en vivo.
            </p>
          </div>

          <div className="rounded-3xl bg-[#F5F5F7] border border-black/[0.06] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E6E73] mb-2">
                  1. Selecciona tu Distribuidora
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
                            ? "bg-[#0071E3] text-white shadow-xs"
                            : "bg-white text-[#1D1D1F] border border-black/[0.06] hover:bg-black/[0.02]"
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
                    2. Desliza tu consumo mensual (kWh)
                  </label>
                  <span className="text-3xl font-bold text-[#1D1D1F]">
                    {quickKwh}{" "}
                    <span className="text-base font-medium text-[#6E6E73]">
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
                  className="w-full accent-[#0071E3]"
                />
                <div className="flex justify-between text-xs text-[#6E6E73] mt-2">
                  <span>100 kWh (Hogar pequeño)</span>
                  <span className="font-semibold text-[#FF9500]">
                    700 kWh (Límite subsidio SIE)
                  </span>
                  <span>1,100 kWh</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {quickBill.blocksBreakdown.map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between text-sm bg-white px-4 py-3 rounded-2xl border border-black/[0.05]"
                  >
                    <span className="text-[#1D1D1F] font-medium">
                      {b.label}{" "}
                      <span className="text-[#6E6E73] text-xs">
                        ({b.kwhInBlock} kWh × RD$ {b.rateDop.toFixed(2)})
                      </span>
                    </span>
                    <span className="font-bold text-[#1D1D1F]">
                      RD$ {b.subtotalDop.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-7 border border-black/[0.07] shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
                  Factura Mensual Estimada ({quickDistributor})
                </span>
                <div className="text-4xl sm:text-5xl font-bold text-[#1D1D1F] mt-2 tracking-tight">
                  RD${" "}
                  {quickBill.totalEstimatedBillDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-sm text-[#6E6E73] mt-1">
                  Precio promedio:{" "}
                  <strong className="text-[#1D1D1F]">
                    RD$ {quickBill.averageRateDopPerKwh.toFixed(2)} / kWh
                  </strong>{" "}
                  · Cargo fijo: RD$ {quickBill.fixedChargeDop.toFixed(2)}
                </div>

                {quickBill.lostStepSubsidy701 ? (
                  <div className="mt-5 p-4 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#C92A2A] leading-relaxed">
                    <strong>¡Atención! Superaste los 700 kWh.</strong> Estás
                    pagando{" "}
                    <strong>
                      RD${" "}
                      {quickBill.subsidyLossPenaltyDop.toLocaleString("es-DO")}{" "}
                      adicionales
                    </strong>{" "}
                    este mes por perder los escalones subsidiados.
                  </div>
                ) : (
                  <div className="mt-5 p-4 rounded-2xl bg-[#28CD41]/12 border border-[#28CD41]/25 text-xs text-[#1D832D] leading-relaxed">
                    <strong>Subsidio escalonado activo.</strong> Te quedan{" "}
                    <strong>{Math.max(0, 700 - quickKwh)} kWh</strong> de margen
                    antes del salto tarifario de 701 kWh.
                  </div>
                )}
              </div>

              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="mt-6 w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm transition"
              >
                Analizar mis equipos y facturas en la App &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID DE MÓDULOS ESTILO APPLE */}
      <section id="modulos" className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">
              Todo en un solo lugar
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
              Cinco respuestas clave para controlar tu energía.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="apple-card p-8 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-5">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                1. Analizador Local de Facturas (OCR)
              </h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Sube tu recibo en PDF o foto de EDESUR, EDENORTE, EDEESTE o
                CEPM. Nuestro motor extrae los kWh y cargos directamente en tu
                navegador, sin enviar tus documentos privados a servidores
                externos.
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-[#28CD41]/15 text-[#1D832D] flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                2. Calculadora y Simulador de Equipos
              </h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Descubre cuánto te cuesta cada aire acondicionado, nevera,
                congelador o bomba de agua. Mueve el deslizador de horas diarias
                y observa al instante cuánto baja tu factura en pesos
                dominicanos (RD$).
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/15 text-[#C97400] flex items-center justify-center mb-5">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                3. Simulador Solar por Provincia (HSP RD)
              </h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Evalúa cuántos paneles solares necesitas, qué área de techo
                ocupan y en cuántos años recuperas tu inversión según la
                radiación solar real de Santo Domingo, Santiago, Punta Cana,
                Baní o cualquier provincia del país.
              </p>
            </div>

            <div className="apple-card p-8 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-[#5856D6]/12 text-[#5856D6] flex items-center justify-center mb-5">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                4. Autonomía de Inversores en Apagones
              </h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Calcula cuántas horas reales de respaldo te ofrece tu banco de
                baterías (Trojan Plomo-Ácido, AGM o Litio LiFePO4) según los
                equipos que dejes encendidos durante una interrupción eléctrica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE PRIVACIDAD ZERO-ACCESS */}
      <section id="privacidad" className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto rounded-3xl bg-[#1D1D1F] text-white p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#28CD41]">
              <ShieldCheck className="w-4 h-4" /> Privacidad por Diseño · Zero
              Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tus facturas son privadas. Ni nosotros podemos leerlas.
            </h2>
            <p className="text-sm text-white/75 leading-relaxed">
              Toda tu información privada se cifra en tu dispositivo con{" "}
              <strong>AES-256-GCM y PBKDF2 (310,000 iteraciones)</strong>.
              Supabase gestiona únicamente los catálogos públicos de la SIE y
              respaldos cifrados de extremo a extremo cuya llave maestra jamás
              sale de tu navegador.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
              className="px-6 py-3.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm transition"
            >
              Probar Demo Ahora
            </button>
          </div>
        </div>
      </section>

      {/* MODAL DE INICIO DE SESIÓN Y SELECCIÓN DE USUARIO DE PRUEBA */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-black/10 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Energia360Logo size={32} />
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] px-3 py-1.5 rounded-full bg-[#F5F5F7]"
              >
                Cerrar
              </button>
            </div>

            {/* Selector tipo Segmented Control de Apple */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F5F5F7] mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthTab("test_user")}
                className={`py-2.5 rounded-xl transition ${
                  authTab === "test_user"
                    ? "bg-white text-[#1D1D1F] shadow-xs"
                    : "text-[#6E6E73]"
                }`}
              >
                Usuario de Prueba (1 Clic)
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("real_account")}
                className={`py-2.5 rounded-xl transition ${
                  authTab === "real_account"
                    ? "bg-white text-[#1D1D1F] shadow-xs"
                    : "text-[#6E6E73]"
                }`}
              >
                Cuenta / Espacio Propio
              </button>
            </div>

            {authTab === "test_user" ? (
              <div className="space-y-4">
                <p className="text-xs text-[#6E6E73]">
                  Selecciona cualquiera de los 3 usuarios de prueba precargados
                  con facturas, equipos e inversores reales de República
                  Dominicana:
                </p>

                <div className="space-y-2.5">
                  {TEST_ACCOUNTS.map((acct) => (
                    <label
                      key={acct.id}
                      onClick={() => setSelectedTestPreset(acct.id)}
                      className={`block p-4 rounded-2xl border cursor-pointer transition ${
                        selectedTestPreset === acct.id
                          ? "border-[#0071E3] bg-[#0071E3]/[0.04]"
                          : "border-black/10 hover:bg-[#F5F5F7]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1D1D1F]">
                          {acct.name}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${acct.badgeColor}`}
                        >
                          {acct.distributor}
                        </span>
                      </div>
                      <div className="text-xs text-[#6E6E73] mt-1">
                        Usuario: <strong>{acct.email}</strong> · Clave:{" "}
                        <strong>Energia360RD!</strong>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onEnterWithTestAccount(selectedTestPreset)}
                  className="w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm shadow-sm transition"
                >
                  Entrar Ahora con este Usuario de Prueba &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleRealSupabaseAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                {authMessage && (
                  <div className="p-3 rounded-xl bg-[#FF9500]/10 text-xs text-[#B26600]">
                    {authMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm transition"
                >
                  {authLoading
                    ? "Conectando..."
                    : "Iniciar Sesión / Entrar a la Plataforma"}
                </button>

                <button
                  type="button"
                  onClick={onStartPersonalWorkspace}
                  className="w-full py-3 rounded-2xl bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] font-semibold text-xs transition"
                >
                  O configurar mi espacio local privado sin cuenta en la nube
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

