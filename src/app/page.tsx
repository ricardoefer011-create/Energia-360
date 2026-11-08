"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Cpu,
  FileSpreadsheet,
  KeyRound,
  LayoutDashboard,
  Plus,
  Server,
  ShieldCheck,
  Sliders,
  Sun,
} from "lucide-react";
import {
  Energia360DiamondPin,
  Energia360Logo,
} from "@/components/brand/Energia360Logo";
import { AppleLandingAndAuth } from "@/components/landing/AppleLandingAndAuth";
import { DashboardModule } from "@/components/modules/DashboardModule";
import { InvoiceAnalyzerModule } from "@/components/modules/InvoiceAnalyzerModule";
import { ApplianceCalculatorModule } from "@/components/modules/ApplianceCalculatorModule";
import { IntelligenceAndSavingsModule } from "@/components/modules/IntelligenceAndSavingsModule";
import { SolarAndInverterModule } from "@/components/modules/SolarAndInverterModule";
import { TariffsAndAdminModule } from "@/components/modules/TariffsAndAdminModule";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import {
  AlertConfig,
  DistributorCode,
  ElectricityInvoice,
  InverterBatterySystem,
  LocalVaultPayload,
  SubscriptionPlan,
  UserAppliance,
  UserWorkspaceProfile,
} from "@/types/energia360";
import {
  createEmptyVaultPayload,
  hasEncryptedVaultInIndexedDB,
  loadEncryptedEnvelopeFromIndexedDB,
  saveAndEncryptVault,
  unlockAndDecryptVault,
  wipeLocalVaultCompletely,
} from "@/lib/storage/local-vault";
import { EncryptedEnvelope } from "@/lib/crypto/vault-crypto";
import {
  createSyntheticDemoData,
  createTestUserProfileVault,
  RD_APPLIANCE_LIBRARY,
  TestAccountPresetId,
} from "@/lib/data/rd-energy-catalog";
import {
  calculateApplianceConsumption,
  calculateDominicanTariffBill,
  evaluateSmartAlerts,
  resolveTariffSchedule,
} from "@/lib/engine/energy-engine";
import { fetchPublicTariffSchedules } from "@/lib/supabase/client";

type NavigationTab =
  | "dashboard"
  | "facturas"
  | "equipos"
  | "inteligencia"
  | "solar_inversores"
  | "tarifas"
  | "privacidad"
  | "admin";

export default function Energia360PlatformPage() {
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");

  const [realVault, setRealVault] = useState<LocalVaultPayload>(() =>
    createEmptyVaultPayload()
  );
  const [demoVault, setDemoVault] = useState<LocalVaultPayload>(() =>
    createSyntheticDemoData()
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [activeTestPreset, setActiveTestPreset] =
    useState<TestAccountPresetId>("hogar_santo_domingo");

  const [activePassphrase, setActivePassphrase] = useState<string | null>(null);
  const [encryptedEnvelope, setEncryptedEnvelope] =
    useState<EncryptedEnvelope | null>(null);
  const [hasExistingVault, setHasExistingVault] = useState<boolean>(false);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockPassphraseInput, setUnlockPassphraseInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const activeVault = isDemoMode ? demoVault : realVault;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    hasEncryptedVaultInIndexedDB().then(async (exists) => {
      setHasExistingVault(exists);
      if (exists) {
        const env = await loadEncryptedEnvelopeFromIndexedDB().catch(
          () => null
        );
        setEncryptedEnvelope(env);
      }
    });

    fetchPublicTariffSchedules().then(({ schedules, source }) => {
      if (source === "supabase_remote" && schedules.length > 0) {
        setRealVault((prev) => ({ ...prev, customTariffs: schedules }));
        setDemoVault((prev) => ({ ...prev, customTariffs: schedules }));
      }
    });
  }, []);

  function notify(msg: string) {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  }

  function handleEnterWithTestAccount(preset: TestAccountPresetId) {
    setActiveTestPreset(preset);
    setDemoVault(createTestUserProfileVault(preset));
    setIsDemoMode(true);
    setViewMode("app");
    setActiveTab("dashboard");
    notify("Expediente técnico cargado en el Área de Clientes.");
  }

  function handleStartPersonalWorkspace() {
    setIsDemoMode(false);
    setViewMode("app");
    if (!realVault.profile.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }

  async function updateCurrentVault(
    updater: (prev: LocalVaultPayload) => LocalVaultPayload
  ) {
    if (isDemoMode) {
      setDemoVault((prev) => updater(prev));
      return;
    }

    const nextVault = updater(realVault);
    setRealVault(nextVault);

    if (activePassphrase) {
      try {
        const env = await saveAndEncryptVault(nextVault, activePassphrase);
        setEncryptedEnvelope(env);
      } catch {}
    }
  }

  const activeSchedule = useMemo(
    () =>
      resolveTariffSchedule(
        activeVault.profile.distributor,
        activeVault.profile.tariffCode,
        activeVault.customTariffs
      ),
    [
      activeVault.profile.distributor,
      activeVault.profile.tariffCode,
      activeVault.customTariffs,
    ]
  );

  const triggeredAlerts = useMemo(
    () =>
      evaluateSmartAlerts(
        activeVault.alertConfigs,
        activeVault.invoices,
        activeVault.appliances,
        activeVault.inverterSystems,
        activeSchedule
      ),
    [
      activeVault.alertConfigs,
      activeVault.invoices,
      activeVault.appliances,
      activeVault.inverterSystems,
      activeSchedule,
    ]
  );

  const referenceKwhForSolar = useMemo(() => {
    const latestInv = activeVault.invoices[activeVault.invoices.length - 1];
    if (latestInv) return latestInv.billedKwh.value;
    const sumApp = activeVault.appliances.reduce(
      (s, a) => s + calculateApplianceConsumption(a, 12).monthlyKwh,
      0
    );
    return sumApp || 550;
  }, [activeVault.invoices, activeVault.appliances]);

  const referenceBillForSolar = useMemo(() => {
    return calculateDominicanTariffBill(
      referenceKwhForSolar,
      activeSchedule,
      activeVault.profile.customRateDopPerKwh
    ).totalEstimatedBillDop;
  }, [
    referenceKwhForSolar,
    activeSchedule,
    activeVault.profile.customRateDopPerKwh,
  ]);

  async function handleUnlockVault(e: React.FormEvent) {
    e.preventDefault();
    setUnlockError(null);
    try {
      const { payload, envelope } = await unlockAndDecryptVault(
        unlockPassphraseInput
      );
      setRealVault(payload);
      setEncryptedEnvelope(envelope);
      setActivePassphrase(unlockPassphraseInput);
      setShowUnlockModal(false);
      setIsDemoMode(false);
      setViewMode("app");
      setUnlockPassphraseInput("");
      notify("Bóveda local descifrada con éxito.");
    } catch (err) {
      setUnlockError(
        err instanceof Error
          ? err.message
          : "Contraseña maestra incorrecta."
      );
    }
  }

  async function handleCompleteOnboarding(
    updatedProfile: UserWorkspaceProfile,
    masterPassphrase: string | null,
    loadStarterAppliances: boolean
  ) {
    const starterAppliances: UserAppliance[] = loadStarterAppliances
      ? RD_APPLIANCE_LIBRARY.slice(0, 4).map((tpl, idx) => ({
          id: `starter-${idx}-${Date.now()}`,
          name: tpl.name,
          category: tpl.category,
          brand: tpl.brand,
          model: tpl.model,
          nominalWatts: tpl.nominalWatts,
          dutyCycleFactor: tpl.dutyCycleFactor,
          quantity: 1,
          dailyHours: tpl.defaultDailyHours,
          monthlyDays: tpl.defaultMonthlyDays,
          efficiencyRating: tpl.efficiencyRating,
          isCriticalBackupLoad: tpl.isCriticalBackupLoad,
          isNighttimeHeavy: tpl.isNighttimeHeavy,
          provenance: "biblioteca_orientativa",
          observations: tpl.rdNote,
        }))
      : [];

    const initializedVault: LocalVaultPayload = {
      ...realVault,
      profile: updatedProfile,
      appliances: starterAppliances,
      updatedAt: new Date().toISOString(),
    };

    setRealVault(initializedVault);
    setShowOnboarding(false);
    setIsDemoMode(false);

    if (masterPassphrase) {
      setActivePassphrase(masterPassphrase);
      const env = await saveAndEncryptVault(initializedVault, masterPassphrase);
      setEncryptedEnvelope(env);
      setHasExistingVault(true);
      notify("Espacio privado creado y cifrado con AES-256-GCM.");
    } else {
      notify("Tu expediente energético está listo.");
    }
  }

  function handleExportVaultJson() {
    const exportPayload = JSON.stringify(activeVault, null, 2);
    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `energia360-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Copia exportada en formato JSON.");
  }

  function handleImportVaultJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr) as LocalVaultPayload;
      if (!parsed.profile || !Array.isArray(parsed.appliances)) {
        throw new Error("Formato no válido.");
      }
      setIsDemoMode(false);
      setRealVault(parsed);
      if (activePassphrase) {
        saveAndEncryptVault(parsed, activePassphrase).then(
          setEncryptedEnvelope
        );
      }
      notify("Datos restaurados correctamente.");
    } catch {
      notify("El archivo JSON no tiene un formato válido.");
    }
  }

  async function handleWipeAllLocalData() {
    await wipeLocalVaultCompletely();
    setRealVault(createEmptyVaultPayload());
    setActivePassphrase(null);
    setEncryptedEnvelope(null);
    setHasExistingVault(false);
    setIsDemoMode(true);
    setViewMode("landing");
    notify("Todos los datos locales fueron eliminados de este navegador.");
  }

  if (viewMode === "landing") {
    return (
      <>
        <AppleLandingAndAuth
          onEnterWithTestAccount={handleEnterWithTestAccount}
          onStartPersonalWorkspace={handleStartPersonalWorkspace}
          hasExistingEncryptedVault={hasExistingVault}
          onOpenVaultUnlock={() => setShowUnlockModal(true)}
        />

        {showUnlockModal && (
          <div className="fixed inset-0 z-50 bg-[#091197]/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-[12px] bg-white border-2 border-[#03A9EC] p-7 shadow-2xl space-y-4 text-[#091197]">
              <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#03A9EC]">
                    SEGURIDAD ZERO-ACCESS
                  </span>
                  <h3 className="font-extrabold text-lg uppercase">
                    DESBLOQUEAR BÓVEDA AES-256
                  </h3>
                </div>
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="text-xs font-extrabold uppercase text-[#4B528A] hover:text-[#091197]"
                >
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleUnlockVault} className="space-y-3">
                <input
                  type="password"
                  required
                  value={unlockPassphraseInput}
                  onChange={(e) => setUnlockPassphraseInput(e.target.value)}
                  placeholder="Contraseña maestra..."
                  className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-4 py-3 text-sm text-[#091197] focus:border-[#03A9EC] focus:outline-none"
                />
                {unlockError && (
                  <div className="text-xs font-bold text-[#F75600]">
                    {unlockError}
                  </div>
                )}
                <button type="submit" className="grupamar-cta w-full">
                  <span>DESCIFRAR EXPEDIENTE</span>
                  <span className="grupamar-cta-arrow">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  const navigationModules: Array<{
    id: NavigationTab;
    code: string;
    label: string;
    description: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "dashboard",
      code: "01",
      label: "PANEL EJECUTIVO",
      description: "Métricas de consumo, subsidio 701 kWh y desglose en RD$",
      icon: LayoutDashboard,
    },
    {
      id: "facturas",
      code: "02",
      label: "AUDITORÍA FACTURAS",
      description: "Escáner OCR y validación de tramos tarifarios SIE",
      badge: "OCR",
      icon: FileSpreadsheet,
    },
    {
      id: "equipos",
      code: "03",
      label: "INVENTARIO EQUIPOS",
      description: "Costo marginal por aire acondicionado, nevera y cargas",
      icon: Calculator,
    },
    {
      id: "inteligencia",
      code: "04",
      label: "OPTIMIZACIÓN & ROI",
      description: "Plan de ahorro en 3 escenarios y alertas preventivas",
      badge: "IA",
      icon: Cpu,
    },
    {
      id: "solar_inversores",
      code: "05",
      label: "SOLAR & INVERSORES",
      description: "Dimensionamiento fotovoltaico HSP y autonomía de baterías",
      icon: Sun,
    },
    {
      id: "tarifas",
      code: "06",
      label: "PLIEGOS SIE RD",
      description: "Tarifas vigentes de EDESUR, EDENORTE, EDEESTE y CEPM",
      icon: Sliders,
    },
    {
      id: "privacidad",
      code: "07",
      label: "BÓVEDA AES-256",
      description: "Cifrado local Zero-Access y exportación JSON",
      icon: KeyRound,
    },
    {
      id: "admin",
      code: "08",
      label: "SISTEMA & CLOUD",
      description: "Estado de sincronización con Supabase y catálogo",
      icon: Server,
    },
  ];

  const currentModule =
    navigationModules.find((m) => m.id === activeTab) || navigationModules[0];

  return (
    <div className="min-h-screen bg-[#F1F1F1] text-[#091197] flex flex-col">
      {showOnboarding && !isDemoMode && (
        <OnboardingModal
          initialProfile={realVault.profile}
          onCompleteOnboarding={handleCompleteOnboarding}
          onStartDemoInstead={() => {
            setShowOnboarding(false);
            handleEnterWithTestAccount("hogar_santo_domingo");
          }}
        />
      )}

      {/* ================= CABECERA FLOTANTE GRUPAMAR (.cheaderinner) ================= */}
      <header className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-3 pb-2 bg-[#F1F1F1]/85 backdrop-blur-md">
        <div className="max-w-[1640px] mx-auto bg-white border border-[#D9D9D9] rounded-[12px] min-h-[76px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_10px_28px_rgba(9,17,151,0.05)]">
          {/* Izquierda: Volver a Web + Logo */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={() => setViewMode("landing")}
              className="inline-flex items-center gap-2 h-[42px] px-3.5 rounded-[10px] border border-[#D9D9D9] hover:border-[#03A9EC] bg-[#F1F1F1] hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#03A9EC]" />
              <span className="hidden sm:inline">Web Corporativa</span>
            </button>

            <div className="h-7 w-px bg-[#D9D9D9] hidden sm:block" />

            <Energia360Logo size={36} showTagline={false} variant="light" />
          </div>

          {/* Centro: Selector de Expedientes / Perfiles de Prueba */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F1F1] p-1.5 rounded-[10px] border border-[#D9D9D9]">
            <span className="hidden xl:inline text-[10px] font-extrabold uppercase tracking-wider text-[#4B528A] px-2.5">
              EXPEDIENTE ACTIVO:
            </span>

            <button
              onClick={() => handleEnterWithTestAccount("hogar_santo_domingo")}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isDemoMode && activeTestPreset === "hogar_santo_domingo"
                  ? "bg-[#091197] text-white shadow-xs"
                  : "text-[#091197] hover:bg-white"
              }`}
            >
              Hogar SD · EDESUR
            </button>

            <button
              onClick={() => handleEnterWithTestAccount("apartamento_santiago")}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isDemoMode && activeTestPreset === "apartamento_santiago"
                  ? "bg-[#091197] text-white shadow-xs"
                  : "text-[#091197] hover:bg-white"
              }`}
            >
              Santiago · EDENORTE
            </button>

            <button
              onClick={() => handleEnterWithTestAccount("negocio_punta_cana")}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isDemoMode && activeTestPreset === "negocio_punta_cana"
                  ? "bg-[#091197] text-white shadow-xs"
                  : "text-[#091197] hover:bg-white"
              }`}
            >
              Punta Cana · CEPM
            </button>

            <button
              onClick={handleStartPersonalWorkspace}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                !isDemoMode
                  ? "bg-[#03A9EC] text-white shadow-xs"
                  : "bg-white text-[#091197] border border-[#03A9EC] hover:bg-[#03A9EC] hover:text-white"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mi Contrato</span>
            </button>
          </div>

          {/* Derecha: Estado de Concesión y Tarifa */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                {activeVault.profile.distributor} ·{" "}
                {activeSchedule.tariff_code}
              </div>
              <div className="text-xs font-extrabold uppercase text-[#091197] truncate max-w-[210px]">
                {activeVault.profile.spaceName}
              </div>
            </div>
            <Energia360DiamondPin active />
          </div>
        </div>
      </header>

      {/* ================= LAYOUT PRINCIPAL DEL PORTAL DE INGENIERÍA ================= */}
      <div className="max-w-[1640px] w-full mx-auto px-3 sm:px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* BARRA LATERAL ARQUITECTÓNICA DE MÓDULOS (3 columnas en Desktop) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-[104px] space-y-4">
          {/* Tarjeta Azul Real del Contrato Activo (.csectionsolucionesinner style) */}
          <div className="rounded-[12px] bg-[#091197] text-white p-5 border border-[#091197] relative overflow-hidden">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#03A9EC] mb-1">
              CONTRATO AUDITADO EN TIEMPO REAL
            </div>
            <h2 className="text-lg font-extrabold uppercase leading-tight truncate">
              {activeVault.profile.spaceName}
            </h2>
            <p className="text-xs text-white/75 mt-1">
              {activeVault.profile.province} · Pliego{" "}
              <strong className="text-[#03A9EC]">
                {activeVault.profile.distributor} ({activeSchedule.tariff_code})
              </strong>
            </p>

            <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase text-white/60 block font-bold">
                  CONSUMO BASE
                </span>
                <span className="text-base font-extrabold text-white">
                  {referenceKwhForSolar} kWh
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-white/60 block font-bold">
                  FACTURA EST.
                </span>
                <span className="text-base font-extrabold text-[#03A9EC]">
                  RD$ {Math.round(referenceBillForSolar).toLocaleString("es-DO")}
                </span>
              </div>
            </div>
          </div>

          {/* Menú de Módulos de Ingeniería */}
          <nav className="bg-white rounded-[12px] border border-[#D9D9D9] p-2.5 space-y-1">
            <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#4B528A] border-b border-[#D9D9D9] mb-1.5">
              MÓDULOS DE GESTIÓN ELÉCTRICA
            </div>
            {navigationModules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeTab === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveTab(mod.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-[10px] flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                    isActive
                      ? "bg-[#091197] text-white shadow-sm"
                      : "text-[#091197] hover:bg-[#F1F1F1]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                        isActive
                          ? "bg-[#03A9EC] text-white"
                          : "bg-[#F1F1F1] text-[#091197] group-hover:bg-[#03A9EC]/20"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-extrabold uppercase tracking-[0.04em] truncate">
                        {mod.label}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isActive ? "text-white/75" : "text-[#4B528A]"
                        }`}
                      >
                        {mod.description}
                      </div>
                    </div>
                  </div>

                  {mod.badge && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                        isActive
                          ? "bg-[#F75600] text-white"
                          : "bg-[#03A9EC]/15 text-[#091197]"
                      }`}
                    >
                      {mod.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ÁREA CENTRAL DE CONTENIDO DEL MÓDULO (9 columnas en Desktop) */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* Encabezado Editorial del Módulo Activo */}
          <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#03A9EC]">
                  MÓDULO {currentModule.code} · {activeVault.profile.distributor}
                </span>
                {isDemoMode && (
                  <span className="px-2 py-0.5 rounded bg-[#F1F1F1] border border-[#D9D9D9] text-[10px] font-extrabold uppercase text-[#091197]">
                    EXPEDIENTE DEMO INTERACTIVO
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#091197] mt-1">
                {currentModule.label}
              </h1>
              <p className="text-xs sm:text-sm text-[#4B528A] mt-0.5">
                {currentModule.description}
              </p>
            </div>

            {activeTab !== "facturas" && (
              <button
                onClick={() => setActiveTab("facturas")}
                className="inline-flex items-center gap-3 h-[46px] pl-4 pr-1.5 rounded-[10px] border border-[#03A9EC] bg-white hover:bg-[#091197] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all shrink-0 self-start sm:self-center group cursor-pointer"
              >
                <span>Auditar Recibo OCR</span>
                <span className="w-[34px] h-[34px] rounded-[8px] bg-[#091197] group-hover:bg-[#03A9EC] text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            )}
          </div>

          {/* Renderizado del Módulo Activo */}
          {activeTab === "dashboard" && (
            <DashboardModule
              vault={activeVault}
              activeSchedule={activeSchedule}
              triggeredAlerts={triggeredAlerts}
              isDemoMode={isDemoMode}
              onNavigateTab={(t) => setActiveTab(t as NavigationTab)}
              onLoadDemoMode={() =>
                handleEnterWithTestAccount("hogar_santo_domingo")
              }
            />
          )}

          {activeTab === "facturas" && (
            <InvoiceAnalyzerModule
              invoices={activeVault.invoices}
              defaultDistributor={activeVault.profile.distributor}
              activeSchedule={activeSchedule}
              onAddConfirmedInvoice={(inv: ElectricityInvoice) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  invoices: [...prev.invoices, inv],
                }));
                notify("Factura auditada y añadida al expediente.");
              }}
              onDeleteInvoice={(id: string) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  invoices: prev.invoices.filter((i) => i.id !== id),
                }));
                notify("Factura eliminada del expediente.");
              }}
            />
          )}

          {activeTab === "equipos" && (
            <ApplianceCalculatorModule
              appliances={activeVault.appliances}
              activeSchedule={activeSchedule}
              customRateDopPerKwh={activeVault.profile.customRateDopPerKwh}
              onAddAppliance={(app: UserAppliance) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  appliances: [app, ...prev.appliances],
                }));
                notify(`Equipo "${app.name}" incorporado al inventario.`);
              }}
              onUpdateApplianceHours={(id: string, dailyHours: number) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  appliances: prev.appliances.map((a) =>
                    a.id === id ? { ...a, dailyHours } : a
                  ),
                }));
              }}
              onDeleteAppliance={(id: string) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  appliances: prev.appliances.filter((a) => a.id !== id),
                }));
                notify("Equipo retirado del inventario.");
              }}
            />
          )}

          {activeTab === "inteligencia" && (
            <IntelligenceAndSavingsModule
              invoices={activeVault.invoices}
              appliances={activeVault.appliances}
              activeSchedule={activeSchedule}
              customRateDopPerKwh={activeVault.profile.customRateDopPerKwh}
              alertConfigs={activeVault.alertConfigs}
              triggeredAlerts={triggeredAlerts}
              onUpdateAlertConfig={(updated: AlertConfig) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  alertConfigs: prev.alertConfigs.map((c) =>
                    c.id === updated.id ? updated : c
                  ),
                }));
              }}
            />
          )}

          {activeTab === "solar_inversores" && (
            <SolarAndInverterModule
              defaultMonthlyKwh={referenceKwhForSolar}
              defaultMonthlyBillDop={referenceBillForSolar}
              defaultProvince={activeVault.profile.province}
              defaultPropertyType={activeVault.profile.propertyType}
              appliances={activeVault.appliances}
              inverterSystems={activeVault.inverterSystems}
              onAddInverterSystem={(sys: InverterBatterySystem) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  inverterSystems: [sys, ...prev.inverterSystems],
                }));
                notify(`Sistema de respaldo "${sys.name}" registrado.`);
              }}
              onDeleteInverterSystem={(id: string) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  inverterSystems: prev.inverterSystems.filter(
                    (s) => s.id !== id
                  ),
                }));
                notify("Sistema de respaldo eliminado.");
              }}
            />
          )}

          {(activeTab === "tarifas" ||
            activeTab === "privacidad" ||
            activeTab === "admin") && (
            <TariffsAndAdminModule
              vault={activeVault}
              encryptedEnvelope={encryptedEnvelope}
              activeSection={activeTab}
              onUpdateDistributorAndTariff={(
                distributor: DistributorCode,
                tariffCode: string,
                customRate: number | null
              ) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    distributor,
                    tariffCode,
                    customRateDopPerKwh: customRate,
                  },
                }));
                notify(`Pliego actualizado a ${distributor} (${tariffCode}).`);
              }}
              onUpdateTariffScheduleRate={(
                scheduleId: string,
                blockIndex: number,
                newRateDop: number
              ) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  customTariffs: prev.customTariffs.map((s) => {
                    if (s.id !== scheduleId) return s;
                    const updatedBlocks = s.energy_blocks.map((b, idx) =>
                      idx === blockIndex ? { ...b, rate_dop: newRateDop } : b
                    );
                    return {
                      ...s,
                      energy_blocks: updatedBlocks,
                      full_reset_rate_dop:
                        blockIndex === updatedBlocks.length - 1 &&
                        s.billing_mode === "tiered_with_threshold_reset"
                          ? newRateDop
                          : s.full_reset_rate_dop,
                    };
                  }),
                }));
              }}
              onChangeSubscriptionPlan={(plan: SubscriptionPlan) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, subscriptionPlan: plan },
                }));
                notify(`Modalidad cambiada a ${plan.toUpperCase()}.`);
              }}
              onCreateOrUpdateVaultPassphrase={async (passphrase: string) => {
                setActivePassphrase(passphrase);
                const env = await saveAndEncryptVault(realVault, passphrase);
                setEncryptedEnvelope(env);
                setHasExistingVault(true);
                notify("Bóveda cifrada con AES-256-GCM.");
              }}
              onExportVaultJson={handleExportVaultJson}
              onImportVaultJson={handleImportVaultJson}
              onWipeAllLocalData={handleWipeAllLocalData}
            />
          )}
        </main>
      </div>

      {/* Notificación Corporativa Estilo GrupaMar */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[12px] bg-[#091197] border-2 border-[#03A9EC] text-white px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider shadow-2xl flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#03A9EC]" />
          <span>{statusToast}</span>
        </div>
      )}
    </div>
  );
}
