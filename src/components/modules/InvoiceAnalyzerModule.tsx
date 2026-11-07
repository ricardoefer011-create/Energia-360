"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Lock,
  PlusCircle,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  DataProvenanceStatus,
  DistributorCode,
  ElectricityInvoice,
  TariffSchedule,
} from "@/types/energia360";
import {
  extractTextFromLocalFile,
  parseDominicanInvoiceText,
} from "@/lib/ocr/invoice-parser";
import { calculateDominicanTariffBill } from "@/lib/engine/energy-engine";

interface InvoiceAnalyzerModuleProps {
  invoices: ElectricityInvoice[];
  defaultDistributor: DistributorCode;
  activeSchedule: TariffSchedule;
  onAddConfirmedInvoice: (invoice: ElectricityInvoice) => void;
  onDeleteInvoice: (id: string) => void;
}

const PROVENANCE_LABELS: Record<
  DataProvenanceStatus,
  { label: string; badgeClass: string }
> = {
  confirmado_usuario: {
    label: "Confirmado por el usuario",
    badgeClass:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  },
  extraido_automatico: {
    label: "Extraído automáticamente",
    badgeClass: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  },
  estimado: {
    label: "Estimado (Verificar)",
    badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  },
  no_disponible: {
    label: "No disponible",
    badgeClass: "bg-slate-800 text-slate-400 border border-slate-700",
  },
};

export function InvoiceAnalyzerModule({
  invoices,
  defaultDistributor,
  activeSchedule,
  onAddConfirmedInvoice,
  onDeleteInvoice,
}: InvoiceAnalyzerModuleProps) {
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [processingPct, setProcessingPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawSampleInput, setRawSampleInput] = useState<string>("");

  // Borrador en pantalla de revisión obligatoria antes de guardar
  const [draftInvoice, setDraftInvoice] = useState<ElectricityInvoice | null>(
    null
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setWarnings([]);
    setProcessingStage("Validando archivo localmente...");
    setProcessingPct(10);

    try {
      const extractedText = await extractTextFromLocalFile(
        file,
        (stage, pct) => {
          setProcessingStage(stage);
          setProcessingPct(pct);
        }
      );

      const parsed = parseDominicanInvoiceText(extractedText, file.name);
      setDraftInvoice(parsed.draftInvoice);
      setWarnings(parsed.warnings);
      setProcessingStage(null);
    } catch (err) {
      setProcessingStage(null);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error al analizar el documento localmente."
      );
    } finally {
      e.target.value = "";
    }
  }

  function handleAnalyzePastedText() {
    if (!rawSampleInput.trim()) {
      setErrorMessage(
        "Pega el texto de tu recibo o utiliza el botón de plantilla rápida."
      );
      return;
    }
    setErrorMessage(null);
    const parsed = parseDominicanInvoiceText(
      rawSampleInput,
      "recibo_texto_local.txt"
    );
    setDraftInvoice(parsed.draftInvoice);
    setWarnings(parsed.warnings);
  }

  function handleStartManualReview() {
    setErrorMessage(null);
    const parsed = parseDominicanInvoiceText(
      `${defaultDistributor} BTS-1 Consumo Facturado: 420 kWh Total a Pagar: RD$ 3,750.00`,
      "manual"
    );
    setDraftInvoice({
      ...parsed.draftInvoice,
      billedKwh: { value: 420, status: "estimado" },
      totalAmountDop: { value: 3750, status: "estimado" },
    });
    setWarnings([
      "Modo de entrada manual: verifica los valores de tu recibo antes de confirmar.",
    ]);
  }

  function updateDraftField<K extends keyof ElectricityInvoice>(
    field: K,
    newValue: ElectricityInvoice[K] extends { value: infer V } ? V : never
  ) {
    if (!draftInvoice) return;
    setDraftInvoice({
      ...draftInvoice,
      [field]: {
        value: newValue,
        status: "confirmado_usuario" as DataProvenanceStatus,
      },
    });
  }

  function handleConfirmAndSave() {
    if (!draftInvoice) return;
    if (
      draftInvoice.billedKwh.value <= 0 ||
      draftInvoice.totalAmountDop.value <= 0
    ) {
      setErrorMessage(
        "El consumo facturado (kWh) y el total a pagar (RD$) deben ser mayores que cero."
      );
      return;
    }

    const confirmed: ElectricityInvoice = {
      ...draftInvoice,
      billedKwh: {
        value: Number(draftInvoice.billedKwh.value),
        status: "confirmado_usuario",
      },
      totalAmountDop: {
        value: Number(draftInvoice.totalAmountDop.value),
        status: "confirmado_usuario",
      },
      confirmedByUserAt: new Date().toISOString(),
    };

    onAddConfirmedInvoice(confirmed);
    setDraftInvoice(null);
    setRawSampleInput("");
    setWarnings([]);
  }

  const sortedInvoices = [...invoices].sort((a, b) =>
    b.billingPeriodEnd.value.localeCompare(a.billingPeriodEnd.value)
  );

  return (
    <div className="space-y-6">
      {/* Banner de Privacidad Local-First */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-emerald-300">
              Procesamiento 100% en tu Navegador (Zero-Access OCR)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Tus archivos PDF, JPG o PNG se procesan en la memoria RAM de tu
              dispositivo mediante Tesseract.js / PDF local y se descartan
              inmediatamente después del análisis. Ninguna factura ni número de
              contrato (NIC/NIS) se sube a servidores centrales.
            </p>
          </div>
        </div>
        <button
          onClick={handleStartManualReview}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap transition"
        >
          + Introducir Factura Manualmente
        </button>
      </div>

      {/* Zona de Carga Local y Extractor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
          <h3 className="font-bold text-base mb-1">
            1. Cargar Factura en PDF o Imagen (EDESUR, EDENORTE, EDEESTE, CEPM)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Formatos soportados: PDF, JPG, JPEG, PNG (máximo 12 MB).
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-8 cursor-pointer bg-slate-950/60 transition">
            <UploadCloud className="w-10 h-10 text-sky-400 mb-3" />
            <span className="font-semibold text-sm text-slate-200">
              Selecciona tu factura eléctrica desde tu dispositivo
            </span>
            <span className="text-xs text-slate-400 mt-1">
              El análisis ocurre sin conexión a servidores externos
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {processingStage && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-sky-500/30">
              <div className="flex items-center justify-between text-xs font-medium text-sky-300 mb-2">
                <span>{processingStage}</span>
                <span>{processingPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${processingPct}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Analizador Rápido de Texto de Factura Digital / Correo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base">
                2. O pega el texto de tu Factura por Correo / Oficina Virtual
              </h3>
              <button
                type="button"
                onClick={() =>
                  setRawSampleInput(
                    "EDESUR DOMINICANA S.A. NIC: 8492014 Tarifa: BTS-1 Periodo Facturado: 30 dias Consumo Facturado: 615 kWh Total a Pagar: RD$ 6,129.10"
                  )
                }
                className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Probar plantilla EDESUR
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Si recibes el resumen por correo de tu distribuidora, pégalo aquí
              para extraer automáticamente los campos.
            </p>
            <textarea
              rows={4}
              value={rawSampleInput}
              onChange={(e) => setRawSampleInput(e.target.value)}
              placeholder="Ej: EDENORTE NIC 5541023 Tarifa BTS-1 Consumo Facturado: 520 kWh Total a Pagar: RD$ 5,180.00..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAnalyzePastedText}
            className="mt-3 w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
          >
            Extraer Datos Localmente y Pasar a Revisión
          </button>
        </div>
      </div>

      {/* Pantalla Obligatoria de Revisión y Confirmación del Usuario */}
      {draftInvoice && (
        <div className="rounded-2xl border-2 border-sky-500/50 bg-slate-900/95 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-base">
                Pantalla de Revisión de Factura (Confirmación Obligatoria)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Ningún dato se guarda sin tu revisión manual
            </span>
          </div>

          {warnings.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Distribuidora */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Distribuidora
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.distributor.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.distributor.status].label}
                </span>
              </div>
              <select
                value={draftInvoice.distributor.value}
                onChange={(e) =>
                  updateDraftField(
                    "distributor",
                    e.target.value as DistributorCode
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="EDESUR">EDESUR</option>
                <option value="EDENORTE">EDENORTE</option>
                <option value="EDEESTE">EDEESTE</option>
                <option value="CEPM">CEPM</option>
              </select>
            </div>

            {/* Tarifa */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Tarifa Aplicable
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.tariffCode.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.tariffCode.status].label}
                </span>
              </div>
              <select
                value={draftInvoice.tariffCode.value}
                onChange={(e) => updateDraftField("tariffCode", e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="BTS-1">BTS-1 (Residencial)</option>
                <option value="BTS-2">BTS-2 (Comercial)</option>
                <option value="RES-CEPM">RES-CEPM (Prepago/Residencial)</option>
              </select>
            </div>

            {/* Consumo Facturado en kWh */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Consumo Facturado (kWh)
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.billedKwh.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.billedKwh.status].label}
                </span>
              </div>
              <input
                type="number"
                min={1}
                step="0.1"
                value={draftInvoice.billedKwh.value}
                onChange={(e) =>
                  updateDraftField("billedKwh", parseFloat(e.target.value) || 0)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-bold"
              />
            </div>

            {/* Total a Pagar RD$ */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Total Facturado (RD$)
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.totalAmountDop.status]
                      .badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.totalAmountDop.status].label}
                </span>
              </div>
              <input
                type="number"
                min={1}
                step="0.01"
                value={draftInvoice.totalAmountDop.value}
                onChange={(e) =>
                  updateDraftField(
                    "totalAmountDop",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-emerald-400 font-bold"
              />
            </div>

            {/* Contrato NIC/NIS (Cifrado Localmente) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  NIC / Contrato (Opcional)
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.contractNumber.status]
                      .badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.contractNumber.status].label}
                </span>
              </div>
              <input
                type="text"
                value={draftInvoice.contractNumber.value}
                onChange={(e) =>
                  updateDraftField("contractNumber", e.target.value)
                }
                placeholder="Solo se guarda cifrado localmente"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>

            {/* Fecha Cierre de Período */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Fin Período Facturado
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.billingPeriodEnd.status]
                      .badgeClass
                  }`}
                >
                  {
                    PROVENANCE_LABELS[draftInvoice.billingPeriodEnd.status]
                      .label
                  }
                </span>
              </div>
              <input
                type="date"
                value={draftInvoice.billingPeriodEnd.value}
                onChange={(e) =>
                  updateDraftField("billingPeriodEnd", e.target.value)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>

            {/* Días Facturados */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Días Facturados
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.billingDays.status]
                      .badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.billingDays.status].label}
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={45}
                value={draftInvoice.billingDays.value}
                onChange={(e) =>
                  updateDraftField(
                    "billingDays",
                    parseInt(e.target.value, 10) || 30
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>

            {/* Cargo Fijo / Adicionales */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Cargo Fijo (RD$)
                </label>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.fixedChargeDop.status]
                      .badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.fixedChargeDop.status].label}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={draftInvoice.fixedChargeDop.value}
                onChange={(e) =>
                  updateDraftField(
                    "fixedChargeDop",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Vista previa de auditoría tarifaria antes de guardar */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-slate-400">
                Costo promedio real de esta factura:{" "}
              </span>
              <strong className="text-sky-400">
                RD${" "}
                {draftInvoice.billedKwh.value > 0
                  ? (
                      draftInvoice.totalAmountDop.value /
                      draftInvoice.billedKwh.value
                    ).toFixed(2)
                  : "0.00"}{" "}
                / kWh
              </strong>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-400">Promedio diario: </span>
              <strong className="text-slate-200">
                {draftInvoice.billingDays.value > 0
                  ? (
                      draftInvoice.billedKwh.value /
                      draftInvoice.billingDays.value
                    ).toFixed(2)
                  : "0.00"}{" "}
                kWh/día
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftInvoice(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar y Guardar en Bóveda Local
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Facturas Analizadas */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base">
              Historial de Facturas Confirmadas ({sortedInvoices.length})
            </h3>
            <p className="text-xs text-slate-400">
              Comparación entre el importe realmente facturado y el cálculo
              teórico del pliego SIE
            </p>
          </div>
        </div>

        {sortedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4">Período</th>
                  <th className="py-2.5 px-3">Distribuidora</th>
                  <th className="py-2.5 px-3">Consumo</th>
                  <th className="py-2.5 px-3">kWh / Día</th>
                  <th className="py-2.5 px-3">Importe Facturado</th>
                  <th className="py-2.5 px-3">Costo Medio</th>
                  <th className="py-2.5 px-3">Cálculo Pliego SIE</th>
                  <th className="py-2.5 pl-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedInvoices.map((inv) => {
                  const avgKwhRate =
                    inv.billedKwh.value > 0
                      ? inv.totalAmountDop.value / inv.billedKwh.value
                      : 0;
                  const dailyKwh =
                    inv.billingDays.value > 0
                      ? inv.billedKwh.value / inv.billingDays.value
                      : inv.billedKwh.value / 30;
                  const theoretical = calculateDominicanTariffBill(
                    inv.billedKwh.value,
                    activeSchedule
                  );

                  return (
                    <tr key={inv.id} className="hover:bg-slate-950/50">
                      <td className="py-3 pr-4 font-semibold text-slate-200">
                        {inv.billingPeriodEnd.value}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {inv.billingDays.value} días
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium">
                          {inv.distributor.value} · {inv.tariffCode.value}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-sky-400">
                        {inv.billedKwh.value.toLocaleString("es-DO")} kWh
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {dailyKwh.toFixed(1)} kWh/día
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        RD${" "}
                        {inv.totalAmountDop.value.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        RD$ {avgKwhRate.toFixed(2)}/kWh
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        RD${" "}
                        {theoretical.totalEstimatedBillDop.toLocaleString(
                          "es-DO",
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar factura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No tienes facturas guardadas todavía. Carga un PDF/imagen arriba o
            usa el botón de ingreso manual.
          </div>
        )}
      </div>
    </div>
  );
}

