"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
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
    label: "Confirmado",
    badgeClass: "bg-zinc-900 text-white",
  },
  extraido_automatico: {
    label: "Extraído",
    badgeClass: "bg-zinc-200 text-zinc-800",
  },
  estimado: {
    label: "Estimado",
    badgeClass: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  },
  no_disponible: {
    label: "Opcional",
    badgeClass: "bg-zinc-100 text-zinc-500",
  },
};

export function InvoiceAnalyzerModule({
  invoices,
  defaultDistributor,
  onAddConfirmedInvoice,
  onDeleteInvoice,
}: InvoiceAnalyzerModuleProps) {
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [processingPct, setProcessingPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setWarnings] = useState<string[]>([]);
  const [rawSampleInput, setRawSampleInput] = useState<string>("");
  const [draftInvoice, setDraftInvoice] = useState<ElectricityInvoice | null>(
    null
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setWarnings([]);
    setProcessingStage("Validando documento en tu dispositivo...");
    setProcessingPct(15);

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
        "Pega el texto de tu factura o presiona 'Cargar ejemplo EDESUR'."
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
      `${defaultDistributor} BTS-1 Consumo Facturado: 450 kWh Total a Pagar: RD$ 4,120.00`,
      "manual"
    );
    setDraftInvoice({
      ...parsed.draftInvoice,
      billedKwh: { value: 450, status: "estimado" },
      totalAmountDop: { value: 4120, status: "estimado" },
    });
    setWarnings([
      "Introduce los datos impresos en tu recibo eléctrico y confírmalos para guardarlos.",
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
        "El consumo (kWh) y el monto total (RD$) deben ser mayores que cero."
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
      {/* Encabezado limpio */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Procesamiento Local · Privacidad Total
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Analizador Inteligente de Facturas
          </h2>
        </div>
        <button
          onClick={handleStartManualReview}
          className="px-5 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
        >
          + Registrar Factura Manualmente
        </button>
      </div>

      {/* Carga de PDF/Foto o Texto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-card p-6 sm:p-8">
          <h3 className="font-bold text-lg text-zinc-900 mb-1">
            Subir Factura en PDF o Foto
          </h3>
          <p className="text-xs text-zinc-500 mb-5">
            Compatible con recibos de EDESUR, EDENORTE, EDEESTE y CEPM (PDF, JPG
            o PNG). Se procesa en tu dispositivo sin subir el archivo a la nube.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-3xl p-8 cursor-pointer bg-zinc-50 hover:bg-zinc-100/80 transition">
            <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm text-zinc-900">
              Haz clic para elegir tu factura (PDF o Imagen)
            </span>
            <span className="text-xs text-zinc-500 mt-1">
              Lectura óptica local mediante WebWorker
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {processingStage && (
            <div className="mt-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 mb-2">
                <span>{processingStage}</span>
                <span>{processingPct}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 transition-all duration-300"
                  style={{ width: `${processingPct}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-zinc-100 border border-zinc-300 text-xs text-zinc-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-zinc-900">
                Pegar Resumen de Factura por Correo
              </h3>
              <button
                type="button"
                onClick={() =>
                  setRawSampleInput(
                    "EDESUR DOMINICANA S.A. NIC: 8492014 Tarifa: BTS-1 Periodo Facturado: 30 dias Consumo Facturado: 615 kWh Total a Pagar: RD$ 6,129.10"
                  )
                }
                className="text-xs font-semibold text-zinc-900 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Cargar ejemplo EDESUR
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Copia y pega el texto del correo de tu distribuidora para extraer
              los valores al instante.
            </p>
            <textarea
              rows={4}
              value={rawSampleInput}
              onChange={(e) => setRawSampleInput(e.target.value)}
              placeholder="Ej: EDENORTE NIC 5541023 Tarifa BTS-1 Consumo Facturado: 520 kWh Total a Pagar: RD$ 5,180.00..."
              className="w-full rounded-2xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={handleAnalyzePastedText}
            className="mt-4 w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm transition"
          >
            Extraer Datos y Revisar
          </button>
        </div>
      </div>

      {/* Pantalla de Revisión Manual Obligatoria */}
      {draftInvoice && (
        <div className="apple-card p-6 sm:p-8 border-2 border-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-zinc-200">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-zinc-900" />
              <h3 className="font-bold text-lg text-zinc-900">
                Verifica los datos de tu factura antes de guardar
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Puedes corregir cualquier campo manualmente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-zinc-900">
                  Distribuidora
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    PROVENANCE_LABELS[draftInvoice.distributor.status]
                      .badgeClass
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
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs font-medium text-zinc-900"
              >
                <option value="EDESUR">EDESUR</option>
                <option value="EDENORTE">EDENORTE</option>
                <option value="EDEESTE">EDEESTE</option>
                <option value="CEPM">CEPM</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-zinc-900">Tarifa</label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    PROVENANCE_LABELS[draftInvoice.tariffCode.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.tariffCode.status].label}
                </span>
              </div>
              <select
                value={draftInvoice.tariffCode.value}
                onChange={(e) => updateDraftField("tariffCode", e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs font-medium text-zinc-900"
              >
                <option value="BTS-1">BTS-1 (Residencial)</option>
                <option value="BTS-2">BTS-2 (Comercial)</option>
                <option value="RES-CEPM">RES-CEPM</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-zinc-900">
                  Consumo (kWh)
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-zinc-900">
                  Total Facturado (RD$)
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Fecha Cierre Factura
              </label>
              <input
                type="date"
                value={draftInvoice.billingPeriodEnd.value}
                onChange={(e) =>
                  updateDraftField("billingPeriodEnd", e.target.value)
                }
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Días Facturados
              </label>
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
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs text-zinc-900"
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDraftInvoice(null)}
                className="px-5 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar y Guardar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Facturas */}
      <div className="apple-card p-6 sm:p-8">
        <h3 className="font-bold text-lg text-zinc-900 mb-1">
          Historial de Facturas ({sortedInvoices.length})
        </h3>
        <p className="text-xs text-zinc-500 mb-5">
          Tus recibos registrados con cálculo de costo promedio por kWh y
          comparación frente al pliego oficial de la SIE.
        </p>

        {sortedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 text-xs">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 px-3">Distribuidora</th>
                  <th className="py-3 px-3">Consumo</th>
                  <th className="py-3 px-3">Promedio Diario</th>
                  <th className="py-3 px-3">Total Pagado</th>
                  <th className="py-3 px-3">Precio / kWh</th>
                  <th className="py-3 pl-3 text-right">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedInvoices.map((inv) => {
                  const avgKwhRate =
                    inv.billedKwh.value > 0
                      ? inv.totalAmountDop.value / inv.billedKwh.value
                      : 0;
                  const dailyKwh =
                    inv.billingDays.value > 0
                      ? inv.billedKwh.value / inv.billingDays.value
                      : inv.billedKwh.value / 30;

                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50">
                      <td className="py-3.5 pr-4 font-semibold text-zinc-900">
                        {inv.billingPeriodEnd.value}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-800">
                          {inv.distributor.value} · {inv.tariffCode.value}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-900">
                        {inv.billedKwh.value.toLocaleString("es-DO")} kWh
                      </td>
                      <td className="py-3.5 px-3 text-zinc-500">
                        {dailyKwh.toFixed(1)} kWh/día
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-900">
                        RD${" "}
                        {inv.totalAmountDop.value.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-500">
                        RD$ {avgKwhRate.toFixed(2)}/kWh
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
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
          <div className="text-center py-10 text-sm text-zinc-500">
            Aún no has registrado facturas.
          </div>
        )}
      </div>
    </div>
  );
}
