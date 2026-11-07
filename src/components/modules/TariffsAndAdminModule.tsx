"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  KeyRound,
  Server,
  Upload,
} from "lucide-react";
import {
  DistributorCode,
  LocalVaultPayload,
  SubscriptionPlan,
} from "@/types/energia360";
import { EncryptedEnvelope } from "@/lib/crypto/vault-crypto";
import {
  getSupabaseConfigurationStatus,
  syncEncryptedVaultToSupabase,
} from "@/lib/supabase/client";

interface TariffsAndAdminModuleProps {
  vault: LocalVaultPayload;
  encryptedEnvelope: EncryptedEnvelope | null;
  activeSection: "tarifas" | "privacidad" | "admin";
  onUpdateDistributorAndTariff: (
    distributor: DistributorCode,
    tariffCode: string,
    customRate: number | null
  ) => void;
  onUpdateTariffScheduleRate: (
    scheduleId: string,
    blockIndex: number,
    newRateDop: number
  ) => void;
  onChangeSubscriptionPlan: (plan: SubscriptionPlan) => void;
  onCreateOrUpdateVaultPassphrase: (passphrase: string) => Promise<void>;
  onExportVaultJson: () => void;
  onImportVaultJson: (jsonString: string) => void;
  onWipeAllLocalData: () => Promise<void>;
}

const PLANS_CATALOG: Array<{
  id: SubscriptionPlan;
  name: string;
  target: string;
  features: string[];
}> = [
  {
    id: "gratuito",
    name: "Plan Gratuito",
    target: "Inicio rápido",
    features: [
      "Calculadora de consumo por equipos",
      "Analizador local de facturas",
      "Dashboard con tarifas SIE",
    ],
  },
  {
    id: "hogar",
    name: "Nitro Hogar",
    target: "Familias y apartamentos",
    features: [
      "Historial completo de facturas",
      "Simulador de ahorro en 3 escenarios",
      "Simulador Solar y autonomía de inversor",
    ],
  },
  {
    id: "negocios",
    name: "Nitro Negocios",
    target: "Comercios y PyMEs",
    features: [
      "Tarifas comerciales BTS-2 y CEPM",
      "Equipos de refrigeración comercial",
      "Respaldo cifrado E2EE en Supabase",
    ],
  },
  {
    id: "empresarial",
    name: "Nitro Empresarial",
    target: "Múltiples sucursales",
    features: [
      "Gestión multi-instalación",
      "Auditoría tarifaria ejecutiva",
      "Dimensionamiento solar comercial",
    ],
  },
];

export function TariffsAndAdminModule({
  vault,
  encryptedEnvelope,
  activeSection,
  onUpdateDistributorAndTariff,
  onUpdateTariffScheduleRate,
  onChangeSubscriptionPlan,
  onCreateOrUpdateVaultPassphrase,
  onExportVaultJson,
  onImportVaultJson,
  onWipeAllLocalData,
}: TariffsAndAdminModuleProps) {
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [cryptoStatusMessage, setCryptoStatusMessage] = useState<string | null>(
    null
  );
  const [supabaseSyncMessage, setSupabaseSyncMessage] = useState<string | null>(
    null
  );
  const [confirmWipeText, setConfirmWipeText] = useState("");

  const supabaseConfig = getSupabaseConfigurationStatus();

  async function handlePassphraseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passphraseInput.length < 8) {
      setCryptoStatusMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passphraseInput !== passphraseConfirm) {
      setCryptoStatusMessage("Las contraseñas no coinciden.");
      return;
    }
    try {
      await onCreateOrUpdateVaultPassphrase(passphraseInput);
      setPassphraseInput("");
      setPassphraseConfirm("");
      setCryptoStatusMessage(
        "Bóveda cifrada con éxito con AES-256-GCM en tu dispositivo."
      );
    } catch (err) {
      setCryptoStatusMessage(
        err instanceof Error ? err.message : "Error al cifrar."
      );
    }
  }

  async function handleSyncE2eeToSupabase() {
    if (!encryptedEnvelope) {
      setSupabaseSyncMessage(
        "Configura primero tu contraseña maestra a la izquierda antes de sincronizar."
      );
      return;
    }
    const res = await syncEncryptedVaultToSupabase(encryptedEnvelope);
    setSupabaseSyncMessage(res.message);
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImportVaultJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (activeSection === "tarifas") {
    return (
      <div className="space-y-6">
        <div className="apple-card p-6 sm:p-8">
          <h2 className="font-black text-xl sm:text-2xl text-white mb-1">
            ⚡ Tarifas Eléctricas de República Dominicana (SIE)
          </h2>
          <p className="text-xs text-[#B5BAC1] mb-6">
            Elige tu distribuidora o ajusta el precio de cualquier escalón sin
            tocar código.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-5 rounded-3xl bg-[#1E1F22] border border-white/5">
            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                Distribuidora
              </label>
              <select
                value={vault.profile.distributor}
                onChange={(e) => {
                  const dist = e.target.value as DistributorCode;
                  const defaultCode = dist === "CEPM" ? "RES-CEPM" : "BTS-1";
                  onUpdateDistributorAndTariff(
                    dist,
                    defaultCode,
                    vault.profile.customRateDopPerKwh
                  );
                }}
                className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs font-black text-white"
              >
                <option value="EDESUR">EDESUR</option>
                <option value="EDENORTE">EDENORTE</option>
                <option value="EDEESTE">EDEESTE</option>
                <option value="CEPM">CEPM (Bávaro / Punta Cana)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                Categoría Tarifaria
              </label>
              <select
                value={vault.profile.tariffCode}
                onChange={(e) =>
                  onUpdateDistributorAndTariff(
                    vault.profile.distributor,
                    e.target.value,
                    vault.profile.customRateDopPerKwh
                  )
                }
                className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs text-white"
              >
                {vault.profile.distributor === "CEPM" ? (
                  <option value="RES-CEPM">RES-CEPM</option>
                ) : (
                  <>
                    <option value="BTS-1">BTS-1 (Residencial)</option>
                    <option value="BTS-2">BTS-2 (Comercial)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                Tarifa Personalizada Opcional (RD$/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Usar bloques oficiales SIE"
                value={vault.profile.customRateDopPerKwh ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseFloat(e.target.value)
                    : null;
                  onUpdateDistributorAndTariff(
                    vault.profile.distributor,
                    vault.profile.tariffCode,
                    val
                  );
                }}
                className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            {vault.customTariffs.map((sched) => (
              <div
                key={sched.id}
                className="p-5 rounded-3xl bg-[#1E1F22] border border-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-black text-sm text-white">
                    {sched.distributor_code} — {sched.category_name}
                  </span>
                  <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-[#5865F2] text-white">
                    {sched.is_official_sie ? "Oficial SIE" : "Orientativa"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {sched.energy_blocks.map((blk, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#2B2D31] flex items-center justify-between text-xs"
                    >
                      <span className="text-[#B5BAC1]">
                        {blk.max_kwh
                          ? `${blk.min_kwh}–${blk.max_kwh} kWh`
                          : `>= ${blk.min_kwh} kWh`}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[#B5BAC1]">RD$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={blk.rate_dop}
                          onChange={(e) =>
                            onUpdateTariffScheduleRate(
                              sched.id,
                              idx,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 rounded-lg bg-[#1E1F22] px-2 py-1 text-right font-black text-[#57F287]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planes Estilo Discord Nitro */}
        <div className="apple-card p-6 sm:p-8">
          <h3 className="font-black text-xl text-white mb-4">
            🚀 Planes estilo Nitro Energético
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS_CATALOG.map((plan) => {
              const isCurrent = vault.profile.subscriptionPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-3xl flex flex-col justify-between ${
                    isCurrent
                      ? "bg-[#1E1F22] border-2 border-[#EB459E] shadow-lg"
                      : "bg-[#1E1F22] border border-white/5"
                  }`}
                >
                  <div>
                    <div className="font-black text-base text-white">
                      {plan.name}
                    </div>
                    <p className="text-xs text-[#B5BAC1] mb-3">{plan.target}</p>
                    <ul className="space-y-1.5 text-xs text-white/90">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#57F287] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeSubscriptionPlan(plan.id)}
                    className={`mt-5 w-full py-2.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                      isCurrent
                        ? "bg-[#EB459E] text-white"
                        : "bg-[#2B2D31] text-white hover:bg-[#5865F2]"
                    }`}
                  >
                    {isCurrent ? "Plan Activo" : "Activar Plan"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === "privacidad") {
    return (
      <div className="space-y-6">
        <div className="apple-card p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#23A55A]/20 text-[#57F287] flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-xl sm:text-2xl text-white">
                🔒 Privacidad Zero-Access y Cifrado AES-256-GCM
              </h2>
              <p className="text-xs text-[#B5BAC1] mt-1">
                Protege tus datos locales con una contraseña maestra y
                sincroniza un respaldo cifrado en Supabase.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form
              onSubmit={handlePassphraseSubmit}
              className="p-6 rounded-3xl bg-[#1E1F22] border border-white/5 space-y-3.5"
            >
              <h4 className="font-black text-sm text-white">
                Definir Contraseña Maestra Local
              </h4>
              <input
                type="password"
                required
                minLength={8}
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="Nueva contraseña (mínimo 8 caracteres)"
                className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-4 py-2.5 text-xs text-white"
              />
              <input
                type="password"
                required
                minLength={8}
                value={passphraseConfirm}
                onChange={(e) => setPassphraseConfirm(e.target.value)}
                placeholder="Confirmar contraseña"
                className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-4 py-2.5 text-xs text-white"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs transition cursor-pointer"
              >
                Cifrar Mi Bóveda con AES-256-GCM
              </button>
              {cryptoStatusMessage && (
                <div className="text-xs text-[#57F287] font-bold">
                  {cryptoStatusMessage}
                </div>
              )}
            </form>

            <div className="p-6 rounded-3xl bg-[#1E1F22] border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="font-black text-sm text-white mb-2">
                  Estado Criptográfico y Respaldo en Supabase
                </h4>
                <p className="text-xs text-[#B5BAC1] mb-4">
                  {encryptedEnvelope
                    ? `Cifrado activo (${encryptedEnvelope.cipher}, SHA-256: ${encryptedEnvelope.ciphertextSha256.slice(
                        0,
                        18
                      )}...)`
                    : "Aún no has activado una contraseña maestra para esta sesión."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncE2eeToSupabase}
                className="w-full py-3 rounded-2xl bg-[#2B2D31] hover:bg-[#5865F2] text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                Sincronizar Respaldo Cifrado en Supabase
              </button>
              {supabaseSyncMessage && (
                <p className="text-xs text-[#FEE75C] mt-2">
                  {supabaseSyncMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Exportar y Eliminar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="apple-card p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-black text-base text-white mb-1">
                Exportar o Restaurar Copia (.json)
              </h4>
              <p className="text-xs text-[#B5BAC1] mb-4">
                Descarga todos tus datos en un archivo o restáuralos cuando
                quieras.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onExportVaultJson}
                className="px-5 py-2.5 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" /> Descargar JSON
              </button>
              <label className="px-5 py-2.5 rounded-full bg-[#1E1F22] hover:bg-[#383A40] text-white font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-4 h-4" /> Restaurar JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="apple-card p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-black text-base text-[#F23F43] mb-1">
                Borrar Datos Locales
              </h4>
              <p className="text-xs text-[#B5BAC1] mb-3">
                Escribe <strong>ELIMINAR</strong> para limpiar completamente tu
                bóveda de este navegador.
              </p>
              <input
                type="text"
                value={confirmWipeText}
                onChange={(e) => setConfirmWipeText(e.target.value)}
                placeholder='Escribe "ELIMINAR"'
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2 text-xs text-white mb-3"
              />
            </div>
            <button
              type="button"
              disabled={confirmWipeText !== "ELIMINAR"}
              onClick={async () => {
                await onWipeAllLocalData();
                setConfirmWipeText("");
              }}
              className="w-full py-2.5 rounded-full bg-[#F23F43] disabled:bg-[#1E1F22] disabled:text-[#80848E] text-white font-extrabold text-xs transition cursor-pointer"
            >
              Eliminar Mis Datos Locales
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-card p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-black text-xl text-white">
            🛡️ Estado del Servidor (Zero-Access)
          </h2>
          <p className="text-xs text-[#B5BAC1]">
            Salud de la plataforma, conexión con Supabase y auditoría de
            privacidad
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#1E1F22] border border-white/5">
          <div className="text-xs text-[#B5BAC1]">Estado Supabase Cloud</div>
          <div className="text-lg font-black text-[#57F287] mt-1">
            {supabaseConfig.isConfigured
              ? "● Online (esqbscqrtkxxqkuvgcmw)"
              : "Local"}
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-[#1E1F22] border border-white/5">
          <div className="text-xs text-[#B5BAC1]">Pliegos SIE Activos</div>
          <div className="text-lg font-black text-white mt-1">
            {vault.customTariffs.length} Pliegos Oficiales
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-[#1E1F22] border border-white/5">
          <div className="text-xs text-[#B5BAC1]">
            Acceso a Facturas Privadas
          </div>
          <div className="text-lg font-black text-[#FEE75C] mt-1">
            Bloqueado por Diseño
          </div>
        </div>
      </div>
    </div>
  );
}
