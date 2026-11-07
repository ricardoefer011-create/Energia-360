"use client";

import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Home,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
} from "lucide-react";
import {
  DistributorCode,
  PropertyType,
  UserWorkspaceProfile,
} from "@/types/energia360";
import { RD_PROVINCES_SOLAR_HSP } from "@/lib/data/rd-energy-catalog";

interface OnboardingModalProps {
  initialProfile: UserWorkspaceProfile;
  onCompleteOnboarding: (
    updatedProfile: UserWorkspaceProfile,
    masterPassphrase: string | null,
    loadStarterAppliances: boolean
  ) => Promise<void>;
  onStartDemoInstead: () => void;
}

export function OnboardingModal({
  initialProfile,
  onCompleteOnboarding,
  onStartDemoInstead,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [spaceName, setSpaceName] = useState(
    initialProfile.spaceName || "Mi Hogar en Santo Domingo"
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    initialProfile.propertyType || "hogar"
  );
  const [distributor, setDistributor] = useState<DistributorCode>(
    initialProfile.distributor || "EDESUR"
  );
  const [province, setProvince] = useState(
    initialProfile.province || "Santo Domingo"
  );
  const [monthlySavingsGoalDop, setMonthlySavingsGoalDop] = useState(1500);
  const [passphrase, setPassphrase] = useState("");
  const [loadStarterAppliances, setLoadStarterAppliances] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish() {
    setSubmitting(true);
    const tariffCode =
      distributor === "CEPM"
        ? "RES-CEPM"
        : propertyType === "pequeno_negocio" || propertyType === "empresa"
        ? "BTS-2"
        : "BTS-1";

    const updated: UserWorkspaceProfile = {
      ...initialProfile,
      spaceName: spaceName.trim() || "Mi Espacio Energético",
      propertyType,
      distributor,
      tariffCode,
      province,
      monthlySavingsGoalDop,
      onboardingCompleted: true,
    };

    await onCompleteOnboarding(
      updated,
      passphrase.trim().length >= 8 ? passphrase.trim() : null,
      loadStarterAppliances
    );
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl">
        {/* Indicador de pasos */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
          <span className="font-bold text-sky-400 uppercase tracking-wider">
            Configuración Inicial ENERGIA360 — Paso {step} de 3
          </span>
          <button
            type="button"
            onClick={onStartDemoInstead}
            className="text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" /> Explorar Modo Demostración
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Filosofía Zero-Access y
              Privacidad por Diseño
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Entiende tu consumo. Controla tu energía. Reduce tus gastos.
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Bienvenido a <strong>ENERGIA360</strong>. A diferencia de otras
              plataformas, aquí{" "}
              <strong className="text-emerald-400">
                tú eres el único dueño de tus datos
              </strong>
              :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-100 mb-1">
                  1. Procesamiento 100% Local
                </div>
                <p className="text-slate-400">
                  Tus facturas se analizan en tu navegador y no se almacenan en
                  servidores centrales ni se comparten con distribuidoras.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-100 mb-1">
                  2. Cifrado AES-256-GCM
                </div>
                <p className="text-slate-400">
                  Tu bóveda se guarda en <code>IndexedDB</code> cifrada con tu
                  contraseña maestra. Funciona incluso sin conexión a internet.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
              >
                Continuar: Configurar Mi Vivienda o Negocio &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold">
              Configura tu Espacio y Distribuidora en República Dominicana
            </h2>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nombre de tu espacio energético
              </label>
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Tipo de inmueble o instalación
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {(
                  [
                    { id: "hogar", label: "Hogar", icon: Home },
                    { id: "apartamento", label: "Apartamento", icon: Building2 },
                    {
                      id: "pequeno_negocio",
                      label: "Pequeño Negocio",
                      icon: Store,
                    },
                    { id: "empresa", label: "Empresa", icon: Building2 },
                    {
                      id: "instalacion_solar",
                      label: "Solar / Híbrido",
                      icon: Sun,
                    },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = propertyType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPropertyType(item.id)}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                        active
                          ? "border-sky-500 bg-sky-500/15 text-sky-300 font-bold"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Distribuidora Eléctrica
                </label>
                <select
                  value={distributor}
                  onChange={(e) =>
                    setDistributor(e.target.value as DistributorCode)
                  }
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100 font-semibold"
                >
                  <option value="EDESUR">EDESUR</option>
                  <option value="EDENORTE">EDENORTE</option>
                  <option value="EDEESTE">EDEESTE</option>
                  <option value="CEPM">CEPM (Bávaro / Punta Cana)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Provincia (Para Horas Solares Pico)
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-100"
                >
                  {Object.keys(RD_PROVINCES_SOLAR_HSP).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                &larr; Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
              >
                Continuar: Bóveda Privada y Equipos &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold">
              Protege tu Espacio Privado (Sin obligación de subir factura)
            </h2>
            <p className="text-xs text-slate-400">
              Puedes usar la calculadora de equipos desde el primer momento sin
              subir ninguna factura. Si defines una contraseña maestra ahora,
              tus datos quedarán cifrados con <strong>AES-256-GCM</strong> en{" "}
              <code>IndexedDB</code>.
            </p>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Contraseña Maestra Local (Opcional ahora, recomendada — mín. 8
                caracteres)
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Ej. MiClaveEnergiaRD2026! (Dejar en blanco si prefieres configurarla luego)"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100"
              />
              <span className="text-[11px] text-amber-400/90 block mt-1">
                Importante: No existe recuperación administrativa de esta clave.
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Objetivo mensual de ahorro (RD$)
              </label>
              <input
                type="number"
                min={200}
                step={100}
                value={monthlySavingsGoalDop}
                onChange={(e) =>
                  setMonthlySavingsGoalDop(parseInt(e.target.value, 10) || 1000)
                }
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-100"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={loadStarterAppliances}
                onChange={(e) => setLoadStarterAppliances(e.target.checked)}
                className="mt-0.5 rounded accent-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">
                  Pre-cargar 4 equipos básicos orientativos (Nevera, A/C,
                  Abanico e Iluminación LED)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Te permite usar la calculadora inmediatamente sin tener una
                  factura a mano. Puedes editarlos o borrarlos en cualquier
                  momento.
                </span>
              </div>
            </label>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                &larr; Atrás
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting
                  ? "Creando espacio..."
                  : "Acceder a Mi Plataforma ENERGIA360"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

