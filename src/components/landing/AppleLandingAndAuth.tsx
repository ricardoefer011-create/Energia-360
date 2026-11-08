"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Building2,
  Check,
  Copy,
  FileSpreadsheet,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  Sun,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  Energia360DiamondPin,
  Energia360Logo,
} from "@/components/brand/Energia360Logo";
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

const RD_ZONES = [
  {
    id: "edesur",
    code: "ZONA SUR / METROPOLITANA",
    name: "EDESUR Dominicana",
    cities: "Distrito Nacional, Santo Domingo Oeste, San Cristóbal, Baní, Azua, Barahona",
    tariffs: "BTS-1 (4 Escalones) · BTS-2 Comercial · BTD Demanda",
    hsp: "5.45 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "hogar_santo_domingo" as TestAccountPresetId,
    coords: { top: "58%", left: "53%" },
  },
  {
    id: "edenorte",
    code: "ZONA NORTE / CIBAO",
    name: "EDENORTE Dominicana",
    cities: "Santiago de los Caballeros, La Vega, Puerto Plata, San Francisco de Macorís, Mao",
    tariffs: "BTS-1 Residencial · BTS-2 PyME · MTD Media Tensión",
    hsp: "5.35 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "apartamento_santiago" as TestAccountPresetId,
    coords: { top: "30%", left: "40%" },
  },
  {
    id: "edeeste",
    code: "ZONA ORIENTAL / ESTE",
    name: "EDEESTE Dominicana",
    cities: "Santo Domingo Este, Santo Domingo Norte, Boca Chica, San Pedro de Macorís, La Romana",
    tariffs: "BTS-1 Escalones SIE · BTS-2 Comercial · Prepago",
    hsp: "5.40 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "hogar_santo_domingo" as TestAccountPresetId,
    coords: { top: "55%", left: "68%" },
  },
  {
    id: "cepm",
    code: "CONCESIÓN TURÍSTICA ESTE",
    name: "CEPM / Consorcio Energético",
    cities: "Punta Cana, Bávaro, Cap Cana, Verón, Macao, Bayahíbe",
    tariffs: "Tarifa Residencial Plana · Tarifa Comercial e Industrial Continua 24/7",
    hsp: "5.65 kWh/m²/día",
    subsidyThreshold: "Tarifa Privada Indexada",
    presetId: "negocio_punta_cana" as TestAccountPresetId,
    coords: { top: "48%", left: "86%" },
  },
];

export function AppleLandingAndAuth({
  onEnterWithTestAccount,
  onStartPersonalWorkspace,
  hasExistingEncryptedVault,
  onOpenVaultUnlock,
}: AppleLandingAndAuthProps) {
  const [selectedPreset, setSelectedPreset] = useState<TestAccountPresetId>(
    "hogar_santo_domingo"
  );
  const [activeZoneId, setActiveZoneId] = useState<string>("edesur");
  const [simKwh, setSimKwh] = useState<number>(685);
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

  // Cálculo en vivo del salto del subsidio SIE 701 kWh para el banner interactivo
  const losesSubsidy = simKwh >= 701;
  const estimatedBillRD = losesSubsidy
    ? Math.round(simKwh * 11.95 + 137.25)
    : Math.round(
        Math.min(simKwh, 200) * 6.05 +
          Math.max(0, Math.min(simKwh - 200, 100)) * 8.59 +
          Math.max(0, Math.min(simKwh - 300, 400)) * 11.68 +
          38.95
      );
  const billAt695 = Math.round(200 * 6.05 + 100 * 8.59 + 395 * 11.68 + 38.95);
  const subsidyLossPenalty = losesSubsidy
    ? Math.max(0, estimatedBillRD - billAt695)
    : 0;

  const activeZone =
    RD_ZONES.find((z) => z.id === activeZoneId) || RD_ZONES[0];

  return (
    <div className="min-h-screen bg-white text-[#091197] flex flex-col selection:bg-[#03A9EC] selection:text-white">
      {/* ================= FLOATING HEADER ESTILO GRUPAMAR (.cheader / .cheaderinner) ================= */}
      <header className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3 pb-2 pointer-events-none">
        <div className="max-w-[1640px] mx-auto bg-white/95 backdrop-blur-md border border-[#D9D9D9] rounded-[12px] h-[76px] sm:h-[86px] px-4 sm:px-7 flex items-center justify-between shadow-[0_12px_34px_rgba(9,17,151,0.06)] pointer-events-auto">
          <a href="#top" className="focus:outline-none">
            <Energia360Logo size={42} showTagline variant="light" />
          </a>

          <nav className="hidden xl:flex items-center gap-8 text-[14px] font-bold uppercase tracking-[0.06em] text-[#091197]">
            <a
              href="#soluciones"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Soluciones
            </a>
            <a
              href="#simulador-sie"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Tarifa SIE 700 kWh
            </a>
            <a
              href="#cifras"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Ingeniería Solar
            </a>
            <a
              href="#delegaciones-rd"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Distribuidoras RD
            </a>
            <a
              href="#area-clientes"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Área Clientes
            </a>
          </nav>

          {/* Botones de cabecera (.cheaderright -> .c2button) */}
          <div className="flex items-center gap-2.5">
            {hasExistingEncryptedVault && (
              <button
                onClick={onOpenVaultUnlock}
                className="hidden md:inline-flex items-center gap-2 h-[48px] px-4 rounded-[12px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-bold uppercase tracking-[0.05em] transition-all"
              >
                <KeyRound className="w-4 h-4 text-[#03A9EC]" />
                Bóveda AES-256
              </button>
            )}

            <a
              href="#area-clientes"
              className="hidden sm:inline-flex items-center gap-3 h-[50px] pl-4 pr-1.5 rounded-[12px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-bold uppercase tracking-[0.05em] transition-all group"
            >
              <span>Área Clientes</span>
              <span className="w-[38px] h-[38px] rounded-[9px] bg-[#091197] group-hover:bg-[#03A9EC] text-white flex items-center justify-center transition-colors">
                <UserCheck className="w-4 h-4" />
              </span>
            </a>

            <button
              onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
              className="inline-flex items-center gap-3 h-[50px] pl-4 pr-1.5 rounded-[12px] border border-[#091197] bg-[#091197] hover:bg-[#03A9EC] hover:border-[#03A9EC] text-white text-xs font-bold uppercase tracking-[0.05em] transition-all group"
            >
              <span>Entrar Demo</span>
              <span className="w-[38px] h-[38px] rounded-[9px] bg-[#03A9EC] group-hover:bg-[#091197] text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= SECCIÓN 1: BANNER VISUAL ENMARCADO (.csectionbannerdefault) ================= */}
      <section id="top" className="px-3 sm:px-6 pt-1">
        <div className="max-w-[1640px] mx-auto rounded-[12px] bg-[#091197] text-white overflow-hidden relative border border-[#091197]">
          {/* Retícula arquitectónica sutil tipo plano de ingeniería */}
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(3,169,236,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(3,169,236,0.35) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 w-[480px] h-[480px] rounded-full bg-[#03A9EC]/20 blur-3xl" />

          <div className="relative z-10 p-6 sm:p-10 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Columna izquierda: Telemetría ejecutiva e identidad */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-[8px] bg-white/10 border border-[#03A9EC]/40 text-[#03A9EC] text-xs font-bold uppercase tracking-[0.1em]">
                <span className="w-2 h-2 rounded-full bg-[#03A9EC] animate-pulse" />
                SISTEMA INTEGRAL DE AUDITORÍA ELÉCTRICA · REPÚBLICA DOMINICANA
              </div>

              <div className="space-y-2">
                <p className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em]">
                  EDESUR · EDENORTE · EDEESTE · CEPM
                </p>
                <h2 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-[0.98] uppercase">
                  CONTROL TOTAL DE TU FACTURA, EQUIPOS Y ENERGÍA SOLAR
                </h2>
              </div>

              <p className="text-white/80 text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
                Auditamos cada escalón tarifario de la{" "}
                <strong className="text-white font-semibold">
                  Superintendencia de Electricidad (SIE)
                </strong>
                , detectamos fugas de consumo antes de cruzar el umbral de{" "}
                <span className="text-[#03A9EC] font-bold">701 kWh</span> y
                dimensionamos sistemas fotovoltaicos e inversores con precisión
                matemática.
              </p>

              {/* Selector rápido de expedientes reales de prueba */}
              <div className="pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#03A9EC] mb-3">
                  ACCESO INMEDIATO CON EXPEDIENTES PRECARGADOS (1 CLIC):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEST_USER_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => onEnterWithTestAccount(acc.id)}
                      className="text-left p-4 rounded-[12px] bg-white text-[#091197] border border-[#03A9EC] hover:bg-[#03A9EC] hover:text-white transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-[#F1F1F1] text-[#091197] group-hover:bg-[#091197] group-hover:text-white transition-colors">
                            {acc.distributor}
                          </span>
                          <span className="w-7 h-7 rounded-[7px] bg-[#091197] text-white flex items-center justify-center group-hover:bg-white group-hover:text-[#091197] transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </span>
                        </div>
                        <p className="font-extrabold text-sm leading-tight uppercase">
                          {acc.title}
                        </p>
                        <p className="text-xs text-[#4B528A] group-hover:text-white/90 mt-0.5">
                          {acc.subtitle}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#D9D9D9] group-hover:border-white/30 flex items-center justify-between text-xs font-bold">
                        <span>{acc.highlightMetric}</span>
                        <span className="text-[#03A9EC] group-hover:text-white">
                          Entrar →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: Simulador en vivo de Escalones SIE y Subsidio 701 kWh */}
            <div
              id="simulador-sie"
              className="lg:col-span-5 bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 border-2 border-[#03A9EC] shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#D9D9D9]">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    MONITOR TARIFARIO BTS-1 EN VIVO
                  </span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight text-[#091197] mt-0.5">
                    SIMULADOR UMBRAL 701 KWH
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-[8px] text-xs font-extrabold uppercase tracking-wider ${
                    losesSubsidy
                      ? "bg-[#F75600] text-white"
                      : "bg-[#03A9EC]/15 text-[#091197] border border-[#03A9EC]"
                  }`}
                >
                  {losesSubsidy ? "SIN SUBSIDIO ESTATAL" : "SUBSIDIO ACTIVO"}
                </span>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4B528A]">
                      Consumo Mensual Simulado
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#091197] tabular-nums">
                      {simKwh}{" "}
                      <span className="text-lg font-bold text-[#03A9EC]">
                        kWh/mes
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4B528A]">
                      Factura Estimada SIE
                    </p>
                    <p
                      className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                        losesSubsidy ? "text-[#F75600]" : "text-[#091197]"
                      }`}
                    >
                      RD$ {estimatedBillRD.toLocaleString("es-DO")}
                    </p>
                  </div>
                </div>

                <div>
                  <input
                    type="range"
                    min={150}
                    max={950}
                    step={5}
                    value={simKwh}
                    onChange={(e) => setSimKwh(Number(e.target.value))}
                    className="w-full h-2.5 bg-[#F1F1F1] rounded-lg appearance-none cursor-pointer accent-[#091197]"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-[#4B528A] mt-1.5 uppercase">
                    <span>150 kWh (Tramo 1)</span>
                    <span className="text-[#F75600] font-extrabold">
                      ▲ 701 kWh (Pérdida Subsidio)
                    </span>
                    <span>950 kWh</span>
                  </div>
                </div>

                {/* Alerta técnica del salto tarifario */}
                <div
                  className={`p-4 rounded-[12px] border ${
                    losesSubsidy
                      ? "bg-[#F75600]/10 border-[#F75600] text-[#091197]"
                      : "bg-[#F1F1F1] border-[#D9D9D9] text-[#091197]"
                  }`}
                >
                  {losesSubsidy ? (
                    <p className="text-xs sm:text-sm leading-relaxed">
                      <strong className="text-[#F75600] uppercase font-extrabold">
                        ¡Alerta de Penalización Tarifaria!
                      </strong>{" "}
                      Al pasar de 700 a{" "}
                      <strong>{simKwh} kWh</strong>, pierdes el subsidio
                      escalonado y todos tus kWh se cobran a tarifa plena (~RD$
                      11.95/kWh), pagando{" "}
                      <strong className="text-[#F75600]">
                        +RD$ {subsidyLossPenalty.toLocaleString("es-DO")} extra
                      </strong>{" "}
                      este mes.
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed">
                      <strong className="text-[#091197] uppercase font-extrabold">
                        Zona Protegida con Subsidio:
                      </strong>{" "}
                      Estás a{" "}
                      <strong className="text-[#03A9EC]">
                        {701 - simKwh} kWh
                      </strong>{" "}
                      de cruzar el límite de 701 kWh. Nuestra auditoría de
                      equipos te ayuda a mantenerte por debajo todos los meses.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="grupamar-cta w-full"
              >
                <span>AUDITAR MI FACTURA COMPLETA EN PLATAFORMA</span>
                <span className="grupamar-cta-arrow">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 2: TITULAR EDITORIAL (.csectiontopbannerbottomtext) ================= */}
      <section className="py-12 sm:py-20 px-4 sm:px-8 border-b border-[#D9D9D9]">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <h1 className="text-[34px] sm:text-[52px] xl:text-[68px] font-extrabold uppercase leading-[0.96] tracking-[-0.03em] text-[#091197]">
              INTELIGENCIA ENERGÉTICA
            </h1>
            <h2 className="text-[28px] sm:text-[42px] xl:text-[54px] font-normal leading-[1.02] tracking-[-0.02em] text-[#03A9EC] mt-1">
              y Gestión Eléctrica Integral
            </h2>
          </div>

          <div className="lg:col-span-5 lg:pl-8 lg:border-l border-[#D9D9D9]">
            <h4 className="text-lg sm:text-2xl font-medium uppercase leading-[1.2] tracking-[-0.01em] text-[#091197]">
              ESPECIALISTAS EN OPTIMIZACIÓN TARIFARIA SIE, DIMENSIONAMIENTO
              FOTOVOLTAICO Y AUTONOMÍA DE INVERSORES EN REPÚBLICA DOMINICANA
            </h4>
            <p className="text-sm text-[#4B528A] mt-3 leading-relaxed">
              Tecnología Zero-Access con cifrado local{" "}
              <strong className="text-[#091197]">AES-256-GCM</strong> y motor de
              cálculo calibrado con los pliegos tarifarios vigentes de EDESUR,
              EDENORTE, EDEESTE y CEPM.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 3: BLOQUE AZUL REAL ENMARCADO - SOLUCIONES (.csectionsolucionesinner) ================= */}
      <section id="soluciones" className="p-2 sm:p-4">
        <div className="max-w-[1640px] mx-auto rounded-[12px] bg-[#091197] text-white px-5 sm:px-10 lg:px-14 py-14 sm:py-20">
          {/* Cabecera centrada estilo GrupaMar */}
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-3">
              SOLUCIONES DE INGENIERÍA ENERGÉTICA
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-white">
              Conectando consumo real con decisiones rentables
            </h3>
            <p className="text-white/75 text-base sm:text-lg mt-4 leading-relaxed">
              Cuatro módulos de ingeniería interconectados que transforman tu
              recibo de luz en una hoja de ruta técnica para reducir hasta un
              42% tu gasto eléctrico mensual.
            </p>
          </div>

          {/* Grid de 4 tarjetas blancas (.citembox) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Solución 01 */}
            <div className="bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between min-h-[390px] border border-transparent hover:border-[#03A9EC] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC] px-3 py-1 rounded-[6px] bg-[#F1F1F1]">
                    MÓDULO 01 · OCR SIE
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  AUDITORÍA DE FACTURAS ELÉCTRICAS
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Desglose milimétrico por escalones BTS-1 (0-200, 201-300,
                  301-700 y +701 kWh), validación de cargos fijos, lectura de
                  recibos por OCR y detección de cobros improcedentes.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                  className="grupamar-cta w-full"
                >
                  <span>ABRIR AUDITOR DE FACTURAS</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Solución 02 */}
            <div className="bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between min-h-[390px] border border-transparent hover:border-[#03A9EC] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC] px-3 py-1 rounded-[6px] bg-[#F1F1F1]">
                    MÓDULO 02 · INVENTARIO
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  CALCULADORA DE EQUIPOS Y CLIMA
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Catálogo dominicano de aires acondicionados (Inverter SEER 18+
                  vs Convencional), neveras, bombas de agua y calentadores con
                  cálculo exacto de su costo marginal en RD$.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("apartamento_santiago")}
                  className="grupamar-cta w-full"
                >
                  <span>SIMULAR CONSUMO POR EQUIPO</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Solución 03 */}
            <div className="bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between min-h-[390px] border border-transparent hover:border-[#03A9EC] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC] px-3 py-1 rounded-[6px] bg-[#F1F1F1]">
                    MÓDULO 03 · FOTOVOLTAICA
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <Sun className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  INGENIERÍA SOLAR Y MEDICIÓN NETA
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Dimensionamiento de paneles monocristalinos 580W según la
                  Hora Solar Pico (HSP) de tu provincia dominicana, área de
                  techo requerida, ROI en años y crédito fiscal Ley 57-07.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("negocio_punta_cana")}
                  className="grupamar-cta w-full"
                >
                  <span>CALCULAR SISTEMA SOLAR RD</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Solución 04 */}
            <div className="bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between min-h-[390px] border border-transparent hover:border-[#03A9EC] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC] px-3 py-1 rounded-[6px] bg-[#F1F1F1]">
                    MÓDULO 04 · RESPALDO
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <BatteryCharging className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  AUTONOMÍA DE INVERSORES Y BATERÍAS
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Cálculo real de horas de autonomía ante apagones para bancos
                  de baterías LiFePO4, AGM y Plomo-Ácido a 12V/24V/48V, evitando
                  el consumo fantasma que dispara tu recibo.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                  className="grupamar-cta w-full"
                >
                  <span>DIMENSIONAR BANCO BATERÍAS</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 4: LAS CIFRAS NOS AVALAN (.citemicon / #F1F1F1) ================= */}
      <section id="cifras" className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
            <div className="lg:col-span-7">
              <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
                LAS CIFRAS NOS AVALAN
              </h6>
              <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
                Precisión normativa, ahorro demostrable y privacidad criptográfica
              </h3>
            </div>
            <div className="lg:col-span-5">
              <p className="text-[#4B528A] text-base leading-relaxed">
                Cada recomendación de reemplazo tecnológico o ajuste de horario
                se calcula cruzando tu tarifa actual de la SIE con el costo real
                del kilovatio-hora marginal en pesos dominicanos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="grupamar-kpi-box flex flex-col justify-between min-h-[250px] border border-[#D9D9D9] hover:border-[#03A9EC] transition-all">
              <div className="w-14 h-14 rounded-[12px] bg-white border border-[#D9D9D9] flex items-center justify-center">
                <Zap className="w-7 h-7 text-[#03A9EC]" />
              </div>
              <div className="mt-8">
                <p className="text-4xl sm:text-5xl font-extrabold text-[#03A9EC] tracking-tight">
                  701 kWh
                </p>
                <h5 className="text-lg font-extrabold uppercase text-[#091197] mt-2">
                  ALERTA DE SUBSIDIO ESTATAL
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Monitoreo preventivo antes de perder el subsidio escalonado de
                  la tarifa residencial BTS-1.
                </p>
              </div>
            </div>

            <div className="grupamar-kpi-box flex flex-col justify-between min-h-[250px] border border-[#D9D9D9] hover:border-[#03A9EC] transition-all">
              <div className="w-14 h-14 rounded-[12px] bg-white border border-[#D9D9D9] flex items-center justify-center">
                <Sun className="w-7 h-7 text-[#03A9EC]" />
              </div>
              <div className="mt-8">
                <p className="text-4xl sm:text-5xl font-extrabold text-[#03A9EC] tracking-tight">
                  5.65 HSP
                </p>
                <h5 className="text-lg font-extrabold uppercase text-[#091197] mt-2">
                  ATLAS SOLAR DOMINICANO
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Radiación solar calibrada por provincia desde Montecristi y
                  Santiago hasta Punta Cana y Barahona.
                </p>
              </div>
            </div>

            <div className="grupamar-kpi-box flex flex-col justify-between min-h-[250px] border border-[#D9D9D9] hover:border-[#03A9EC] transition-all">
              <div className="w-14 h-14 rounded-[12px] bg-white border border-[#D9D9D9] flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[#03A9EC]" />
              </div>
              <div className="mt-8">
                <p className="text-4xl sm:text-5xl font-extrabold text-[#03A9EC] tracking-tight">
                  AES-256
                </p>
                <h5 className="text-lg font-extrabold uppercase text-[#091197] mt-2">
                  BÓVEDA LOCAL ZERO-ACCESS
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Tus facturas, NIC y contratos se cifran localmente en tu
                  navegador con PBKDF2 (210,000 iteraciones).
                </p>
              </div>
            </div>

            <div className="grupamar-kpi-box flex flex-col justify-between min-h-[250px] border border-[#D9D9D9] hover:border-[#03A9EC] transition-all">
              <div className="w-14 h-14 rounded-[12px] bg-white border border-[#D9D9D9] flex items-center justify-center">
                <Building2 className="w-7 h-7 text-[#03A9EC]" />
              </div>
              <div className="mt-8">
                <p className="text-4xl sm:text-5xl font-extrabold text-[#03A9EC] tracking-tight">
                  -38%
                </p>
                <h5 className="text-lg font-extrabold uppercase text-[#091197] mt-2">
                  REDUCCIÓN MEDIA EN FACTURA
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Optimización combinada mediante migración a Inverter SEER 20,
                  control de inversores y gestión de tramos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 5: DELEGACIONES / DISTRIBUIDORAS RD (.csectiongray + Rombo GrupaMar) ================= */}
      <section
        id="delegaciones-rd"
        className="py-16 sm:py-24 px-4 sm:px-8 bg-[#F1F1F1] border-y border-[#D9D9D9]"
      >
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-12">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
              COBERTURA NACIONAL DE CONCESIONES ELÉCTRICAS
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
              Pliegos tarifarios sincronizados con las 4 distribuidoras de RD
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Lista de zonas estilo acordeón/tarjetas GrupaMar */}
            <div className="lg:col-span-6 space-y-3">
              {RD_ZONES.map((zone) => {
                const isSelected = zone.id === activeZoneId;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setActiveZoneId(zone.id)}
                    className={`cursor-pointer rounded-[12px] p-5 sm:p-6 transition-all border ${
                      isSelected
                        ? "bg-[#091197] text-white border-[#091197] shadow-lg"
                        : "bg-white text-[#091197] border-[#D9D9D9] hover:border-[#03A9EC]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <Energia360DiamondPin active={isSelected} />
                        <div>
                          <p
                            className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${
                              isSelected ? "text-[#03A9EC]" : "text-[#03A9EC]"
                            }`}
                          >
                            {zone.code}
                          </p>
                          <h4 className="text-xl sm:text-2xl font-extrabold uppercase">
                            {zone.name}
                          </h4>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-[8px] text-xs font-bold uppercase ${
                          isSelected
                            ? "bg-[#03A9EC] text-white"
                            : "bg-[#F1F1F1] text-[#091197]"
                        }`}
                      >
                        HSP {zone.hsp}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-white/15 space-y-3">
                        <p className="text-sm text-white/85">
                          <strong className="text-[#03A9EC] uppercase text-xs tracking-wider block mb-0.5">
                            Demarcación y Provincias:
                          </strong>
                          {zone.cities}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <span className="text-xs font-semibold text-white/80">
                            {zone.tariffs}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEnterWithTestAccount(zone.presetId);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#03A9EC] hover:bg-white text-white hover:text-[#091197] text-xs font-extrabold uppercase tracking-wider transition-colors"
                          >
                            Cargar Expediente {zone.name.split(" ")[0]}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Panel Cartográfico Técnico con Rombos Interactivos estilo GrupaMar */}
            <div className="lg:col-span-6 bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#D9D9D9]">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    MAPA ELÉCTRICO Y RADIACIÓN SOLAR
                  </span>
                  <h4 className="text-2xl font-extrabold uppercase text-[#091197]">
                    {activeZone.name}
                  </h4>
                </div>
                <MapPin className="w-6 h-6 text-[#03A9EC]" />
              </div>

              {/* Representación esquemática de la isla y nodos con el rombo GrupaMar */}
              <div className="my-6 relative h-[280px] sm:h-[320px] rounded-[12px] bg-[#F1F1F1] border border-[#D9D9D9] overflow-hidden flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(#091197 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Silueta estilizada de RD + líneas de transmisión */}
                <svg
                  viewBox="0 0 600 300"
                  className="w-full h-full max-w-[540px] opacity-90"
                  fill="none"
                >
                  <path
                    d="M95 160 L155 95 L265 75 L370 90 L445 125 L525 140 L505 190 L415 200 L330 205 L245 245 L175 210 L110 195 Z"
                    fill="#FFFFFF"
                    stroke="#091197"
                    strokeWidth="3"
                  />
                  {/* Líneas troncales del SENI 345kV / 138kV */}
                  <path
                    d="M240 105 L325 175 L410 165 L500 155"
                    stroke="#03A9EC"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                  />
                </svg>

                {/* Pines de Rombos GrupaMar sobre el mapa */}
                {RD_ZONES.map((z) => {
                  const isAct = z.id === activeZoneId;
                  return (
                    <button
                      key={z.id}
                      onClick={() => setActiveZoneId(z.id)}
                      style={{ top: z.coords.top, left: z.coords.left }}
                      className={`-translate-x-1/2 -translate-y-1/2 absolute group flex flex-col items-center transition-transform ${
                        isAct ? "scale-125 z-20" : "hover:scale-110 z-10"
                      }`}
                    >
                      <Energia360DiamondPin active={isAct} />
                      <span
                        className={`mt-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow ${
                          isAct
                            ? "bg-[#091197] text-white"
                            : "bg-white text-[#091197] border border-[#D9D9D9]"
                        }`}
                      >
                        {z.name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    RADIACIÓN MEDIA
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#091197] mt-0.5">
                    {activeZone.hsp}
                  </p>
                </div>
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    LÍMITE SUBSIDIO
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#03A9EC] mt-0.5">
                    {activeZone.subsidyThreshold}
                  </p>
                </div>
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    MEDICIÓN NETA
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#091197] mt-0.5">
                    Ley 57-07 Activa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 6: ÁREA DE CLIENTES Y PERFILES DE PRUEBA ================= */}
      <section id="area-clientes" className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="max-w-3xl mb-12">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
              ÁREA DE CLIENTES · ACCESO INMEDIATO
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
              Prueba la plataforma con perfiles dominicanos reales o inicia tu bóveda
            </h3>
            <p className="text-[#4B528A] text-base mt-3">
              Selecciona cualquiera de los 3 expedientes precargados para auditar
              casos reales en Santo Domingo, Santiago o Punta Cana, o utiliza el
              acceso directo de credenciales.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 3 Tarjetas de Usuarios de Prueba (7 columnas) */}
            <div className="lg:col-span-7 space-y-4">
              {TEST_USER_ACCOUNTS.map((account) => {
                const isSelected = selectedPreset === account.id;
                return (
                  <div
                    key={account.id}
                    onClick={() => handleSelectPresetCard(account.id)}
                    className={`cursor-pointer rounded-[12px] p-6 transition-all border ${
                      isSelected
                        ? "bg-white border-2 border-[#091197] shadow-[0_14px_34px_rgba(9,17,151,0.08)]"
                        : "bg-[#F1F1F1]/60 border-[#D9D9D9] hover:border-[#03A9EC] hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 rounded-[6px] bg-[#091197] text-white text-[11px] font-extrabold uppercase tracking-wider">
                            {account.distributor}
                          </span>
                          <span className="px-2.5 py-1 rounded-[6px] bg-[#03A9EC]/15 text-[#091197] border border-[#03A9EC] text-[11px] font-extrabold uppercase">
                            {account.subtitle}
                          </span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-extrabold uppercase text-[#091197]">
                          {account.title}
                        </h4>
                      </div>

                      <div className="text-right bg-[#F1F1F1] px-4 py-2.5 rounded-[10px] border border-[#D9D9D9]">
                        <p className="text-[10px] font-extrabold uppercase text-[#4B528A]">
                          CONSUMO / FACTURA
                        </p>
                        <p className="text-lg font-extrabold text-[#091197]">
                          {account.highlightMetric}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-[#4B528A] mt-3 leading-relaxed">
                      {account.summary}
                    </p>

                    {/* Credenciales copiables + CTA estilo GrupaMar */}
                    <div className="mt-5 pt-4 border-t border-[#D9D9D9] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(account.email, account.id + "-email");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F1F1F1] hover:bg-[#03A9EC]/15 text-[#091197] font-mono font-semibold border border-[#D9D9D9]"
                        >
                          <span>{account.email}</span>
                          {copiedField === account.id + "-email" ? (
                            <Check className="w-3.5 h-3.5 text-[#008A5E]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#03A9EC]" />
                          )}
                        </button>
                        <span className="px-2.5 py-1.5 rounded-[8px] bg-[#F1F1F1] text-[#091197] font-mono text-xs font-semibold border border-[#D9D9D9]">
                          Clave: {account.password}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnterWithTestAccount(account.id);
                        }}
                        className="inline-flex items-center gap-3 h-[44px] pl-4 pr-1.5 rounded-[10px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all group"
                      >
                        <span>Entrar con este Perfil</span>
                        <span className="w-[34px] h-[34px] rounded-[8px] bg-[#091197] group-hover:bg-[#03A9EC] text-white flex items-center justify-center transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulario de Acceso Corporativo Área Clientes (5 columnas) */}
            <div className="lg:col-span-5 bg-[#F1F1F1] rounded-[12px] p-6 sm:p-8 border border-[#D9D9D9]">
              <div className="pb-5 mb-6 border-b border-[#D9D9D9]">
                <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                  PORTAL DE ACCESO DIRECTO
                </span>
                <h4 className="text-2xl font-extrabold uppercase text-[#091197] mt-1">
                  INICIAR SESIÓN EN ENERGIA360
                </h4>
                <p className="text-xs text-[#4B528A] mt-1">
                  Las credenciales del perfil seleccionado se autocompletan para
                  que entres en un solo clic.
                </p>
              </div>

              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091197] mb-1.5">
                    Correo Electrónico / Usuario Demo
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-12 px-4 rounded-[10px] bg-white border border-[#D9D9D9] focus:border-[#03A9EC] focus:outline-none text-[#091197] font-semibold text-sm"
                    placeholder="demo.hogar@energia360.do"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091197] mb-1.5">
                    Contraseña de Acceso
                  </label>
                  <input
                    type="text"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full h-12 px-4 rounded-[10px] bg-white border border-[#D9D9D9] focus:border-[#03A9EC] focus:outline-none text-[#091197] font-mono font-semibold text-sm"
                  />
                </div>

                <button type="submit" className="grupamar-cta w-full mt-2">
                  <span>ACCEDER AL PANEL EJECUTIVO</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px bg-[#D9D9D9] flex-1" />
                <span className="text-[11px] font-bold uppercase text-[#4B528A]">
                  O CONFIGURA TU PROPIO CONTRATO
                </span>
                <div className="h-px bg-[#D9D9D9] flex-1" />
              </div>

              <button
                type="button"
                onClick={onStartPersonalWorkspace}
                className="w-full h-[52px] px-5 rounded-[12px] bg-[#091197] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase tracking-[0.06em] transition-colors flex items-center justify-between"
              >
                <span>CREAR MI ESPACIO DESDE CERO (MI FACTURA REAL)</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <div className="mt-6 p-4 rounded-[10px] bg-white border border-[#D9D9D9] flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#03A9EC] shrink-0 mt-0.5" />
                <p className="text-xs text-[#4B528A] leading-relaxed">
                  <strong className="text-[#091197] uppercase">
                    Privacidad Zero-Access:
                  </strong>{" "}
                  Tus facturas nunca salen en texto plano de tu dispositivo.
                  Puedes bloquear tu sesión con contraseña maestra AES-256 en
                  cualquier momento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 7: SUPER BLOQUE DE CONTACTO / ACCESO (.contentcontact de GrupaMar) ================= */}
      <section className="px-4 sm:px-8 pb-16 bg-white">
        <div className="max-w-[1600px] mx-auto grupamar-contact-banner p-8 sm:p-12 lg:p-16 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="inline-block text-xs font-extrabold uppercase tracking-[0.14em] bg-[#091197] text-white px-3.5 py-1.5 rounded-[6px]">
                AUDITORÍA ENERGÉTICA INMEDIATA
              </span>
              <h3 className="text-3xl sm:text-5xl font-extrabold uppercase leading-[0.98] tracking-tight">
                ¿LISTO PARA REDUCIR TU FACTURA ELÉCTRICA ESTE MES?
              </h3>
              <p className="text-white/90 text-base sm:text-lg max-w-2xl">
                Entra ahora mismo al simulador interactivo con los datos
                oficiales de la SIE y descubre exactamente qué equipos están
                elevando tu consumo.
              </p>
            </div>

            <div className="lg:col-span-5">
              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="w-full bg-white text-[#091197] rounded-[12px] p-3 pl-6 flex items-center justify-between gap-4 shadow-xl hover:scale-[1.01] transition-transform group"
              >
                <span className="text-left text-sm sm:text-base font-extrabold uppercase tracking-[0.04em]">
                  INICIAR AUDITORÍA ELÉCTRICA 360°
                </span>
                <span className="w-14 h-14 rounded-[10px] bg-[#091197] group-hover:bg-[#F75600] text-white flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER CORPORATIVO (#091197) ================= */}
      <footer className="bg-[#091197] text-white py-12 px-4 sm:px-8 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/15">
          <Energia360Logo size={40} showTagline variant="dark" />

          <div className="flex flex-wrap gap-6 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
            <a href="#soluciones" className="hover:text-[#03A9EC] transition">
              Soluciones
            </a>
            <a href="#simulador-sie" className="hover:text-[#03A9EC] transition">
              Umbral 701 kWh
            </a>
            <a href="#cifras" className="hover:text-[#03A9EC] transition">
              Cifras y ROI
            </a>
            <a
              href="#delegaciones-rd"
              className="hover:text-[#03A9EC] transition"
            >
              EDESUR · EDENORTE · EDEESTE · CEPM
            </a>
            <a href="#area-clientes" className="hover:text-[#03A9EC] transition">
              Área Clientes
            </a>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            © {new Date().getFullYear()} ENERGIA360 República Dominicana ·
            Ingeniería Tarifaria SIE, Fotovoltaica y Respaldo Eléctrico.
          </p>
          <p className="text-[#03A9EC] font-semibold">
            Arquitectura Local-First · Cifrado Web Crypto AES-256-GCM
          </p>
        </div>
      </footer>
    </div>
  );
}
