"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
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
    badgeClass: "bg-[#008A5E]/15 text-[#008A5E] border border-[#008A5E]/30",
  },
  extraido_automatico: {
    label: "Extraído OCR",
    badgeClass: "bg-[#03A9EC]/15 text-[#091197] border border-[#03A9EC]",
  },
  estimado: {
    label: "Estimado",
    badgeClass: "bg-[#F75600]/15 text-[#F75600] border border-[#F75600]/30",
  },
  no_disponible: {
    label: "Opcional",
    badgeClass: "bg-[#F1F1F1] text-[#4B528A] border border-[#D9D9D9]",
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
        "Pega el texto de tu factura o presiona 'Cargar ejemplo de datos'."
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#091197] text-white p-6 rounded-[12px]">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#03A9EC]">
            PROCESAMIENTO ÓPTICO LOCAL · PRIVACIDAD ZERO-ACCESS
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-1">
            AUDITORÍA ÓPTICA DE DATOS DE CONSUMO
          </h2>
        </div>
        <button
          onClick={handleStartManualReview}
          className="px-5 py-3 rounded-[10px] bg-[#03A9EC] hover:bg-white text-white hover:text-[#091197] text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
        >
          + Registrar Factura Manualmente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
            OPCIÓN 01 · ARCHIVO DIGITAL
          </span>
          <h3 className="font-extrabold text-xl uppercase text-[#091197] mt-0.5 mb-1">
            SUBIR REPORTE DE CONSUMO (PDF O IMAGEN)
          </h3>
          <p className="text-xs text-[#4B528A] mb-5">
            Compatible con estados de cuenta de todas las prestadoras de servicio (PDF, JPG
            o PNG). El documento se analiza en tu dispositivo sin enviarse a
            servidores externos.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#03A9EC] hover:border-[#091197] rounded-[12px] p-8 cursor-pointer bg-[#F1F1F1] hover:bg-[#03A9EC]/10 transition">
            <div className="w-12 h-12 rounded-[10px] bg-[#091197] text-white flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6 text-[#03A9EC]" />
            </div>
            <span className="font-extrabold text-sm uppercase text-[#091197]">
              SELECCIONAR DOCUMENTO DE CONSUMO (PDF O IMAGEN)
            </span>
            <span className="text-xs text-[#4B528A] mt-1">
              Reconocimiento óptico de NIC, kWh facturados y cargos SIE
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {processingStage && (
            <div className="mt-4 p-4 rounded-[10px] bg-[#F1F1F1] border border-[#03A9EC]">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase text-[#091197] mb-2">
                <span>{processingStage}</span>
                <span className="text-[#03A9EC]">{processingPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#091197] transition-all duration-300"
                  style={{ width: `${processingPct}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-4 rounded-[10px] bg-[#F75600]/10 border border-[#F75600] text-xs font-bold text-[#F75600] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                  OPCIÓN 02 · TEXTO DE FACTURA DIGITAL
                </span>
                <h3 className="font-extrabold text-xl uppercase text-[#091197] mt-0.5">
                  PEGAR TEXTO DE RECIBO POR CORREO
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRawSampleInput(
                    "EDESUR DOMINICANA S.A. NIC: 8492014 Tarifa: BTS-1 Periodo Facturado: 30 dias Consumo Facturado: 615 kWh Total a Pagar: RD$ 6,129.10"
                  )
                }
                className="text-xs font-extrabold uppercase text-[#03A9EC] hover:text-[#091197] inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Cargar ejemplo de datos
              </button>
            </div>
            <p className="text-xs text-[#4B528A] mb-4">
              Copia y pega el contenido del correo electrónico de tu
              distribuidora para extraer automáticamente los valores.
            </p>
            <textarea
              rows={4}
              value={rawSampleInput}
              onChange={(e) => setRawSampleInput(e.target.value)}
              placeholder="Ej: EDENORTE NIC 5541023 Tarifa BTS-1 Consumo Facturado: 520 kWh Total a Pagar: RD$ 5,180.00..."
              className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] p-4 text-xs text-[#091197] font-medium focus:outline-none focus:border-[#03A9EC]"
            />
          </div>
          <button
            type="button"
            onClick={handleAnalyzePastedText}
            className="grupamar-cta w-full mt-4"
          >
            <span>EXTRAER DATOS Y AUDITAR RECIBO</span>
            <span className="grupamar-cta-arrow">
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Revisión Manual */}
      {draftInvoice && (
        <div className="bg-white rounded-[12px] p-6 sm:p-8 border-2 border-[#03A9EC] shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-[#D9D9D9]">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-[#03A9EC]" />
              <h3 className="font-extrabold text-lg uppercase text-[#091197]">
                VERIFICACIÓN TÉCNICA ANTES DE INCORPORAR AL EXPEDIENTE
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#4B528A]">
              Puedes ajustar cualquier campo antes de confirmar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-extrabold uppercase text-[#091197]">
                  Distribuidora
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-extrabold text-[#091197]"
              >
                <option value="EDESUR">Prestadora Zona Metropolitana / Sur</option>
                <option value="EDENORTE">Prestadora Zona Norte / Cibao</option>
                <option value="EDEESTE">Prestadora Zona Oriental</option>
                <option value="CEPM">Concesión Turística Este</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-extrabold uppercase text-[#091197]">
                  Tarifa SIE
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    PROVENANCE_LABELS[draftInvoice.tariffCode.status].badgeClass
                  }`}
                >
                  {PROVENANCE_LABELS[draftInvoice.tariffCode.status].label}
                </span>
              </div>
              <select
                value={draftInvoice.tariffCode.value}
                onChange={(e) => updateDraftField("tariffCode", e.target.value)}
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-extrabold text-[#091197]"
              >
                <option value="BTS-1">BTS-1 (Residencial)</option>
                <option value="BTS-2">BTS-2 (Comercial)</option>
                <option value="RES-CEPM">RES-CEPM</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-extrabold uppercase text-[#091197]">
                  Consumo (kWh)
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-extrabold text-[#091197]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-extrabold uppercase text-[#091197]">
                  Total Facturado (RD$)
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-extrabold text-[#03A9EC]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1.5">
                Fecha Cierre Factura
              </label>
              <input
                type="date"
                value={draftInvoice.billingPeriodEnd.value}
                onChange={(e) =>
                  updateDraftField("billingPeriodEnd", e.target.value)
                }
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-semibold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1.5">
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
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-semibold text-[#091197]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDraftInvoice(null)}
                className="px-5 py-2.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-extrabold uppercase text-[#4B528A] hover:text-[#091197] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-6 py-2.5 rounded-[10px] bg-[#091197] hover:bg-[#03A9EC] text-white font-extrabold uppercase text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar y Guardar Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Facturas */}
      <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8">
        <div className="pb-4 mb-5 border-b border-[#D9D9D9]">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
            REGISTRO HISTÓRICO AUDITADO
          </span>
          <h3 className="font-extrabold text-xl uppercase text-[#091197]">
            HISTORIAL DE REGISTROS DE CONSUMO ({sortedInvoices.length})
          </h3>
        </div>

        {sortedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#D9D9D9] text-[#4B528A] text-xs uppercase font-extrabold">
                  <th className="py-3 pr-4">Fecha Cierre</th>
                  <th className="py-3 px-3">Concesión / Tarifa</th>
                  <th className="py-3 px-3">Consumo</th>
                  <th className="py-3 px-3">Promedio Diario</th>
                  <th className="py-3 px-3">Total Facturado</th>
                  <th className="py-3 px-3">Tarifa Media / kWh</th>
                  <th className="py-3 pl-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D9D9]">
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
                    <tr key={inv.id} className="hover:bg-[#F1F1F1]/70">
                      <td className="py-3.5 pr-4 font-extrabold text-[#091197]">
                        {inv.billingPeriodEnd.value}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-[6px] bg-[#091197] text-white text-xs font-extrabold uppercase">
                          {inv.distributor.value} · {inv.tariffCode.value}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-[#091197]">
                        {inv.billedKwh.value.toLocaleString("es-DO")} kWh
                      </td>
                      <td className="py-3.5 px-3 text-[#4B528A] font-semibold">
                        {dailyKwh.toFixed(1)} kWh/día
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-[#03A9EC]">
                        RD${" "}
                        {inv.totalAmountDop.value.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-3 text-[#091197] font-semibold">
                        RD$ {avgKwhRate.toFixed(2)}/kWh
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-2 rounded-[8px] text-[#4B528A] hover:text-[#F75600] hover:bg-[#F75600]/10 transition cursor-pointer"
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
          <div className="text-center py-10 text-sm text-[#4B528A]">
            Aún no se han incorporado facturas a este expediente.
          </div>
        )}
      </div>
    </div>
  );
}
