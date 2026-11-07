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
    badgeClass: "bg-[#23A55A]/25 text-[#57F287]",
  },
  extraido_automatico: {
    label: "Extraído",
    badgeClass: "bg-[#5865F2]/25 text-[#99AAB5]",
  },
  estimado: {
    label: "Estimado",
    badgeClass: "bg-[#FEE75C]/20 text-[#FEE75C]",
  },
  no_disponible: {
    label: "Opcional",
    badgeClass: "bg-white/10 text-[#B5BAC1]",
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#57F287]">
            Escáner Local · Privacidad Zero-Access
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Analizador de Recibos Eléctricos
          </h2>
        </div>
        <button
          onClick={handleStartManualReview}
          className="px-5 py-2.5 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs sm:text-sm font-extrabold shadow-lg transition cursor-pointer"
        >
          + Registrar Factura Manualmente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-card p-6 sm:p-8">
          <h3 className="font-black text-lg text-white mb-1">
            📄 Subir Factura en PDF o Foto
          </h3>
          <p className="text-xs text-[#B5BAC1] mb-5">
            Compatible con recibos de EDESUR, EDENORTE, EDEESTE y CEPM (PDF, JPG
            o PNG). Se procesa en tu dispositivo sin subir el archivo a ningún
            servidor.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#5865F2]/60 hover:border-[#57F287] rounded-3xl p-8 cursor-pointer bg-[#1E1F22] hover:bg-[#1E1F22]/80 transition">
            <div className="w-12 h-12 rounded-2xl bg-[#5865F2] text-white flex items-center justify-center mb-3 shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm text-white">
              Haz clic para soltar tu factura (PDF o Imagen)
            </span>
            <span className="text-xs text-[#B5BAC1] mt-1">
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
            <div className="mt-4 p-4 rounded-2xl bg-[#1E1F22] border border-[#5865F2]/40">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#57F287] mb-2">
                <span>{processingStage}</span>
                <span>{processingPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#2B2D31] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5865F2] transition-all duration-300"
                  style={{ width: `${processingPct}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-[#F23F43]/15 border border-[#F23F43]/40 text-xs text-[#F23F43] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="apple-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-lg text-white">
                💬 Pegar Texto de Factura por Correo
              </h3>
              <button
                type="button"
                onClick={() =>
                  setRawSampleInput(
                    "EDESUR DOMINICANA S.A. NIC: 8492014 Tarifa: BTS-1 Periodo Facturado: 30 dias Consumo Facturado: 615 kWh Total a Pagar: RD$ 6,129.10"
                  )
                }
                className="text-xs font-extrabold text-[#FEE75C] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Cargar ejemplo EDESUR
              </button>
            </div>
            <p className="text-xs text-[#B5BAC1] mb-4">
              Copia y pega el texto del correo de tu distribuidora para extraer
              los valores al instante.
            </p>
            <textarea
              rows={4}
              value={rawSampleInput}
              onChange={(e) => setRawSampleInput(e.target.value)}
              placeholder="Ej: EDENORTE NIC 5541023 Tarifa BTS-1 Consumo Facturado: 520 kWh Total a Pagar: RD$ 5,180.00..."
              className="w-full rounded-2xl bg-[#1E1F22] border border-white/10 p-4 text-xs text-white focus:outline-none focus:border-[#5865F2]"
            />
          </div>
          <button
            type="button"
            onClick={handleAnalyzePastedText}
            className="mt-4 w-full py-3 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs sm:text-sm transition cursor-pointer"
          >
            Extraer Datos y Revisar
          </button>
        </div>
      </div>

      {/* Revisión Manual */}
      {draftInvoice && (
        <div className="apple-card p-6 sm:p-8 border-2 border-[#57F287]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-[#57F287]" />
              <h3 className="font-black text-lg text-white">
                Verifica los datos de tu factura antes de guardar
              </h3>
            </div>
            <span className="text-xs text-[#B5BAC1]">
              Puedes corregir cualquier campo manualmente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold text-white">Distribuidora</label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs font-bold text-white"
              >
                <option value="EDESUR">EDESUR</option>
                <option value="EDENORTE">EDENORTE</option>
                <option value="EDEESTE">EDEESTE</option>
                <option value="CEPM">CEPM</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold text-white">Tarifa</label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    PROVENANCE_LABELS[draftInvoice.tariffCode.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.tariffCode.status].label}
                </span>
              </div>
              <select
                value={draftInvoice.tariffCode.value}
                onChange={(e) => updateDraftField("tariffCode", e.target.value)}
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs font-bold text-white"
              >
                <option value="BTS-1">BTS-1 (Residencial)</option>
                <option value="BTS-2">BTS-2 (Comercial)</option>
                <option value="RES-CEPM">RES-CEPM</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold text-white">Consumo (kWh)</label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs font-black text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold text-white">
                  Total Facturado (RD$)
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs font-black text-[#57F287]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Fecha Cierre Factura
              </label>
              <input
                type="date"
                value={draftInvoice.billingPeriodEnd.value}
                onChange={(e) =>
                  updateDraftField("billingPeriodEnd", e.target.value)
                }
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
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
                className="w-full rounded-xl bg-[#1E1F22] border border-white/10 px-3 py-2.5 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDraftInvoice(null)}
                className="px-5 py-2.5 rounded-full bg-[#1E1F22] text-xs font-bold text-[#B5BAC1] hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-6 py-2.5 rounded-full bg-[#23A55A] hover:bg-[#1E8E4C] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-lg transition cursor-pointer"
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
        <h3 className="font-black text-lg text-white mb-1">
          🗂️ Historial de Facturas ({sortedInvoices.length})
        </h3>
        <p className="text-xs text-[#B5BAC1] mb-5">
          Tus recibos registrados con cálculo de costo promedio por kWh
        </p>

        {sortedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[#B5BAC1] text-xs">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 px-3">Distribuidora</th>
                  <th className="py-3 px-3">Consumo</th>
                  <th className="py-3 px-3">Promedio Diario</th>
                  <th className="py-3 px-3">Total Pagado</th>
                  <th className="py-3 px-3">Precio / kWh</th>
                  <th className="py-3 pl-3 text-right">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                    <tr key={inv.id} className="hover:bg-[#1E1F22]/60">
                      <td className="py-3.5 pr-4 font-bold text-white">
                        {inv.billingPeriodEnd.value}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#1E1F22] text-xs font-extrabold text-[#57F287]">
                          {inv.distributor.value} · {inv.tariffCode.value}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-white">
                        {inv.billedKwh.value.toLocaleString("es-DO")} kWh
                      </td>
                      <td className="py-3.5 px-3 text-[#B5BAC1]">
                        {dailyKwh.toFixed(1)} kWh/día
                      </td>
                      <td className="py-3.5 px-3 font-black text-[#FEE75C]">
                        RD${" "}
                        {inv.totalAmountDop.value.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-3 text-[#B5BAC1]">
                        RD$ {avgKwhRate.toFixed(2)}/kWh
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-2 rounded-full text-[#B5BAC1] hover:text-[#F23F43] hover:bg-[#F23F43]/15 transition cursor-pointer"
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
          <div className="text-center py-10 text-sm text-[#B5BAC1]">
            Aún no has registrado facturas.
          </div>
        )}
      </div>
    </div>
  );
}
