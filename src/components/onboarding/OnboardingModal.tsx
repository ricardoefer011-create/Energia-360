"use client";

import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Home,
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
  const [passphrase, setPassphrase] = useState("");
  const [loadStarterAppliances, setLoadStarterAppliances] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleFinish}
        className="w-full max-w-xl rounded-3xl bg-white border border-black/10 p-6 sm:p-8 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3]">
            <ShieldCheck className="w-3.5 h-3.5" /> Configurar Mi Espacio
          </span>
          <button
            type="button"
            onClick={onStartDemoInstead}
            className="text-xs font-semibold text-[#0071E3] hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> O usar Usuario de Prueba
          </button>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
          Personaliza tu hogar o negocio
        </h2>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
            Nombre de tu espacio
          </label>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-4 py-3 text-sm text-[#1D1D1F]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] mb-1.5">
            Tipo de propiedad
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {(
              [
                { id: "hogar", label: "Hogar", icon: Home },
                { id: "apartamento", label: "Apartamento", icon: Building2 },
                { id: "pequeno_negocio", label: "Negocio", icon: Store },
                { id: "empresa", label: "Empresa", icon: Building2 },
                { id: "instalacion_solar", label: "Solar", icon: Sun },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = propertyType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPropertyType(item.id)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                    active
                      ? "border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3] font-bold"
                      : "border-black/10 bg-[#F5F5F7] text-[#6E6E73]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
              Distribuidora Eléctrica
            </label>
            <select
              value={distributor}
              onChange={(e) =>
                setDistributor(e.target.value as DistributorCode)
              }
              className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs font-semibold text-[#1D1D1F]"
            >
              <option value="EDESUR">EDESUR</option>
              <option value="EDENORTE">EDENORTE</option>
              <option value="EDEESTE">EDEESTE</option>
              <option value="CEPM">CEPM (Punta Cana / Bávaro)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
              Provincia
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs text-[#1D1D1F]"
            >
              {Object.keys(RD_PROVINCES_SOLAR_HSP).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
            Contraseña Maestra Local Opcional (mín. 8 caracteres)
          </label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Dejar en blanco si prefieres configurarla más tarde"
            className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-4 py-2.5 text-xs text-[#1D1D1F]"
          />
        </div>

        <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#F5F5F7] cursor-pointer text-xs text-[#1D1D1F]">
          <input
            type="checkbox"
            checked={loadStarterAppliances}
            onChange={(e) => setLoadStarterAppliances(e.target.checked)}
            className="rounded accent-[#0071E3]"
          />
          <span>
            Incluir 4 equipos básicos de ejemplo (Nevera, Aire, Abanico y Luces
            LED) para empezar sin necesidad de factura.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{submitting ? "Preparando..." : "Comenzar Ahora"}</span>
        </button>
      </form>
    </div>
  );
}
