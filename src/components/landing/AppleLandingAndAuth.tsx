"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  KeyRound,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import {
  Energia360DiamondPin,
  Energia360Logo,
} from "@/components/brand/Energia360Logo";
import { InteractiveElectricalRadarScheme } from "@/components/landing/InteractiveElectricalRadarScheme";
import {
  authenticatePlatformUser,
  PlatformUserAccount,
  registerNewClientAccount,
  SUPER_ADMIN_CREDENTIALS,
} from "@/lib/auth/platform-accounts";
import {
  TEST_USER_ACCOUNTS,
  TestAccountPresetId,
} from "@/lib/data/rd-energy-catalog";

interface AppleLandingAndAuthProps {
  onEnterWithTestAccount: (presetId: TestAccountPresetId) => void;
  onEnterAuthenticatedUser: (account: PlatformUserAccount) => void;
  onStartPersonalWorkspace: () => void;
  hasExistingEncryptedVault: boolean;
  onOpenVaultUnlock: () => void;
}

const SERVICE_ZONES = [
  {
    id: "zona_sur",
    code: "DEMARCACIÓN METROPOLITANA Y SUR",
    name: "Prestadora Zona Metropolitana / Sur",
    cities:
      "Distrito Nacional, Santo Domingo Oeste, San Cristóbal, Peravia, Azua, Barahona y Suroeste",
    tariffs: "Pliego Residencial por Tramos · Pliego Comercial · Media Tensión",
    hsp: "5.45 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "hogar_santo_domingo" as TestAccountPresetId,
    coords: { top: "58%", left: "53%" },
  },
  {
    id: "zona_norte",
    code: "DEMARCACIÓN NORTE Y VALLE DEL CIBAO",
    name: "Prestadora Zona Norte / Cibao",
    cities:
      "Santiago de los Caballeros, La Vega, Puerto Plata, Espaillat, Duarte y Línea Noroeste",
    tariffs: "Pliego Residencial Escalonado · Pliego PyME · Demanda Horaria",
    hsp: "5.35 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "apartamento_santiago" as TestAccountPresetId,
    coords: { top: "30%", left: "40%" },
  },
  {
    id: "zona_oriental",
    code: "DEMARCACIÓN ORIENTAL Y SURESTE",
    name: "Prestadora Zona Oriental",
    cities:
      "Santo Domingo Este, Santo Domingo Norte, San Pedro de Macorís, La Romana y Monte Plata",
    tariffs: "Pliego Residencial por Bloques · Pliego Comercial · Telemedición",
    hsp: "5.40 kWh/m²/día",
    subsidyThreshold: "700 kWh / mes",
    presetId: "hogar_santo_domingo" as TestAccountPresetId,
    coords: { top: "55%", left: "68%" },
  },
  {
    id: "zona_este_turistica",
    code: "DEMARCACIÓN TURÍSTICA DEL ESTE",
    name: "Concesión Turística Este",
    cities: "Punta Cana, Bávaro, Cap Cana, Verón, Macao y Polo Turístico Oriental",
    tariffs: "Pliego Residencial Continuo · Pliego Comercial e Industrial 24/7",
    hsp: "5.65 kWh/m²/día",
    subsidyThreshold: "Pliego Indexado Continuo",
    presetId: "negocio_punta_cana" as TestAccountPresetId,
    coords: { top: "48%", left: "86%" },
  },
];

export function AppleLandingAndAuth({
  onEnterWithTestAccount,
  onEnterAuthenticatedUser,
  onStartPersonalWorkspace,
  hasExistingEncryptedVault,
  onOpenVaultUnlock,
}: AppleLandingAndAuthProps) {
  const [selectedPreset, setSelectedPreset] = useState<TestAccountPresetId>(
    "hogar_santo_domingo"
  );
  const [activeZoneId, setActiveZoneId] = useState<string>("zona_sur");
  const [simKwh, setSimKwh] = useState<number>(685);

  // Pestaña en Área de Clientes: "login" | "register"
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Estados de Login
  const [emailInput, setEmailInput] = useState("admin@energia360.do");
  const [passwordInput, setPasswordInput] = useState("Admin360RD!");
  const [loginFeedback, setLoginFeedback] = useState<{
    type: "error" | "pending" | "success";
    message: string;
  } | null>(null);

  // Estados de Crear Cuenta (Solicitud de Alta con Aprobación por Super Admin)
  const [regFullName, setRegFullName] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("+1 (809) ");
  const [regZone, setRegZone] = useState<PlatformUserAccount["serviceZone"]>(
    "Prestadora Zona Metropolitana / Sur"
  );
  const [regSupplyType, setRegSupplyType] =
    useState<PlatformUserAccount["supplyType"]>("Residencial");
  const [regMonthlyKwh, setRegMonthlyKwh] = useState<number>(580);
  const [regNotes, setRegNotes] = useState("");
  const [createdPendingAccount, setCreatedPendingAccount] =
    useState<PlatformUserAccount | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleSelectPresetCard(presetId: TestAccountPresetId) {
    setSelectedPreset(presetId);
    setAuthTab("login");
    setLoginFeedback(null);
    const found = TEST_USER_ACCOUNTS.find((a) => a.id === presetId);
    if (found) {
      setEmailInput(found.email);
      setPasswordInput(found.password);
    }
  }

  function handleSelectSuperAdminCredentials() {
    setAuthTab("login");
    setLoginFeedback(null);
    setEmailInput(SUPER_ADMIN_CREDENTIALS.email);
    setPasswordInput(SUPER_ADMIN_CREDENTIALS.password);
  }

  function handleEnterAsSuperAdminDirect() {
    const res = authenticatePlatformUser(
      SUPER_ADMIN_CREDENTIALS.email,
      SUPER_ADMIN_CREDENTIALS.password
    );
    if (res.ok) {
      onEnterAuthenticatedUser(res.account);
    }
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  }

  function handleFormLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginFeedback(null);

    const authResult = authenticatePlatformUser(emailInput, passwordInput);
    if (authResult.ok) {
      onEnterAuthenticatedUser(authResult.account);
      return;
    }

    if (authResult.reason === "pending_approval") {
      setLoginFeedback({
        type: "pending",
        message: authResult.message,
      });
      return;
    }

    setLoginFeedback({
      type: "error",
      message: authResult.message,
    });
  }

  function handleFormRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setCreatedPendingAccount(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegisterError(
        "Por favor completa tu nombre completo, correo electrónico y contraseña."
      );
      return;
    }

    try {
      const { account } = registerNewClientAccount({
        fullName: regFullName,
        organizationOrUnit: regOrg,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        serviceZone: regZone,
        supplyType: regSupplyType,
        estimatedMonthlyKwh: regMonthlyKwh,
        notes: regNotes,
      });
      setCreatedPendingAccount(account);
      setRegFullName("");
      setRegOrg("");
      setRegEmail("");
      setRegPassword("");
      setRegNotes("");
    } catch (err) {
      setRegisterError(
        err instanceof Error
          ? err.message
          : "No fue posible procesar la solicitud."
      );
    }
  }

  // Cálculo en vivo del salto de escalón tarifario 701 kWh
  const losesSubsidy = simKwh >= 701;
  const estimatedCostRD = losesSubsidy
    ? Math.round(simKwh * 11.95 + 137.25)
    : Math.round(
        Math.min(simKwh, 200) * 6.05 +
          Math.max(0, Math.min(simKwh - 200, 100)) * 8.59 +
          Math.max(0, Math.min(simKwh - 300, 400)) * 11.68 +
          38.95
      );
  const costAt695 = Math.round(200 * 6.05 + 100 * 8.59 + 395 * 11.68 + 38.95);
  const stepJumpDifference = losesSubsidy
    ? Math.max(0, estimatedCostRD - costAt695)
    : 0;

  const activeZone =
    SERVICE_ZONES.find((z) => z.id === activeZoneId) || SERVICE_ZONES[0];

  return (
    <div className="min-h-screen bg-white text-[#091197] flex flex-col selection:bg-[#03A9EC] selection:text-white">
      {/* ================= FLOATING HEADER ESTILO GRUPAMAR (.cheader / .cheaderinner) ================= */}
      <header className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3 pb-2 pointer-events-none">
        <div className="max-w-[1640px] mx-auto bg-white/95 backdrop-blur-md border border-[#D9D9D9] rounded-[12px] h-[76px] sm:h-[86px] px-4 sm:px-7 flex items-center justify-between shadow-[0_12px_34px_rgba(9,17,151,0.06)] pointer-events-auto">
          <a href="#top" className="focus:outline-none">
            <Energia360Logo size={42} showTagline variant="light" />
          </a>

          <nav className="hidden xl:flex items-center gap-7 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#091197]">
            <a
              href="#radar-esquema"
              className="hover:text-[#03A9EC] transition-colors py-2 inline-flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-[#03A9EC]" />
              Radar &amp; Esquema 360°
            </a>
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
              Escalón 700 kWh
            </a>
            <a
              href="#delegaciones-rd"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Zonas de Suministro
            </a>
            <a
              href="#area-clientes"
              className="hover:text-[#03A9EC] transition-colors py-2"
            >
              Log In / Crear Cuenta
            </a>
          </nav>

          {/* Botones de cabecera (.cheaderright -> .c2button) */}
          <div className="flex items-center gap-2.5">
            {hasExistingEncryptedVault && (
              <button
                onClick={onOpenVaultUnlock}
                className="hidden md:inline-flex items-center gap-2 h-[48px] px-4 rounded-[12px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-[0.05em] transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-[#03A9EC]" />
                Bóveda Local
              </button>
            )}

            <button
              onClick={handleEnterAsSuperAdminDirect}
              className="hidden sm:inline-flex items-center gap-2.5 h-[50px] pl-4 pr-1.5 rounded-[12px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-[0.05em] transition-all group cursor-pointer"
            >
              <span>Super Admin</span>
              <span className="w-[38px] h-[38px] rounded-[9px] bg-[#091197] group-hover:bg-[#03A9EC] text-white flex items-center justify-center transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </button>

            <a
              href="#area-clientes"
              onClick={() => setAuthTab("login")}
              className="inline-flex items-center gap-2.5 h-[50px] pl-4 pr-1.5 rounded-[12px] border border-[#091197] bg-[#091197] hover:bg-[#03A9EC] hover:border-[#03A9EC] text-white text-xs font-extrabold uppercase tracking-[0.05em] transition-all group"
            >
              <span>Área Clientes</span>
              <span className="w-[38px] h-[38px] rounded-[9px] bg-[#03A9EC] group-hover:bg-[#091197] text-white flex items-center justify-center transition-colors">
                <UserCheck className="w-4 h-4" />
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* ================= SECCIÓN 1: BANNER VISUAL ENMARCADO (.csectionbannerdefault) ================= */}
      <section id="top" className="px-3 sm:px-6 pt-1">
        <div className="max-w-[1640px] mx-auto rounded-[12px] bg-[#091197] text-white overflow-hidden relative border border-[#091197]">
          {/* Retícula arquitectónica de ingeniería */}
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
            {/* Columna izquierda: Identidad Corporativa y Telemetría */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-[8px] bg-white/10 border border-[#03A9EC]/40 text-[#03A9EC] text-xs font-bold uppercase tracking-[0.1em]">
                <span className="w-2 h-2 rounded-full bg-[#03A9EC] animate-pulse" />
                PLATAFORMA INDEPENDIENTE DE TELEMETRÍA E INGENIERÍA ELÉCTRICA
              </div>

              <div className="space-y-2">
                <p className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em]">
                  GESTIÓN DE DATOS ENERGÉTICOS · EQUIPOS · SOLAR · RESPALDO
                </p>
                <h2 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-[0.98] uppercase">
                  INTELIGENCIA Y CONTROL TOTAL SOBRE TUS DATOS ENERGÉTICOS
                </h2>
              </div>

              <p className="text-white/80 text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
                Analizamos tu curva de demanda frente a los{" "}
                <strong className="text-white font-semibold">
                  pliegos regulatorios de las prestadoras de servicio eléctrico
                </strong>
                , prevenimos saltos de tramo por encima de{" "}
                <span className="text-[#03A9EC] font-bold">701 kWh</span> y
                dimensionamos sistemas fotovoltaicos y bancos de respaldo con
                rigor de ingeniería.
              </p>

              {/* Selector rápido de expedientes reales de prueba */}
              <div className="pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#03A9EC] mb-3">
                  EXPLORAR TELEMETRÍA EN VIVO O ACCEDER COMO SUPER ADMIN (1 CLIC):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEST_USER_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => onEnterWithTestAccount(acc.id)}
                      className="text-left p-4 rounded-[12px] bg-white text-[#091197] border border-[#03A9EC] hover:bg-[#03A9EC] hover:text-white transition-all group flex flex-col justify-between cursor-pointer"
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
                          Auditar →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: Simulador en vivo de Escalones de Consumo 701 kWh */}
            <div
              id="simulador-sie"
              className="lg:col-span-5 bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 border-2 border-[#03A9EC] shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#D9D9D9]">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    SIMULADOR DE ESCALONES DE DEMANDA
                  </span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight text-[#091197] mt-0.5">
                    MONITOR DE UMBRAL 701 KWH
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-[8px] text-xs font-extrabold uppercase tracking-wider ${
                    losesSubsidy
                      ? "bg-[#F75600] text-white"
                      : "bg-[#03A9EC]/15 text-[#091197] border border-[#03A9EC]"
                  }`}
                >
                  {losesSubsidy ? "TARIFA PLENA ACTIVA" : "TRAMO PROTEGIDO"}
                </span>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4B528A]">
                      Volumen Energético Mensual
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
                      Liquidación Estimada
                    </p>
                    <p
                      className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                        losesSubsidy ? "text-[#F75600]" : "text-[#091197]"
                      }`}
                    >
                      RD$ {estimatedCostRD.toLocaleString("es-DO")}
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
                    <span>150 kWh (Tramo Base)</span>
                    <span className="text-[#F75600] font-extrabold">
                      ▲ 701 kWh (Cambio de Escalón)
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
                        ¡Impacto por Salto de Escalón!
                      </strong>{" "}
                      Al superar los 700 kWh ({simKwh} kWh), la prestadora de
                      servicio aplica tarifa lineal plena sobre todo tu consumo
                      (~RD$ 11.95/kWh), generando un sobrecosto de{" "}
                      <strong className="text-[#F75600]">
                        +RD$ {stepJumpDifference.toLocaleString("es-DO")}
                      </strong>{" "}
                      mensuales.
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed">
                      <strong className="text-[#091197] uppercase font-extrabold">
                        Demanda en Rango Eficiente:
                      </strong>{" "}
                      Cuentas con un margen de{" "}
                      <strong className="text-[#03A9EC]">
                        {701 - simKwh} kWh
                      </strong>{" "}
                      antes del salto de tramo. Nuestro radar de equipos te
                      permite mantener tu consumo controlado todo el año.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="grupamar-cta w-full"
              >
                <span>ANALIZAR MIS DATOS ENERGÉTICOS EN VIVO</span>
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
              INGENIERÍA DE DATOS ENERGÉTICOS
            </h1>
            <h2 className="text-[28px] sm:text-[42px] xl:text-[54px] font-normal leading-[1.02] tracking-[-0.02em] text-[#03A9EC] mt-1">
              y Optimización Eléctrica 360°
            </h2>
          </div>

          <div className="lg:col-span-5 lg:pl-8 lg:border-l border-[#D9D9D9]">
            <h4 className="text-lg sm:text-2xl font-medium uppercase leading-[1.2] tracking-[-0.01em] text-[#091197]">
              ESPECIALISTAS EN AUDITORÍA DE CONSUMO ANTE PRESTADORAS DE
              SERVICIO, GENERACIÓN SOLAR Y AUTONOMÍA DE RESPALDO
            </h4>
            <p className="text-sm text-[#4B528A] mt-3 leading-relaxed">
              Arquitectura de privacidad{" "}
              <strong className="text-[#091197]">
                Zero-Access (AES-256-GCM)
              </strong>{" "}
              y gobernanza empresarial con validación de cuentas por Super
              Administrador.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 3 (NUEVA): ESQUEMA DINÁMICO DEL SISTEMA ELÉCTRICO Y RADAR 360° ================= */}
      <InteractiveElectricalRadarScheme
        onLaunchSimulator={() => onEnterWithTestAccount("hogar_santo_domingo")}
      />

      {/* ================= SECCIÓN 4: BLOQUE AZUL REAL ENMARCADO - SOLUCIONES (.csectionsolucionesinner) ================= */}
      <section id="soluciones" className="p-2 sm:p-4">
        <div className="max-w-[1640px] mx-auto rounded-[12px] bg-[#091197] text-white px-5 sm:px-10 lg:px-14 py-14 sm:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-3">
              ECOSISTEMA DE AUDITORÍA Y SIMULACIÓN
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-white">
              Conectando telemetría eléctrica con rentabilidad real
            </h3>
            <p className="text-white/75 text-base sm:text-lg mt-4 leading-relaxed">
              Cuatro módulos de ingeniería que transforman tus datos de consumo
              en decisiones técnicas de alto retorno financiero.
            </p>
          </div>

          {/* Grid de 4 tarjetas blancas (.citembox) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Solución 01 */}
            <div className="bg-white text-[#091197] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between min-h-[390px] border border-transparent hover:border-[#03A9EC] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC] px-3 py-1 rounded-[6px] bg-[#F1F1F1]">
                    MÓDULO 01 · TELEMETRÍA
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  AUDITORÍA DE DATOS DE CONSUMO
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Análisis milimétrico por bloques de consumo (0-200, 201-300,
                  301-700 y +701 kWh), validación de cargos regulatorios y
                  lectura óptica local de reportes de suministro.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                  className="grupamar-cta w-full"
                >
                  <span>AUDITAR DATOS ENERGÉTICOS</span>
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
                    MÓDULO 02 · CARGAS INTERNAS
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  BALANCE DE EQUIPOS Y CLIMATIZACIÓN
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Modelado energético de sistemas de climatización (Inverter
                  SEER 20+ vs Convencional), cámaras de frío, bombeo e
                  iluminación con cuantificación de su costo marginal en RD$.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("apartamento_santiago")}
                  className="grupamar-cta w-full"
                >
                  <span>SIMULAR IMPACTO POR EQUIPO</span>
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
                  DIMENSIONAMIENTO SOLAR &amp; ROI
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Ingeniería de módulos N-Type 580W según la Hora Solar Pico
                  (HSP) de tu provincia, superficie útil de cubierta, flujo de
                  caja proyectado y beneficios de incentivos renovables.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("negocio_punta_cana")}
                  className="grupamar-cta w-full"
                >
                  <span>PROYECTAR GENERACIÓN SOLAR</span>
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
                    MÓDULO 04 · CONTINUIDAD
                  </span>
                  <div className="w-11 h-11 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
                    <BatteryCharging className="w-5 h-5 text-[#03A9EC]" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold uppercase leading-[1.08] text-[#091197] mb-3">
                  AUTONOMÍA DE INVERSORES Y LITIO
                </h4>
                <p className="text-sm text-[#4B528A] leading-relaxed">
                  Cálculo real de horas de respaldo para bancos LiFePO4, AGM y
                  Plomo-Ácido a 12V/24V/48V, eliminando las pérdidas parásitas
                  durante la recarga desde la red.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#D9D9D9]">
                <button
                  onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                  className="grupamar-cta w-full"
                >
                  <span>DIMENSIONAR BANCO DE RESPALDO</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 5: LAS CIFRAS NOS AVALAN (.citemicon / #F1F1F1) ================= */}
      <section id="cifras" className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
            <div className="lg:col-span-7">
              <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
                INDICADORES DE DESEMPEÑO TÉCNICO
              </h6>
              <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
                Rigor matemático, ahorro verificable y seguridad empresarial
              </h3>
            </div>
            <div className="lg:col-span-5">
              <p className="text-[#4B528A] text-base leading-relaxed">
                Cada simulación cruza los parámetros técnicos de tus equipos con
                el costo marginal real por kilovatio-hora de tu zona de
                suministro eléctrico.
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
                  CONTROL DE ESCALÓN CRÍTICO
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Alertas tempranas antes de cruzar el umbral que activa la
                  tarifa lineal plena en suministros residenciales.
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
                  ATLAS SOLAR REGIONAL
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Radiación solar calibrada por demarcación geográfica para
                  proyecciones exactas de generación mensual.
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
                  GOBERNANZA Y PRIVACIDAD
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Acceso controlado por Super Administrador y bóveda criptográfica
                  local con derivación PBKDF2.
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
                  OPTIMIZACIÓN MEDIA DE COSTO
                </h5>
                <p className="text-sm text-[#4B528A] mt-1">
                  Reducción lograda mediante sustitución térmica Inverter,
                  control de inversores y gestión de demanda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 6: DEMARCACIONES Y PRESTADORAS DE SERVICIO ================= */}
      <section
        id="delegaciones-rd"
        className="py-16 sm:py-24 px-4 sm:px-8 bg-[#F1F1F1] border-y border-[#D9D9D9]"
      >
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-12">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
              COBERTURA NACIONAL DE ZONAS DE SUMINISTRO
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
              Parámetros calibrados para todas las prestadoras de servicio del país
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Lista de zonas estilo acordeón GrupaMar */}
            <div className="lg:col-span-6 space-y-3">
              {SERVICE_ZONES.map((zone) => {
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
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
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
                            Cobertura Geográfica:
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
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#03A9EC] hover:bg-white text-white hover:text-[#091197] text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Simular Datos de esta Zona
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
                    CARTOGRAFÍA DE RADIACIÓN Y DEMANDA
                  </span>
                  <h4 className="text-2xl font-extrabold uppercase text-[#091197]">
                    {activeZone.name}
                  </h4>
                </div>
                <MapPin className="w-6 h-6 text-[#03A9EC]" />
              </div>

              <div className="my-6 relative h-[280px] sm:h-[320px] rounded-[12px] bg-[#F1F1F1] border border-[#D9D9D9] overflow-hidden flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(#091197 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

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
                  <path
                    d="M240 105 L325 175 L410 165 L500 155"
                    stroke="#03A9EC"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                  />
                </svg>

                {SERVICE_ZONES.map((z) => {
                  const isAct = z.id === activeZoneId;
                  return (
                    <button
                      key={z.id}
                      onClick={() => setActiveZoneId(z.id)}
                      style={{ top: z.coords.top, left: z.coords.left }}
                      className={`-translate-x-1/2 -translate-y-1/2 absolute group flex flex-col items-center transition-transform cursor-pointer ${
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
                        {z.id.replace("zona_", "Zona ")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    RADIACIÓN SOLAR
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#091197] mt-0.5">
                    {activeZone.hsp}
                  </p>
                </div>
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    UMBRAL ESCALÓN
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#03A9EC] mt-0.5">
                    {activeZone.subsidyThreshold}
                  </p>
                </div>
                <div className="p-3.5 rounded-[10px] bg-[#F1F1F1]">
                  <p className="text-[10px] font-bold uppercase text-[#4B528A]">
                    GENERACIÓN NETA
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-[#091197] mt-0.5">
                    Habilitada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 7: ÁREA DE CLIENTES, REGISTRO CON APROBACIÓN Y SUPER ADMIN ================= */}
      <section id="area-clientes" className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="max-w-3xl mb-12">
            <h6 className="text-[#03A9EC] text-sm sm:text-base font-bold uppercase tracking-[0.12em] mb-2">
              ÁREA DE CLIENTES &amp; GOBERNANZA SUPER ADMIN
            </h6>
            <h3 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] leading-[0.98] text-[#091197]">
              Inicia sesión, solicita tu cuenta o administra la plataforma como Super Admin
            </h3>
            <p className="text-[#4B528A] text-base mt-3">
              Toda cuenta creada en la plataforma pasa por la aprobación del{" "}
              <strong className="text-[#091197]">Super Administrador</strong>{" "}
              para garantizar la seguridad e integridad de los expedientes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMNA IZQUIERDA (7 COLS): CUENTA MAESTRA SUPER ADMIN + PERFILES DEMO */}
            <div className="lg:col-span-7 space-y-4">
              {/* TARJETA DESTACADA: ACCESO SUPER ADMIN DE LA PLATAFORMA */}
              <div
                onClick={handleSelectSuperAdminCredentials}
                className="cursor-pointer rounded-[12px] p-6 bg-[#091197] text-white border-2 border-[#03A9EC] shadow-xl transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-[6px] bg-[#F75600] text-white text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> CUENTA MAESTRA
                        SUPER ADMIN
                      </span>
                      <span className="px-2.5 py-1 rounded-[6px] bg-white/10 text-[#03A9EC] border border-[#03A9EC]/50 text-[11px] font-extrabold uppercase">
                        APROBACIÓN DE USUARIOS &amp; GOBERNANZA
                      </span>
                    </div>
                    <h4 className="text-xl sm:text-2xl font-extrabold uppercase text-white">
                      DIRECCIÓN GENERAL · ADMINISTRADOR DE LA PLATAFORMA
                    </h4>
                    <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
                      Aprueba o rechaza las cuentas creadas por nuevos usuarios,
                      supervisa el volumen energético global y administra todos
                      los expedientes del sistema.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyText(
                          SUPER_ADMIN_CREDENTIALS.email,
                          "superadmin-email"
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white/10 hover:bg-white/20 text-white font-mono font-semibold border border-white/20 cursor-pointer"
                    >
                      <span>{SUPER_ADMIN_CREDENTIALS.email}</span>
                      {copiedField === "superadmin-email" ? (
                        <Check className="w-3.5 h-3.5 text-[#03A9EC]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#03A9EC]" />
                      )}
                    </button>
                    <span className="px-2.5 py-1.5 rounded-[8px] bg-white/10 text-[#03A9EC] font-mono text-xs font-semibold border border-white/20">
                      Clave: {SUPER_ADMIN_CREDENTIALS.password}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterAsSuperAdminDirect();
                    }}
                    className="inline-flex items-center gap-3 h-[44px] pl-4 pr-1.5 rounded-[10px] bg-[#03A9EC] hover:bg-white text-white hover:text-[#091197] text-xs font-extrabold uppercase tracking-wider transition-all group cursor-pointer"
                  >
                    <span>Entrar como Super Admin</span>
                    <span className="w-[34px] h-[34px] rounded-[8px] bg-[#091197] text-white flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 EXPEDIENTES DE CLIENTES APROBADOS */}
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
                          VOLUMEN / LIQUIDACIÓN
                        </p>
                        <p className="text-lg font-extrabold text-[#091197]">
                          {account.highlightMetric}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-[#4B528A] mt-3 leading-relaxed">
                      {account.summary}
                    </p>

                    <div className="mt-5 pt-4 border-t border-[#D9D9D9] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(
                              account.email,
                              account.id + "-email"
                            );
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
                        className="inline-flex items-center gap-3 h-[44px] pl-4 pr-1.5 rounded-[10px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all group cursor-pointer"
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

            {/* COLUMNA DERECHA (5 COLS): PORTAL DE LOGIN Y CREACIÓN DE CUENTA CON APROBACIÓN SUPER ADMIN */}
            <div className="lg:col-span-5 bg-[#F1F1F1] rounded-[12px] p-6 sm:p-8 border border-[#D9D9D9]">
              {/* Selector de Pestaña: Iniciar Sesión vs Crear Cuenta */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-[10px] bg-white border border-[#D9D9D9] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setLoginFeedback(null);
                  }}
                  className={`py-2.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authTab === "login"
                      ? "bg-[#091197] text-white shadow-sm"
                      : "text-[#091197] hover:bg-[#F1F1F1]"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("register");
                    setRegisterError(null);
                  }}
                  className={`py-2.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authTab === "register"
                      ? "bg-[#091197] text-white shadow-sm"
                      : "text-[#091197] hover:bg-[#F1F1F1]"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta</span>
                </button>
              </div>

              {authTab === "login" ? (
                <>
                  <div className="pb-4 mb-5 border-b border-[#D9D9D9]">
                    <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                      ACCESO VERIFICADO POR ROL
                    </span>
                    <h4 className="text-2xl font-extrabold uppercase text-[#091197] mt-1">
                      INGRESAR A ENERGIA360
                    </h4>
                    <p className="text-xs text-[#4B528A] mt-1">
                      Ingresa con la cuenta maestra de{" "}
                      <strong className="text-[#091197]">Super Admin</strong> o
                      con una cuenta de cliente aprobada.
                    </p>
                  </div>

                  {loginFeedback && (
                    <div
                      className={`mb-4 p-4 rounded-[10px] border text-xs leading-relaxed ${
                        loginFeedback.type === "pending"
                          ? "bg-[#F75600]/10 border-[#F75600] text-[#091197]"
                          : "bg-[#F75600]/15 border-[#F75600] text-[#F75600] font-bold"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {loginFeedback.type === "pending" ? (
                          <Clock className="w-5 h-5 text-[#F75600] shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-[#F75600] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold">{loginFeedback.message}</p>
                          {loginFeedback.type === "pending" && (
                            <button
                              type="button"
                              onClick={handleEnterAsSuperAdminDirect}
                              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#091197] text-white text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#03A9EC]" />
                              Entrar como Super Admin para aprobarla ahora →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleFormLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091197] mb-1.5">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full h-12 px-4 rounded-[10px] bg-white border border-[#D9D9D9] focus:border-[#03A9EC] focus:outline-none text-[#091197] font-semibold text-sm"
                        placeholder="admin@energia360.do"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091197] mb-1.5">
                        Contraseña
                      </label>
                      <input
                        type="text"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full h-12 px-4 rounded-[10px] bg-white border border-[#D9D9D9] focus:border-[#03A9EC] focus:outline-none text-[#091197] font-mono font-semibold text-sm"
                      />
                    </div>

                    <button type="submit" className="grupamar-cta w-full mt-2">
                      <span>INGRESAR A LA PLATAFORMA</span>
                      <span className="grupamar-cta-arrow">
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    </button>
                  </form>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px bg-[#D9D9D9] flex-1" />
                    <span className="text-[11px] font-bold uppercase text-[#4B528A]">
                      ACCESOS RÁPIDOS
                    </span>
                    <div className="h-px bg-[#D9D9D9] flex-1" />
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleEnterAsSuperAdminDirect}
                      className="w-full h-[48px] px-4 rounded-[10px] bg-[#091197] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase tracking-[0.05em] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#03A9EC]" />
                        ENTRAR DIRECTO COMO SUPER ADMIN
                      </span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={onStartPersonalWorkspace}
                      className="w-full h-[48px] px-4 rounded-[10px] bg-white hover:bg-[#091197] text-[#091197] hover:text-white border border-[#D9D9D9] text-xs font-extrabold uppercase tracking-[0.05em] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>INICIAR BÓVEDA LOCAL PERSONAL</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pb-4 mb-5 border-b border-[#D9D9D9]">
                    <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                      SOLICITUD DE ALTA DE USUARIO
                    </span>
                    <h4 className="text-2xl font-extrabold uppercase text-[#091197] mt-1">
                      CREAR CUENTA DE CLIENTE
                    </h4>
                    <p className="text-xs text-[#4B528A] mt-1">
                      Al registrarte, tu cuenta quedará en estado{" "}
                      <strong className="text-[#F75600]">
                        Pendiente de Aprobación
                      </strong>{" "}
                      hasta que el Super Administrador valide tu acceso.
                    </p>
                  </div>

                  {registerError && (
                    <div className="mb-4 p-4 rounded-[10px] bg-[#F75600]/15 border border-[#F75600] text-xs font-bold text-[#F75600] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  {createdPendingAccount ? (
                    <div className="p-5 rounded-[12px] bg-white border-2 border-[#03A9EC] space-y-4">
                      <div className="flex items-center gap-2.5 text-[#008A5E]">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#03A9EC] block">
                            REGISTRO COMPLETADO
                          </span>
                          <h5 className="text-base font-extrabold uppercase text-[#091197]">
                            SOLICITUD ENVIADA AL SUPER ADMIN
                          </h5>
                        </div>
                      </div>

                      <p className="text-xs text-[#4B528A] leading-relaxed">
                        La cuenta para{" "}
                        <strong className="text-[#091197]">
                          {createdPendingAccount.fullName}
                        </strong>{" "}
                        ({createdPendingAccount.email}) ha sido registrada con
                        estado{" "}
                        <span className="px-2 py-0.5 rounded bg-[#F75600] text-white font-extrabold uppercase text-[10px]">
                          PENDIENTE DE APROBACIÓN
                        </span>
                        .
                      </p>

                      <div className="p-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs space-y-2">
                        <p className="font-extrabold uppercase text-[#091197]">
                          ¿Quieres aprobar esta cuenta ahora mismo?
                        </p>
                        <p className="text-[#4B528A]">
                          Ingresa con un clic a la consola del{" "}
                          <strong>Super Administrador</strong> para autorizar
                          este registro en vivo:
                        </p>
                        <button
                          type="button"
                          onClick={handleEnterAsSuperAdminDirect}
                          className="w-full py-2.5 px-4 rounded-[8px] bg-[#091197] hover:bg-[#03A9EC] text-white font-extrabold uppercase text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#03A9EC]" />
                          Abrir Consola Super Admin y Aprobar Cuenta
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput(createdPendingAccount.email);
                          setPasswordInput(createdPendingAccount.password);
                          setCreatedPendingAccount(null);
                          setAuthTab("login");
                        }}
                        className="w-full py-2.5 rounded-[8px] bg-[#F1F1F1] text-xs font-extrabold uppercase text-[#091197]"
                      >
                        Ir a Iniciar Sesión
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleFormRegister} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Ej. Ing. Alejandro Morales"
                          className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-semibold text-[#091197]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                          Empresa o Unidad Residencial
                        </label>
                        <input
                          type="text"
                          required
                          value={regOrg}
                          onChange={(e) => setRegOrg(e.target.value)}
                          placeholder="Ej. Residencial Los Cacicazgos / Corporación"
                          className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-semibold text-[#091197]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Correo Electrónico
                          </label>
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="usuario@dominio.do"
                            className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-semibold text-[#091197]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Contraseña
                          </label>
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-semibold text-[#091197]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Zona de Suministro
                          </label>
                          <select
                            value={regZone}
                            onChange={(e) =>
                              setRegZone(
                                e.target.value as PlatformUserAccount["serviceZone"]
                              )
                            }
                            className="w-full h-11 px-3 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-bold text-[#091197]"
                          >
                            <option value="Prestadora Zona Metropolitana / Sur">
                              Zona Metropolitana / Sur
                            </option>
                            <option value="Prestadora Zona Norte / Cibao">
                              Zona Norte / Cibao
                            </option>
                            <option value="Prestadora Zona Oriental">
                              Zona Oriental
                            </option>
                            <option value="Concesión Turística Este">
                              Zona Turística Este
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Tipo de Suministro
                          </label>
                          <select
                            value={regSupplyType}
                            onChange={(e) =>
                              setRegSupplyType(
                                e.target.value as PlatformUserAccount["supplyType"]
                              )
                            }
                            className="w-full h-11 px-3 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-bold text-[#091197]"
                          >
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial / PyME">
                              Comercial / PyME
                            </option>
                            <option value="Industrial / Multipunto">
                              Industrial / Multipunto
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Teléfono
                          </label>
                          <input
                            type="text"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-semibold text-[#091197]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                            Consumo Est. (kWh/mes)
                          </label>
                          <input
                            type="number"
                            min={50}
                            value={regMonthlyKwh}
                            onChange={(e) =>
                              setRegMonthlyKwh(Number(e.target.value) || 400)
                            }
                            className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#D9D9D9] text-xs font-extrabold text-[#091197]"
                          />
                        </div>
                      </div>

                      <button type="submit" className="grupamar-cta w-full mt-2">
                        <span>SOLICITAR ALTA (REQUIERE APROBACIÓN)</span>
                        <span className="grupamar-cta-arrow">
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="mt-6 p-4 rounded-[10px] bg-white border border-[#D9D9D9] flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#03A9EC] shrink-0 mt-0.5" />
                <p className="text-xs text-[#4B528A] leading-relaxed">
                  <strong className="text-[#091197] uppercase">
                    Seguridad y Cifrado Local:
                  </strong>{" "}
                  Tus datos energéticos se procesan bajo arquitectura
                  Zero-Access con cifrado{" "}
                  <strong className="text-[#091197]">AES-256-GCM</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 8: SUPER BLOQUE DE CONTACTO / ACCESO (.contentcontact de GrupaMar) ================= */}
      <section className="px-4 sm:px-8 pb-16 bg-white">
        <div className="max-w-[1600px] mx-auto grupamar-contact-banner p-8 sm:p-12 lg:p-16 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="inline-block text-xs font-extrabold uppercase tracking-[0.14em] bg-[#091197] text-white px-3.5 py-1.5 rounded-[6px]">
                DIAGNÓSTICO ENERGÉTICO INMEDIATO
              </span>
              <h3 className="text-3xl sm:text-5xl font-extrabold uppercase leading-[0.98] tracking-tight">
                TOMA EL CONTROL DE TU SISTEMA ELÉCTRICO HOY MISMO
              </h3>
              <p className="text-white/90 text-base sm:text-lg max-w-2xl">
                Accede al simulador interactivo o solicita tu cuenta corporativa
                para auditar tus equipos, escalones de consumo y potencial
                solar.
              </p>
            </div>

            <div className="lg:col-span-5">
              <button
                onClick={() => onEnterWithTestAccount("hogar_santo_domingo")}
                className="w-full bg-white text-[#091197] rounded-[12px] p-3 pl-6 flex items-center justify-between gap-4 shadow-xl hover:scale-[1.01] transition-transform group cursor-pointer"
              >
                <span className="text-left text-sm sm:text-base font-extrabold uppercase tracking-[0.04em]">
                  ABRIR PLATAFORMA DE INGENIERÍA 360°
                </span>
                <span className="w-14 h-14 rounded-[10px] bg-[#091197] group-hover:bg-[#F75600] text-white flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER CORPORATIVO CON AVISO DE INDEPENDENCIA LEGAL (#091197) ================= */}
      <footer className="bg-[#091197] text-white py-12 px-4 sm:px-8 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/15">
          <Energia360Logo size={40} showTagline variant="dark" />

          <div className="flex flex-wrap gap-6 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
            <a href="#radar-esquema" className="hover:text-[#03A9EC] transition">
              Radar &amp; Esquema 360°
            </a>
            <a href="#soluciones" className="hover:text-[#03A9EC] transition">
              Soluciones
            </a>
            <a href="#simulador-sie" className="hover:text-[#03A9EC] transition">
              Umbral 700 kWh
            </a>
            <a
              href="#delegaciones-rd"
              className="hover:text-[#03A9EC] transition"
            >
              Zonas de Suministro
            </a>
            <a href="#area-clientes" className="hover:text-[#03A9EC] transition">
              Área Clientes / Super Admin
            </a>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto pt-6 space-y-3 text-xs text-white/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p>
              © {new Date().getFullYear()} ENERGIA360 · Plataforma de
              Telemetría, Eficiencia Térmica, Fotovoltaica y Respaldo Eléctrico.
            </p>
            <p className="text-[#03A9EC] font-semibold">
              Arquitectura Local-First · Cifrado Web Crypto AES-256-GCM
            </p>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed border-t border-white/10 pt-3">
            <strong>Aviso de Independencia Institucional:</strong> ENERGIA360 es
            una herramienta tecnológica privada e independiente de análisis de
            datos energéticos y simulación de ingeniería. No posee afiliación,
            representación ni vínculo comercial con ninguna prestadora de
            servicio eléctrico público o privado ni con entes reguladores. Todos
            los cálculos son orientativos a partir de los datos aportados por el
            usuario.
          </p>
        </div>
      </footer>
    </div>
  );
}
