"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import {
  DistributorCode,
  LocalVaultPayload,
  SubscriptionPlan,
  TariffSchedule,
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
    target: "Inicio rápido para cualquier ciudadano",
    features: [
      "Registro básico de equipos y calculadora de consumo",
      "Analizador local de facturas PDF/Imagen",
      "Dashboard básico con pliego SIE",
      "Bóveda cifrada local AES-256-GCM",
    ],
  },
  {
    id: "hogar",
    name: "Plan Hogar",
    target: "Familias y apartamentos residenciales",
    features: [
      "Historial ilimitado de facturas y comparaciones",
      "Simulador de ahorro multi-escenario (hasta 3)",
      "Motor completo de Inteligencia Energética",
      "Simulador Solar y cálculo de autonomía de inversor",
    ],
  },
  {
    id: "negocios",
    name: "Plan Negocios",
    target: "Colmados, cafeterías, consultorios y PyMEs",
    features: [
      "Soporte para tarifas comerciales BTS-2 y CEPM",
      "Análisis de equipos de refrigeración comercial",
      "Alertas de presupuesto y saltos tarifarios",
      "Respaldo cifrado E2EE opcional en Supabase",
    ],
  },
  {
    id: "empresarial",
    name: "Plan Empresarial",
    target: "Múltiples sucursales y gestión centralizada",
    features: [
      "Múltiples instalaciones y perfiles",
      "Auditoría tarifaria y reportes ejecutivos",
      "Dimensionamiento solar comercial e híbrido",
      "Arquitectura preparada para medidores inteligentes",
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
      setCryptoStatusMessage(
        "Error: La contraseña maestra debe tener al menos 8 caracteres."
      );
      return;
    }
    if (passphraseInput !== passphraseConfirm) {
      setCryptoStatusMessage("Error: Las contraseñas no coinciden.");
      return;
    }
    try {
      await onCreateOrUpdateVaultPassphrase(passphraseInput);
      setPassphraseInput("");
      setPassphraseConfirm("");
      setCryptoStatusMessage(
        "Bóveda cifrada con AES-256-GCM + PBKDF2 (310,000 iteraciones) y guardada en IndexedDB."
      );
    } catch (err) {
      setCryptoStatusMessage(
        err instanceof Error ? err.message : "Error al cifrar bóveda."
      );
    }
  }

  async function handleSyncE2eeToSupabase() {
    if (!encryptedEnvelope) {
      setSupabaseSyncMessage(
        "Primero debes cifrar tu bóveda con una contraseña maestra local antes de sincronizar el blob E2EE."
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
        {/* Selector de Distribuidora y Tarifa Activa */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
          <h3 className="font-bold text-lg mb-1">
            Configuración de Tarifas del Mercado Eléctrico Dominicano (SIE)
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Selecciona tu distribuidora (EDESUR, EDENORTE, EDEESTE o CEPM) y
            categoría tarifaria. Puedes actualizar los bloques tarifarios sin
            modificar el código cuando la Superintendencia de Electricidad (SIE)
            publique un nuevo pliego trimestral.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-slate-950/75 border border-slate-800">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Distribuidora Eléctrica Activa
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
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 font-bold"
              >
                <option value="EDESUR">EDESUR Dominicana</option>
                <option value="EDENORTE">EDENORTE Dominicana</option>
                <option value="EDEESTE">EDEESTE Dominicana</option>
                <option value="CEPM">
                  CEPM (Consorcio Energético Punta Cana - Macao)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
              >
                {vault.profile.distributor === "CEPM" ? (
                  <option value="RES-CEPM">
                    RES-CEPM (Residencial / Prepago Orientativa)
                  </option>
                ) : (
                  <>
                    <option value="BTS-1">
                      BTS-1 (Baja Tensión Simple Residencial)
                    </option>
                    <option value="BTS-2">
                      BTS-2 (Baja Tensión Simple Comercial)
                    </option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Tarifa Fija Personalizada Opcional (RD$/kWh)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Usar pliego oficial por bloques"
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
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
                />
                {vault.profile.customRateDopPerKwh !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDistributorAndTariff(
                        vault.profile.distributor,
                        vault.profile.tariffCode,
                        null
                      )
                    }
                    className="px-2.5 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
                  >
                    Restaurar SIE
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabla editable de pliegos tarifarios */}
          <div className="space-y-4">
            {vault.customTariffs.map((sched) => (
              <div
                key={sched.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/75"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">
                      {sched.distributor_code} — {sched.category_name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        sched.is_official_sie
                          ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {sched.is_official_sie
                        ? "Pliego Oficial SIE"
                        : "Valor Ilustrativo Configurable"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Vigencia desde: {sched.effective_from}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{sched.notes}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {sched.energy_blocks.map((blk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-300">
                        {blk.max_kwh
                          ? `${blk.min_kwh}–${blk.max_kwh} kWh`
                          : `>= ${blk.min_kwh} kWh`}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">RD$</span>
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
                          className="w-16 rounded bg-slate-950 border border-slate-700 px-1.5 py-1 text-right font-bold text-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planes Comerciales Freemium */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">
                Arquitectura de Planes Comerciales (Modelo Freemium)
              </h3>
              <p className="text-xs text-slate-400">
                Activa o simula cualquier plan para verificar los permisos de
                funcionalidades (sin cobros reales activos en este MVP).
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
              Plan Actual: {vault.profile.subscriptionPlan}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS_CATALOG.map((plan) => {
              const isCurrent = vault.profile.subscriptionPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between ${
                    isCurrent
                      ? "border-sky-500 bg-slate-950"
                      : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-100">
                      {plan.name}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      {plan.target}
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChangeSubscriptionPlan(plan.id)}
                    className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold transition ${
                      isCurrent
                        ? "bg-sky-600/20 text-sky-300 border border-sky-500/40"
                        : "bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white"
                    }`}
                  >
                    {isCurrent ? "Plan Activo" : `Cambiar a ${plan.name}`}
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
        {/* Cifrado Local AES-256-GCM y Gestión de Clave Maestra */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Bóveda Criptográfica Local-First (Web Crypto API AES-256-GCM)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Tu información se cifra en el navegador utilizando derivación{" "}
                <strong>PBKDF2-HMAC-SHA256 (310,000 iteraciones)</strong> y
                cifrado autenticado <strong>AES-256-GCM</strong>. Ni los
                servidores de Supabase ni los administradores de ENERGIA360
                reciben jamás tu contraseña maestra.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 mb-5 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Advertencia de No-Recuperación (Zero-Access):</strong> Por
              diseño de seguridad, no existe ningún mecanismo para que un
              administrador restablezca o descifre tu contraseña maestra. Si
              olvidas tu contraseña maestra y no conservas un archivo exportado,
              tus datos cifrados serán matemáticamente irrecuperables.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handlePassphraseSubmit} className="space-y-3">
              <h4 className="font-bold text-sm text-slate-100">
                Configurar o Actualizar Contraseña Maestra de Cifrado
              </h4>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nueva Contraseña Maestra (mínimo 8 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="Introduce una frase o contraseña robusta..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Confirmar Contraseña Maestra
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passphraseConfirm}
                  onChange={(e) => setPassphraseConfirm(e.target.value)}
                  placeholder="Repite la contraseña maestra..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
              >
                Cifrar Bóveda Local con AES-256-GCM Ahora
              </button>
              {cryptoStatusMessage && (
                <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/40 text-xs text-emerald-300">
                  {cryptoStatusMessage}
                </div>
              )}
            </form>

            {/* Inspector técnico en vivo del bloque cifrado */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-sky-400">
                    Inspector de Verificación Criptográfica (Zero-Access Proof)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    {encryptedEnvelope
                      ? "Cifrado Activo en IndexedDB"
                      : "Sesión en Memoria"}
                  </span>
                </div>

                {encryptedEnvelope ? (
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500">Algoritmo:</span>{" "}
                      {encryptedEnvelope.cipher} + {encryptedEnvelope.kdf} (
                      {encryptedEnvelope.iterations} iteraciones)
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">Salt (Base64):</span>{" "}
                      {encryptedEnvelope.saltBase64}
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">IV 96-bit:</span>{" "}
                      {encryptedEnvelope.ivBase64}
                    </div>
                    <div className="truncate text-emerald-400">
                      <span className="text-slate-500">SHA-256:</span>{" "}
                      {encryptedEnvelope.ciphertextSha256}
                    </div>
                    <div className="p-2 rounded bg-slate-900 text-[10px] text-slate-400 break-all max-h-20 overflow-hidden">
                      Ciphertext:{" "}
                      {encryptedEnvelope.ciphertextBase64.slice(0, 180)}...
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6">
                    Establece tu contraseña maestra a la izquierda para generar
                    el sobre cifrado AES-256-GCM en IndexedDB y ver aquí la
                    prueba criptográfica en vivo.
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSyncE2eeToSupabase}
                  className="w-full py-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition"
                >
                  <CloudUpload className="w-4 h-4" />
                  Sincronizar Solo Ciphertext E2EE en Supabase
                </button>
                {supabaseSyncMessage && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    {supabaseSyncMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Exportación, Restauración y Eliminación Verificable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base mb-1">
                Portabilidad Total: Exportar y Restaurar tus Datos
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Eres dueño absoluto de tu información energética. Descarga una
                copia completa en formato JSON para respaldarla o restaurarla en
                cualquier otro dispositivo sin depender de la nube.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExportVaultJson}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" /> Exportar Mis Datos (.json)
              </button>

              <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-4 h-4" /> Restaurar desde Archivo (.json)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-rose-300 mb-1">
                Eliminación Verificable de Datos Locales
              </h4>
              <p className="text-xs text-slate-300 mb-3">
                Destruye de manera inmediata y verificable la base de datos{" "}
                <code>IndexedDB</code>, sobrescribe el estado en memoria y
                elimina todas las facturas, equipos y configuraciones de este
                navegador.
              </p>
              <input
                type="text"
                value={confirmWipeText}
                onChange={(e) => setConfirmWipeText(e.target.value)}
                placeholder='Escribe "ELIMINAR" para habilitar el borrado'
                className="w-full rounded-lg bg-slate-950 border border-rose-500/40 px-3 py-2 text-xs text-slate-100 mb-3"
              />
            </div>
            <button
              type="button"
              disabled={confirmWipeText !== "ELIMINAR"}
              onClick={async () => {
                await onWipeAllLocalData();
                setConfirmWipeText("");
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-rose-500 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" /> Eliminar Toda Mi Información Ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SECCIÓN: PANEL ADMINISTRATIVO ZERO-ACCESS (MÓDULO 13)
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Panel Administrativo de Plataforma (Arquitectura Zero-Access)
              </h3>
              <p className="text-xs text-slate-400">
                Supervisión técnica de catálogos públicos, pliegos SIE, estado
                de Supabase y métricas agregadas sin acceso a datos privados.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
            Versión v1.0.0-RD · Operativo
          </span>
        </div>

        {/* Estado de Servicios y Base de Datos Supabase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Conexión Supabase API</div>
            <div className="text-base font-bold mt-1 text-slate-100">
              {supabaseConfig.isConfigured
                ? "Conectado (Remoto)"
                : "Modo Local-First Activo"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Esquema SQL + Políticas RLS listas en{" "}
              <code>supabase/migrations/</code>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">
              Pliegos Tarifarios Públicos
            </div>
            <div className="text-base font-bold mt-1 text-sky-400">
              {vault.customTariffs.length} Pliegos Activos
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              EDESUR, EDENORTE, EDEESTE (SIE) + CEPM
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">
              Motor OCR & Cálculos Locales
            </div>
            <div className="text-base font-bold mt-1 text-emerald-400">
              100% En Cliente (WebWorker)
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Tesseract.js + PDF Stream + WebCrypto
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">
              Provincias con Radiación HSP
            </div>
            <div className="text-base font-bold mt-1 text-amber-400">
              12 Zonas Solares RD
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Rango: 5.15 a 5.95 kWh/m²/día
            </div>
          </div>
        </div>

        {/* Matriz de Restricciones Técnicas del Administrador (Garantía Zero-Access) */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-5">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-sm text-slate-100">
              Auditoría de Restricciones de Acceso Administrativo (Cumplimiento
              Sección 13)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-semibold text-emerald-400 mb-1">
                Lo que el Administrador PUEDE gestionar:
              </div>
              <ul className="space-y-1 text-slate-300">
                <li>• Actualizar pliegos tarifarios públicos de la SIE</li>
                <li>• Ampliar el catálogo público de equipos e inversores</li>
                <li>• Ajustar parámetros provinciales de radiación solar (HSP)</li>
                <li>
                  • Consultar métricas agregadas anónimas (opt-in voluntario)
                </li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-semibold text-rose-400 mb-1">
                Lo que el Administrador TIENE BLOQUEADO por Arquitectura:
              </div>
              <ul className="space-y-1 text-slate-300">
                <li>
                  ✗ Leer facturas PDF/JPG (se descartan localmente tras el OCR)
                </li>
                <li>
                  ✗ Consultar consumos individuales o números de contrato (NIC)
                </li>
                <li>
                  ✗ Descifrar respaldos E2EE (la clave derivada PBKDF2 jamás sale
                  del navegador)
                </li>
                <li>✗ Accesos ocultos de soporte o llaves maestras traseras</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

