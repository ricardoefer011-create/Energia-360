"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  Cpu,
  FileSpreadsheet,
  KeyRound,
  LayoutDashboard,
  Server,
  ShieldCheck,
  Sliders,
  Sun,
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
  // Por defecto mostramos primero la Página Web de Presentación en Blanco y Gris Suave
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");

  // Bóveda Personal vs Usuario de Prueba Activo
  const [realVault, setRealVault] = useState<LocalVaultPayload>(() =>
    createEmptyVaultPayload()
  );
  const [demoVault, setDemoVault] = useState<LocalVaultPayload>(() =>
    createSyntheticDemoData()
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [activeTestPreset, setActiveTestPreset] =
    useState<TestAccountPresetId>("hogar_santo_domingo");

  // Estado Criptográfico
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
    notify("Sesión iniciada con Usuario de Prueba precargado.");
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
      notify("Tu espacio energético está listo.");
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

  // Si estamos en la vista de Portada Web ("landing"), renderizamos primero la página web
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
          <div className="fixed inset-0 z-50 bg-zinc-900/30 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white border border-zinc-200 p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-zinc-900">
                  Abrir Mi Bóveda Cifrada
                </h3>
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
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
                  className="w-full rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-900"
                />
                {unlockError && (
                  <div className="text-xs text-zinc-800">{unlockError}</div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
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

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
    { id: "facturas", label: "Facturas", icon: FileSpreadsheet },
    { id: "equipos", label: "Mis Equipos", icon: Calculator },
    { id: "inteligencia", label: "Ahorro e IA", icon: Cpu },
    { id: "solar_inversores", label: "Solar e Inversor", icon: Sun },
    { id: "tarifas", label: "Tarifas RD", icon: Sliders },
    { id: "privacidad", label: "Privacidad", icon: KeyRound },
    { id: "admin", label: "Estado Sistema", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col">
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

      {/* Barra Superior Limpia en Blanco y Gris Suave */}
      <header className="sticky top-0 z-30 apple-glass border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode("landing")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 text-zinc-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Página Web</span>
            </button>
            <Energia360Logo size={32} />
          </div>

          {/* Selector Rápido de Usuario de Prueba o Espacio Propio */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 border border-zinc-200/80 p-1 rounded-full text-xs font-semibold">
              <button
                onClick={() => handleEnterWithTestAccount("hogar_santo_domingo")}
                className={`px-3 py-1.5 rounded-full transition ${
                  isDemoMode && activeTestPreset === "hogar_santo_domingo"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Demo Hogar SD
              </button>
              <button
                onClick={() =>
                  handleEnterWithTestAccount("apartamento_santiago")
                }
                className={`px-3 py-1.5 rounded-full transition ${
                  isDemoMode && activeTestPreset === "apartamento_santiago"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Demo Apto Santiago
              </button>
              <button
                onClick={() => handleEnterWithTestAccount("negocio_punta_cana")}
                className={`px-3 py-1.5 rounded-full transition ${
                  isDemoMode && activeTestPreset === "negocio_punta_cana"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Demo Negocio
              </button>
              <button
                onClick={handleStartPersonalWorkspace}
                className={`px-3 py-1.5 rounded-full transition ${
                  !isDemoMode
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Mi Espacio
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Principal con Sidebar Minimalista */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar de Navegación */}
        <aside className="lg:col-span-3 xl:col-span-2">
          <nav className="apple-card p-2.5 flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-22">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 whitespace-nowrap transition ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área de Contenido */}
        <main className="lg:col-span-9 xl:col-span-10">
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
                notify("Factura guardada correctamente.");
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

      {/* Notificación Flotante */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-zinc-900 text-white px-5 py-3 text-xs font-semibold shadow-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-zinc-300" />
          <span>{statusToast}</span>
        </div>
      )}
    </div>
  );
}
