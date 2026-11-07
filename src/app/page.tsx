"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Cpu,
  FileSpreadsheet,
  KeyRound,
  LayoutDashboard,
  Lock,
  Moon,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Unlock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Energia360Logo } from "@/components/brand/Energia360Logo";
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
  RD_APPLIANCE_LIBRARY,
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
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [isLightMode, setIsLightMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Estado de Bóveda Real vs Modo Demo Sintético Aislado
  const [realVault, setRealVault] = useState<LocalVaultPayload>(() =>
    createEmptyVaultPayload()
  );
  const [demoVault, setDemoVault] = useState<LocalVaultPayload>(() =>
    createSyntheticDemoData()
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Estado Criptográfico Zero-Access
  const [activePassphrase, setActivePassphrase] = useState<string | null>(null);
  const [encryptedEnvelope, setEncryptedEnvelope] =
    useState<EncryptedEnvelope | null>(null);
  const [vaultLockedOnDisk, setVaultLockedOnDisk] = useState<boolean>(false);
  const [unlockPassphraseInput, setUnlockPassphraseInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const activeVault = isDemoMode ? demoVault : realVault;

  // Registro de PWA Service Worker, detección de conectividad y bóveda en IndexedDB
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso en modo dev
      });
    }

    // Verificar si existe bóveda cifrada previa en IndexedDB
    hasEncryptedVaultInIndexedDB().then(async (exists) => {
      if (exists) {
        const env = await loadEncryptedEnvelopeFromIndexedDB().catch(
          () => null
        );
        setEncryptedEnvelope(env);
        setVaultLockedOnDisk(true);
      } else {
        setShowOnboarding(true);
      }
    });

    // Sincronizar pliegos tarifarios públicos desde Supabase si está configurado
    fetchPublicTariffSchedules().then(({ schedules, source }) => {
      if (source === "supabase_remote" && schedules.length > 0) {
        setRealVault((prev) => ({ ...prev, customTariffs: schedules }));
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Alternar tema claro / oscuro
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isLightMode) {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, [isLightMode]);

  function notify(msg: string) {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  }

  // Persistencia automática en IndexedDB cuando el usuario tiene contraseña maestra activa
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
      } catch {
        // Mantiene estado en memoria si falla escritura local
      }
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
      setVaultLockedOnDisk(false);
      setIsDemoMode(false);
      setUnlockPassphraseInput("");
      notify("Bóveda local descifrada con éxito (AES-256-GCM verificado).");
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
      notify(
        "Espacio privado creado y cifrado en IndexedDB con AES-256-GCM."
      );
    } else {
      notify("Espacio energético configurado correctamente.");
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
    notify("Copia de tus datos exportada en formato JSON.");
  }

  function handleImportVaultJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr) as LocalVaultPayload;
      if (!parsed.profile || !Array.isArray(parsed.appliances)) {
        throw new Error("Formato de archivo no válido.");
      }
      setIsDemoMode(false);
      setRealVault(parsed);
      if (activePassphrase) {
        saveAndEncryptVault(parsed, activePassphrase).then(
          setEncryptedEnvelope
        );
      }
      notify("Datos restaurados correctamente desde el archivo JSON.");
    } catch {
      notify("Error al restaurar: el archivo JSON no tiene un formato válido.");
    }
  }

  async function handleWipeAllLocalData() {
    await wipeLocalVaultCompletely();
    setRealVault(createEmptyVaultPayload());
    setActivePassphrase(null);
    setEncryptedEnvelope(null);
    setVaultLockedOnDisk(false);
    setIsDemoMode(false);
    setShowOnboarding(true);
    notify(
      "Eliminación verificada: todos los datos locales e IndexedDB han sido borrados."
    );
  }

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "facturas", label: "Analizador Facturas", icon: FileSpreadsheet },
    { id: "equipos", label: "Calculadora Equipos", icon: Calculator },
    { id: "inteligencia", label: "Inteligencia & Ahorro", icon: Cpu },
    { id: "solar_inversores", label: "Solar & Inversores", icon: Sun },
    { id: "tarifas", label: "Tarifas RD & Planes", icon: Sliders },
    { id: "privacidad", label: "Privacidad Zero-Access", icon: KeyRound },
    { id: "admin", label: "Panel Admin", icon: Server },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Modal de Desbloqueo Criptográfico cuando existe bóveda cifrada en IndexedDB */}
      {vaultLockedOnDisk && !isDemoMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg">
                  Bóveda Local Cifrada (AES-256-GCM)
                </h2>
                <p className="text-xs text-slate-400">
                  Introduce tu contraseña maestra para descifrar tus datos en
                  memoria local.
                </p>
              </div>
            </div>

            <form onSubmit={handleUnlockVault} className="space-y-3">
              <input
                type="password"
                required
                value={unlockPassphraseInput}
                onChange={(e) => setUnlockPassphraseInput(e.target.value)}
                placeholder="Contraseña maestra..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100"
              />
              {unlockError && (
                <div className="text-xs text-rose-400">{unlockError}</div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                Descifrar y Abrir Mi Espacio
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsDemoMode(true);
                  setVaultLockedOnDisk(false);
                }}
                className="text-amber-400 hover:underline font-medium"
              >
                Explorar Modo Demo Sintético
              </button>
              <button
                type="button"
                onClick={handleWipeAllLocalData}
                className="text-rose-400 hover:underline"
              >
                Reiniciar bóveda desde cero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistente de Bienvenida / Configuración Inicial */}
      {showOnboarding && !vaultLockedOnDisk && !isDemoMode && (
        <OnboardingModal
          initialProfile={realVault.profile}
          onCompleteOnboarding={handleCompleteOnboarding}
          onStartDemoInstead={() => {
            setShowOnboarding(false);
            setIsDemoMode(true);
            notify(
              "Modo Demostración activado con datos sintéticos (separados de tus datos reales)."
            );
          }}
        />
      )}

      {/* Barra Superior de Demostración cuando está activa (Sección 12) */}
      {isDemoMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>EXPERIENCIA DE DEMOSTRACIÓN ACTIVA:</strong> Estás
              explorando datos sintéticos demostrativos de un hogar en Santo
              Domingo. Nunca se mezclan con tus datos privados reales.
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(false)}
            className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
          >
            Salir de Demo y Volver a Mi Espacio Privado
          </button>
        </div>
      )}

      {/* Header Principal */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#060D1E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Energia360Logo size={38} showTagline />

          <div className="flex flex-wrap items-center gap-2">
            {/* Estado Offline / Online PWA */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              {isOnline ? "Local-First Activo" : "Modo Sin Conexión (Offline)"}
            </span>

            {/* Estado de Cifrado */}
            <button
              onClick={() => setActiveTab("privacidad")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                encryptedEnvelope
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500/50"
              }`}
            >
              {encryptedEnvelope ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  AES-256-GCM Activo
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  Configurar Clave Maestra
                </>
              )}
            </button>

            {/* Conmutador Modo Demo vs Espacio Privado */}
            <button
              onClick={() => setIsDemoMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                isDemoMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-900 text-slate-200 border-slate-800 hover:border-amber-500/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {isDemoMode ? "Modo Demo Activo" : "Ver Demo Sintética"}
            </button>

            {/* Conmutador Claro / Oscuro */}
            <button
              onClick={() => setIsLightMode((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Cambiar entre modo oscuro y claro"
            >
              {isLightMode ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Barra de Navegación Modular */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <nav className="flex items-center gap-1 py-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition ${
                    isActive
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Notificación flotante de confirmación */}
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 text-xs text-emerald-300 shadow-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "dashboard" && (
          <DashboardModule
            vault={activeVault}
            activeSchedule={activeSchedule}
            triggeredAlerts={triggeredAlerts}
            isDemoMode={isDemoMode}
            onNavigateTab={(t) => setActiveTab(t as NavigationTab)}
            onLoadDemoMode={() => setIsDemoMode(true)}
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
              notify(
                "Factura confirmada y cifrada en tu bóveda local. Documento original descartado."
              );
            }}
            onDeleteInvoice={(id: string) => {
              updateCurrentVault((prev) => ({
                ...prev,
                invoices: prev.invoices.filter((i) => i.id !== id),
              }));
              notify("Factura eliminada de tu historial local.");
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
              notify(`Equipo "${app.name}" añadido al inventario.`);
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
              notify("Equipo eliminado del inventario.");
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
              notify(`Sistema "${sys.name}" registrado correctamente.`);
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
              notify(
                `Tarifa actualizada a ${distributor} (${tariffCode}).`
              );
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
              notify(`Plan comercial cambiado a: ${plan.toUpperCase()}.`);
            }}
            onCreateOrUpdateVaultPassphrase={async (passphrase: string) => {
              setActivePassphrase(passphrase);
              const env = await saveAndEncryptVault(realVault, passphrase);
              setEncryptedEnvelope(env);
              notify("Bóveda local cifrada con AES-256-GCM en IndexedDB.");
            }}
            onExportVaultJson={handleExportVaultJson}
            onImportVaultJson={handleImportVaultJson}
            onWipeAllLocalData={handleWipeAllLocalData}
          />
        )}
      </main>

      {/* Footer de Transparencia y Privacidad */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-slate-300">ENERGIA360</strong> — Plataforma
            Independiente de Inteligencia Energética · República Dominicana
            (Zona horaria: America/Santo_Domingo · Moneda: RD$)
          </div>
          <div className="flex items-center gap-4">
            <span>Arquitectura Local-First + Supabase Zero-Access</span>
            <span>Sin rastreadores publicitarios</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

