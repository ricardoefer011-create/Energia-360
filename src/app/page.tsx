"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  Cpu,
  FileSpreadsheet,
  Hash,
  KeyRound,
  LayoutDashboard,
  Plus,
  Server,
  ShieldCheck,
  Sliders,
  Sun,
  Volume2,
  Zap,
} from "lucide-react";
import { Energia360Logo } from "@/components/brand/Energia360Logo";
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
    notify("Conectado al servidor de prueba.");
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
      notify("Tu servidor energético está listo.");
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#313338] border border-white/10 p-7 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg">Abrir Mi Bóveda Cifrada</h3>
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="text-xs font-bold text-[#B5BAC1] hover:text-white"
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
                  className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-4 py-3 text-sm text-white"
                />
                {unlockError && (
                  <div className="text-xs text-[#F23F43]">{unlockError}</div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-sm transition"
                >
                  Desbloquear
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  const mainChannels: Array<{
    id: NavigationTab;
    channelName: string;
    description: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "dashboard",
      channelName: "resumen-general",
      description: "Métricas de consumo, subsidio 700 kWh y costos en RD$",
      icon: LayoutDashboard,
    },
    {
      id: "facturas",
      channelName: "escaner-facturas",
      description: "Lector óptico local de recibos en PDF o foto",
      badge: "OCR",
      icon: FileSpreadsheet,
    },
    {
      id: "equipos",
      channelName: "calculadora-equipos",
      description: "Simula horas de uso de tus aires, nevera y equipos",
      icon: Calculator,
    },
    {
      id: "inteligencia",
      channelName: "ahorro-nitro-ia",
      description: "Recomendaciones inteligentes y simulador de 3 escenarios",
      badge: "IA",
      icon: Cpu,
    },
    {
      id: "solar_inversores",
      channelName: "solar-e-inversor",
      description: "Dimensionamiento solar por provincia y autonomía en apagón",
      icon: Sun,
    },
  ];

  const systemChannels: Array<{
    id: NavigationTab;
    channelName: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "tarifas",
      channelName: "tarifas-sie-rd",
      description: "Pliegos de EDESUR, EDENORTE, EDEESTE y CEPM",
      icon: Sliders,
    },
    {
      id: "privacidad",
      channelName: "boveda-aes256",
      description: "Cifrado local Zero-Access y respaldo en Supabase",
      icon: KeyRound,
    },
    {
      id: "admin",
      channelName: "estado-sistema",
      description: "Salud del sistema y conexión cloud",
      icon: Server,
    },
  ];

  const allChannels = [...mainChannels, ...systemChannels];
  const currentChannel =
    allChannels.find((c) => c.id === activeTab) || mainChannels[0];

  return (
    <div className="min-h-screen bg-[#313338] text-[#F2F3F5] flex">
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

      {/* 1. RIEL IZQUIERDO DE SERVIDORES ESTILO DISCORD (#1E1F22) */}
      <aside className="hidden sm:flex w-[74px] bg-[#1E1F22] flex-col items-center py-4 gap-3 shrink-0 select-none z-30">
        {/* Botón Volver a la Página Web */}
        <button
          onClick={() => setViewMode("landing")}
          title="Volver a la Página Web de Presentación"
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#5865F2] text-white flex items-center justify-center transition-all duration-200 group relative cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-8 h-[2px] bg-[#35363C] rounded-full my-0.5" />

        {/* Servidor Demo 1: Hogar Santo Domingo */}
        <div className="relative flex items-center">
          <span
            className={`absolute -left-3 w-2 rounded-r-full bg-white transition-all ${
              isDemoMode && activeTestPreset === "hogar_santo_domingo"
                ? "h-10"
                : "h-0"
            }`}
          />
          <button
            onClick={() => handleEnterWithTestAccount("hogar_santo_domingo")}
            title="Servidor Demo: Hogar Santo Domingo (EDESUR)"
            className={`w-12 h-12 font-black text-xs flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isDemoMode && activeTestPreset === "hogar_santo_domingo"
                ? "rounded-[16px] bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30"
                : "rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#5865F2] text-[#B5BAC1] hover:text-white"
            }`}
          >
            SD
          </button>
        </div>

        {/* Servidor Demo 2: Apartamento Santiago */}
        <div className="relative flex items-center">
          <span
            className={`absolute -left-3 w-2 rounded-r-full bg-white transition-all ${
              isDemoMode && activeTestPreset === "apartamento_santiago"
                ? "h-10"
                : "h-0"
            }`}
          />
          <button
            onClick={() => handleEnterWithTestAccount("apartamento_santiago")}
            title="Servidor Demo: Apartamento Santiago (EDENORTE)"
            className={`w-12 h-12 font-black text-xs flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isDemoMode && activeTestPreset === "apartamento_santiago"
                ? "rounded-[16px] bg-[#23A55A] text-white shadow-lg shadow-[#23A55A]/30"
                : "rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A55A] text-[#B5BAC1] hover:text-white"
            }`}
          >
            STI
          </button>
        </div>

        {/* Servidor Demo 3: Negocio Punta Cana */}
        <div className="relative flex items-center">
          <span
            className={`absolute -left-3 w-2 rounded-r-full bg-white transition-all ${
              isDemoMode && activeTestPreset === "negocio_punta_cana"
                ? "h-10"
                : "h-0"
            }`}
          />
          <button
            onClick={() => handleEnterWithTestAccount("negocio_punta_cana")}
            title="Servidor Demo: Negocio Punta Cana (CEPM)"
            className={`w-12 h-12 font-black text-xs flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isDemoMode && activeTestPreset === "negocio_punta_cana"
                ? "rounded-[16px] bg-[#EB459E] text-white shadow-lg shadow-[#EB459E]/30"
                : "rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#EB459E] text-[#B5BAC1] hover:text-white"
            }`}
          >
            PC
          </button>
        </div>

        {/* Botón Mi Espacio Personal */}
        <div className="relative flex items-center">
          <span
            className={`absolute -left-3 w-2 rounded-r-full bg-white transition-all ${
              !isDemoMode ? "h-10" : "h-0"
            }`}
          />
          <button
            onClick={handleStartPersonalWorkspace}
            title="Crear o Abrir Mi Espacio Personal"
            className={`w-12 h-12 flex items-center justify-center transition-all duration-200 cursor-pointer ${
              !isDemoMode
                ? "rounded-[16px] bg-[#23A55A] text-white"
                : "rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A55A] text-[#23A55A] hover:text-white"
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. BARRA DE CANALES ESTILO DISCORD (#2B2D31) */}
      <aside className="hidden lg:flex w-64 bg-[#2B2D31] flex-col justify-between shrink-0 select-none border-r border-black/20">
        <div>
          {/* Cabecera del Servidor */}
          <div className="h-14 px-4 border-b border-black/25 flex items-center justify-between shadow-2xs">
            <div className="truncate">
              <div className="font-extrabold text-sm text-white truncate">
                {activeVault.profile.spaceName}
              </div>
              <div className="text-[11px] font-bold text-[#57F287]">
                {activeVault.profile.distributor} ·{" "}
                {activeSchedule.tariff_code}
              </div>
            </div>
          </div>

          {/* Lista de Canales Principales */}
          <div className="p-3 space-y-5">
            <div>
              <div className="px-2 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#949BA4]">
                Canales de Energía
              </div>
              <div className="space-y-0.5">
                {mainChannels.map((ch) => {
                  const isActive = activeTab === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveTab(ch.id)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                        isActive
                          ? "bg-[#404249] text-white"
                          : "text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Hash className="w-4 h-4 shrink-0 text-[#80848E]" />
                        <span className="truncate">{ch.channelName}</span>
                      </span>
                      {ch.badge && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#5865F2] text-white">
                          {ch.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="px-2 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#949BA4]">
                Configuración &amp; Bóveda
              </div>
              <div className="space-y-0.5">
                {systemChannels.map((ch) => {
                  const isActive = activeTab === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveTab(ch.id)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                        isActive
                          ? "bg-[#404249] text-white"
                          : "text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]"
                      }`}
                    >
                      <Hash className="w-4 h-4 shrink-0 text-[#80848E]" />
                      <span className="truncate">{ch.channelName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canal de Voz / Estado Inversor en Vivo */}
            <div className="p-3 rounded-2xl bg-[#1E1F22] border border-white/5">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#57F287] mb-1">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" /> Red Eléctrica Activa
                </span>
                <span className="w-2 h-2 rounded-full bg-[#57F287] animate-ping" />
              </div>
              <p className="text-[11px] text-[#B5BAC1]">
                Pliego SIE sincronizado ({activeSchedule.distributor_code})
              </p>
            </div>
          </div>
        </div>

        {/* Barra Inferior de Usuario Estilo Discord (#23272A) */}
        <div className="p-3 bg-[#23272A] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center font-black text-xs text-white">
                {activeVault.profile.distributor.slice(0, 2)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23A55A] border-2 border-[#23272A]" />
            </div>
            <div className="truncate">
              <div className="text-xs font-extrabold text-white truncate">
                {isDemoMode ? "Usuario Demo" : "Mi Espacio"}
              </div>
              <div className="text-[10px] font-bold text-[#57F287] truncate">
                ● Online · {activeVault.profile.province}
              </div>
            </div>
          </div>

          <button
            onClick={() => setViewMode("landing")}
            title="Salir a la Página Web"
            className="p-2 rounded-lg bg-[#313338] hover:bg-[#5865F2] text-[#B5BAC1] hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Web
          </button>
        </div>
      </aside>

      {/* 3. ESCENARIO CENTRAL (#313338) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabecera Superior del Canal Activo */}
        <header className="sticky top-0 z-20 h-14 apple-glass border-b border-black/25 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 truncate">
            <button
              onClick={() => setViewMode("landing")}
              className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1E1F22] text-xs font-bold text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Web
            </button>
            <Hash className="w-5 h-5 text-[#80848E] shrink-0" />
            <span className="font-extrabold text-sm sm:text-base text-white truncate">
              {currentChannel.channelName}
            </span>
            <span className="hidden md:inline text-xs text-[#949BA4] truncate border-l border-white/10 pl-3 ml-1">
              {currentChannel.description}
            </span>
          </div>

          {/* Selector rápido de Servidores Demo en la barra superior */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleEnterWithTestAccount("hogar_santo_domingo")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                isDemoMode && activeTestPreset === "hogar_santo_domingo"
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#2B2D31] text-[#B5BAC1] hover:text-white"
              }`}
            >
              Hogar SD
            </button>
            <button
              onClick={() => handleEnterWithTestAccount("apartamento_santiago")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                isDemoMode && activeTestPreset === "apartamento_santiago"
                  ? "bg-[#23A55A] text-white"
                  : "bg-[#2B2D31] text-[#B5BAC1] hover:text-white"
              }`}
            >
              Santiago
            </button>
            <button
              onClick={() => handleEnterWithTestAccount("negocio_punta_cana")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                isDemoMode && activeTestPreset === "negocio_punta_cana"
                  ? "bg-[#EB459E] text-white"
                  : "bg-[#2B2D31] text-[#B5BAC1] hover:text-white"
              }`}
            >
              Negocio
            </button>
          </div>
        </header>

        {/* Navegación móvil de canales (visible en pantallas pequeñas/medianas) */}
        <div className="lg:hidden bg-[#2B2D31] px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-black/20">
          {allChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveTab(ch.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap flex items-center gap-1 transition ${
                activeTab === ch.id
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#1E1F22] text-[#B5BAC1]"
              }`}
            >
              <span># {ch.channelName}</span>
            </button>
          ))}
        </div>

        {/* Contenido Principal del Canal */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
                notify("Factura guardada en tu canal.");
              }}
              onDeleteInvoice={(id: string) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  invoices: prev.invoices.filter((i) => i.id !== id),
                }));
                notify("Factura eliminada.");
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
                notify(`"${app.name}" agregado a tus equipos.`);
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
                notify("Equipo eliminado.");
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
                notify(`Sistema "${sys.name}" agregado.`);
              }}
              onDeleteInverterSystem={(id: string) => {
                updateCurrentVault((prev) => ({
                  ...prev,
                  inverterSystems: prev.inverterSystems.filter(
                    (s) => s.id !== id
                  ),
                }));
                notify("Sistema eliminado.");
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
                notify(`Tarifa actualizada a ${distributor} (${tariffCode}).`);
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
                notify(`Plan cambiado a ${plan.toUpperCase()}.`);
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

      {/* Notificación Flotante Estilo Discord */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-[#5865F2] text-white px-5 py-3 text-xs font-extrabold shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#57F287]" />
          <span>{statusToast}</span>
        </div>
      )}
    </div>
  );
}
