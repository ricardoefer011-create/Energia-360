"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Gauge,
  History,
  Plus,
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
  calculateDominicanTariffBill,
  calculateMeterReadingDiff,
  resolveTariffSchedule,
} from "@/lib/engine/energy-engine";
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
    label: "Calculado",
    badgeClass: "bg-[#F75600]/15 text-[#F75600] border border-[#F75600]/30",
  },
  no_disponible: {
    label: "Opcional",
    badgeClass: "bg-[#F1F1F1] text-[#4B528A] border border-[#D9D9D9]",
  },
};

const REAL_13_MONTHS_PRESET = [
  { month: "2025-10-05", label: "10/25", kwh: 732, powerKw: 3.75 },
  { month: "2025-11-05", label: "11/25", kwh: 637, powerKw: 3.42 },
  { month: "2025-12-05", label: "12/25", kwh: 537, powerKw: 3.15 },
  { month: "2026-01-05", label: "01/26", kwh: 482, powerKw: 2.95 },
  { month: "2026-02-05", label: "02/26", kwh: 472, powerKw: 2.88 },
  { month: "2026-03-05", label: "03/26", kwh: 460, powerKw: 2.82 },
  { month: "2026-04-05", label: "04/26", kwh: 509, powerKw: 3.1 },
  { month: "2026-05-05", label: "05/26", kwh: 585, powerKw: 3.35 },
  { month: "2026-06-05", label: "06/26", kwh: 651, powerKw: 3.55 },
  { month: "2026-07-05", label: "07/26", kwh: 679, powerKw: 3.68 },
  { month: "2026-08-05", label: "08/26", kwh: 758, powerKw: 3.94 },
  { month: "2026-09-05", label: "09/26", kwh: 752, powerKw: 3.91 },
  { month: "2026-10-05", label: "10/26", kwh: 735, powerKw: 3.816 },
];

export function InvoiceAnalyzerModule({
  invoices,
  defaultDistributor,
  onAddConfirmedInvoice,
  onDeleteInvoice,
}: InvoiceAnalyzerModuleProps) {
  const [inputMode, setInputMode] = useState<
    "manual_form" | "ocr_upload" | "batch_history"
  >("manual_form");

  // Estados del Formulario Manual Completo (Calibrado con el documento real adjunto)
  const [manualDistributor, setManualDistributor] =
    useState<DistributorCode>(defaultDistributor);
  const [manualTariff, setManualTariff] = useState<string>("BTS-1");
  const [manualNic, setManualNic] = useState<string>("2032762");
  const [manualMeter, setManualMeter] = useState<string>("57117767");
  const [manualPeriodStart, setManualPeriodStart] =
    useState<string>("2026-09-04");
  const [manualPeriodEnd, setManualPeriodEnd] = useState<string>("2026-10-05");
  const [manualBillingDays, setManualBillingDays] = useState<number>(31);
  const [manualContractedKw, setManualContractedKw] = useState<number>(4.028);
  const [manualMeasuredKw, setManualMeasuredKw] = useState<number>(3.816);
  const [manualVoltage, setManualVoltage] = useState<string>(
    "Baja 120/240 Doble Monofásica"
  );

  // Lecturas de medidor vs KWh directos
  const [useMeterReadings, setUseMeterReadings] = useState<boolean>(true);
  const [prevReading, setPrevReading] = useState<number>(61465);
  const [currReading, setCurrReading] = useState<number>(62200);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [manualDirectKwh, setManualDirectKwh] = useState<number>(735);

  // Estados de OCR / Texto
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [processingPct, setProcessingPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rawSampleInput, setRawSampleInput] = useState<string>("");
  const [draftInvoice, setDraftInvoice] = useState<ElectricityInvoice | null>(
    null
  );

  // Estado de carga por lote de histórico (13 meses)
  const [batchText, setBatchText] = useState<string>(
    REAL_13_MONTHS_PRESET.map((m) => `${m.month}: ${m.kwh}`).join("\n")
  );

  // Cálculo automático de consumo por diferencia de lecturas
  const meterDiff = useMemo(
    () =>
      calculateMeterReadingDiff(
        prevReading,
        currReading,
        multiplier,
        manualBillingDays
      ),
    [prevReading, currReading, multiplier, manualBillingDays]
  );

  const effectiveManualKwh = useMeterReadings
    ? meterDiff.computedKwh
    : manualDirectKwh;

  // Pliego seleccionado en el formulario manual
  const selectedManualSchedule = useMemo(
    () => resolveTariffSchedule(manualDistributor, manualTariff),
    [manualDistributor, manualTariff]
  );

  // Liquidación calculada por el motor oficial SIE en tiempo real
  const liveEngineCalculation = useMemo(
    () =>
      calculateDominicanTariffBill(
        effectiveManualKwh,
        selectedManualSchedule,
        null,
        manualMeasuredKw
      ),
    [effectiveManualKwh, selectedManualSchedule, manualMeasuredKw]
  );

  function handleSaveManualForm(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (effectiveManualKwh <= 0) {
      setErrorMessage(
        "El consumo (kWh) debe ser mayor que cero. Verifica la Lectura Actual y Anterior."
      );
      return;
    }

    const newInvoice: ElectricityInvoice = {
      id: `inv-manual-${Date.now()}`,
      distributor: {
        value: manualDistributor,
        status: "confirmado_usuario",
      },
      contractNumber: {
        value: manualNic.trim() || "SIN-NIC",
        status: "confirmado_usuario",
      },
      billingPeriodStart: {
        value: manualPeriodStart,
        status: "confirmado_usuario",
      },
      billingPeriodEnd: {
        value: manualPeriodEnd,
        status: "confirmado_usuario",
      },
      billingDays: {
        value: manualBillingDays,
        status: "confirmado_usuario",
      },
      issueDate: {
        value: manualPeriodEnd,
        status: "confirmado_usuario",
      },
      dueDate: {
        value: manualPeriodEnd,
        status: "confirmado_usuario",
      },
      billedKwh: {
        value: effectiveManualKwh,
        status: "confirmado_usuario",
      },
      energyChargeDop: {
        value: liveEngineCalculation.energyChargeDop,
        status: "confirmado_usuario",
      },
      fixedChargeDop: {
        value: liveEngineCalculation.fixedChargeDop,
        status: "confirmado_usuario",
      },
      additionalChargesDop: {
        value: liveEngineCalculation.demandChargeDop,
        status: "confirmado_usuario",
      },
      taxesDop: { value: 0, status: "confirmado_usuario" },
      pendingBalanceDop: { value: 0, status: "confirmado_usuario" },
      totalAmountDop: {
        value: liveEngineCalculation.totalEstimatedBillDop,
        status: "confirmado_usuario",
      },
      tariffCode: {
        value: manualTariff,
        status: "confirmado_usuario",
      },
      confirmedByUserAt: new Date().toISOString(),
      meterNumber: manualMeter.trim() || undefined,
      previousReading: useMeterReadings ? prevReading : undefined,
      currentReading: useMeterReadings ? currReading : undefined,
      meterMultiplier: useMeterReadings ? multiplier : undefined,
      contractedPowerKw: manualContractedKw,
      measuredPowerDemandKw: manualMeasuredKw,
      voltageLevel: manualVoltage,
      unsubsidizedTotalDop: liveEngineCalculation.unsubsidizedTotalDop,
      governmentSubsidyDop: liveEngineCalculation.governmentSubsidyDop,
      notes: `Registrado manualmente · Medidor ${manualMeter} (${
        useMeterReadings
          ? `Lectura ${prevReading} -> ${currReading} = ${effectiveManualKwh} kWh`
          : `${effectiveManualKwh} kWh`
      }) · Sin subsidio: RD$ ${liveEngineCalculation.unsubsidizedTotalDop.toLocaleString(
        "es-DO"
      )} · Aporte Gobierno: -RD$ ${liveEngineCalculation.governmentSubsidyDop.toLocaleString(
        "es-DO"
      )}.`,
    };

    onAddConfirmedInvoice(newInvoice);
  }

  function handleLoadReal735Preset() {
    setManualDistributor("EDESUR");
    setManualTariff("BTS-1");
    setManualNic("2032762");
    setManualMeter("57117767");
    setManualPeriodStart("2026-09-04");
    setManualPeriodEnd("2026-10-05");
    setManualBillingDays(31);
    setManualContractedKw(4.028);
    setManualMeasuredKw(3.816);
    setManualVoltage("Baja 120/240 Doble Monofásica");
    setUseMeterReadings(true);
    setPrevReading(61465);
    setCurrReading(62200);
    setMultiplier(1.0);
    setManualDirectKwh(735);
    setInputMode("manual_form");
  }

  function handleImportBatchHistory() {
    const lines = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const schedule = resolveTariffSchedule(manualDistributor, manualTariff);

    lines.forEach((line, idx) => {
      const match = line.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})\s*[:,-]\s*([0-9]+(?:\.[0-9]+)?)/);
      if (!match) return;
      const dateStr = match[1];
      const kwhVal = parseFloat(match[2]);
      if (kwhVal <= 0) return;

      const calc = calculateDominicanTariffBill(kwhVal, schedule);
      const inv: ElectricityInvoice = {
        id: `inv-batch-${Date.now()}-${idx}`,
        distributor: { value: manualDistributor, status: "confirmado_usuario" },
        contractNumber: { value: manualNic || "2032762", status: "confirmado_usuario" },
        billingPeriodStart: { value: dateStr, status: "confirmado_usuario" },
        billingPeriodEnd: { value: dateStr, status: "confirmado_usuario" },
        billingDays: { value: 30, status: "confirmado_usuario" },
        issueDate: { value: dateStr, status: "confirmado_usuario" },
        dueDate: { value: dateStr, status: "confirmado_usuario" },
        billedKwh: { value: kwhVal, status: "confirmado_usuario" },
        energyChargeDop: { value: calc.energyChargeDop, status: "confirmado_usuario" },
        fixedChargeDop: { value: calc.fixedChargeDop, status: "confirmado_usuario" },
        additionalChargesDop: { value: calc.demandChargeDop, status: "confirmado_usuario" },
        taxesDop: { value: 0, status: "confirmado_usuario" },
        pendingBalanceDop: { value: 0, status: "confirmado_usuario" },
        totalAmountDop: { value: calc.totalEstimatedBillDop, status: "confirmado_usuario" },
        tariffCode: { value: manualTariff, status: "confirmado_usuario" },
        confirmedByUserAt: new Date().toISOString(),
        meterNumber: manualMeter || "57117767",
        contractedPowerKw: manualContractedKw,
        unsubsidizedTotalDop: calc.unsubsidizedTotalDop,
        governmentSubsidyDop: calc.governmentSubsidyDop,
        notes: `Importado en lote histórico (${dateStr}).`,
      };
      onAddConfirmedInvoice(inv);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
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
        "Pega el texto de tu estado de cuenta o presiona 'Cargar ejemplo real 735 kWh'."
      );
      return;
    }
    setErrorMessage(null);
    const parsed = parseDominicanInvoiceText(
      rawSampleInput,
      "estado_consumo_local.txt"
    );
    setDraftInvoice(parsed.draftInvoice);
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

  function handleConfirmAndSaveDraft() {
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
  }

  const sortedInvoices = [...invoices].sort((a, b) =>
    b.billingPeriodEnd.value.localeCompare(a.billingPeriodEnd.value)
  );

  // Comparativa con 699 kWh si el usuario superó los 700 kWh en el formulario manual
  const comparisonAt699 = useMemo(
    () => calculateDominicanTariffBill(699, selectedManualSchedule),
    [selectedManualSchedule]
  );

  return (
    <div className="space-y-6">
      {/* CABECERA CON SELECTOR DE HERRAMIENTA DE ENTRADA */}
      <div className="bg-[#091197] text-white p-6 sm:p-7 rounded-[12px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#03A9EC]">
            ENTRADA MANUAL DE PRECISIÓN · ESCÁNER OCR · LOTE HISTÓRICO
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-1">
            CENTRO DE CARGA DE DATOS ENERGÉTICOS Y LECTURAS DE MEDIDOR
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white/10 p-1.5 rounded-[10px]">
          <button
            type="button"
            onClick={() => setInputMode("manual_form")}
            className={`px-3.5 py-2 rounded-[8px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer ${
              inputMode === "manual_form"
                ? "bg-[#03A9EC] text-white"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>1. Carga Manual Completa</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("batch_history")}
            className={`px-3.5 py-2 rounded-[8px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer ${
              inputMode === "batch_history"
                ? "bg-[#03A9EC] text-white"
                : "text-white/80 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>2. Subir Histórico 13 Meses</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("ocr_upload")}
            className={`px-3.5 py-2 rounded-[8px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer ${
              inputMode === "ocr_upload"
                ? "bg-[#03A9EC] text-white"
                : "text-white/80 hover:text-white"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>3. Escáner PDF / Imagen</span>
          </button>
        </div>
      </div>

      {/* ================= MODO 1: FORMULARIO DE CARGA MANUAL COMPLETA (ESTILO ESTADO DE CUENTA REAL) ================= */}
      {inputMode === "manual_form" && (
        <form
          onSubmit={handleSaveManualForm}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Columna Izquierda (7 cols): Lecturas de Contador, Potencia y Contrato */}
          <div className="lg:col-span-7 bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D9D9D9]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                  INGRESO MANUAL DE DATOS TÉCNICOS
                </span>
                <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                  PARÁMETROS DEL SUMINISTRO Y LECTURAS DE MEDIDOR
                </h3>
              </div>

              <button
                type="button"
                onClick={handleLoadReal735Preset}
                className="px-3.5 py-2 rounded-[8px] bg-[#F1F1F1] hover:bg-[#091197] text-[#091197] hover:text-white border border-[#03A9EC] text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#03A9EC]" />
                <span>Cargar Ejemplo Real (735 kWh · RD$ 9,749.74)</span>
              </button>
            </div>

            {/* Bloque A: Prestadora, Tarifa, NIC y Medidor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Zona / Prestadora
                </label>
                <select
                  value={manualDistributor}
                  onChange={(e) =>
                    setManualDistributor(e.target.value as DistributorCode)
                  }
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#091197]"
                >
                  <option value="EDESUR">Zona Metropolitana / Sur</option>
                  <option value="EDENORTE">Zona Norte / Cibao</option>
                  <option value="EDEESTE">Zona Oriental</option>
                  <option value="CEPM">Concesión Turística Este</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Pliego Tarifario
                </label>
                <select
                  value={manualTariff}
                  onChange={(e) => setManualTariff(e.target.value)}
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#091197]"
                >
                  <option value="BTS-1">BTS-1 (Residencial Escalonada)</option>
                  <option value="BTS-2">BTS-2 (Comercial Simple)</option>
                  <option value="BTD">BTD (Baja Tensión + Demanda kW)</option>
                  <option value="MTD-1">MTD-1 (Media Tensión Industrial)</option>
                  <option value="RES-CEPM">RES-CEPM (Continua Este)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Contrato (NIC / NIS)
                </label>
                <input
                  type="text"
                  value={manualNic}
                  onChange={(e) => setManualNic(e.target.value)}
                  placeholder="Ej. 2032762"
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3.5 text-xs font-mono font-extrabold text-[#091197]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  No. Contador / Medidor
                </label>
                <input
                  type="text"
                  value={manualMeter}
                  onChange={(e) => setManualMeter(e.target.value)}
                  placeholder="Ej. 57117767"
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3.5 text-xs font-mono font-extrabold text-[#091197]"
                />
              </div>
            </div>

            {/* Bloque B: Lecturas del Contador (Activa B.T.) vs Consumo Directo */}
            <div className="p-5 rounded-[12px] bg-[#F1F1F1] border border-[#D9D9D9] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#03A9EC]" />
                  <span className="text-xs font-extrabold uppercase text-[#091197]">
                    CÁLCULO DE CONSUMO ACTIVA B.T. (MEDIDOR)
                  </span>
                </div>

                <div className="inline-flex rounded-[8px] bg-white p-1 border border-[#D9D9D9] text-[11px] font-extrabold uppercase">
                  <button
                    type="button"
                    onClick={() => setUseMeterReadings(true)}
                    className={`px-3 py-1 rounded-[6px] transition cursor-pointer ${
                      useMeterReadings
                        ? "bg-[#091197] text-white"
                        : "text-[#091197]"
                    }`}
                  >
                    Por Lectura de Contador
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseMeterReadings(false)}
                    className={`px-3 py-1 rounded-[6px] transition cursor-pointer ${
                      !useMeterReadings
                        ? "bg-[#091197] text-white"
                        : "text-[#091197]"
                    }`}
                  >
                    Escribir kWh Directo
                  </button>
                </div>
              </div>

              {useMeterReadings ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#4B528A] mb-1">
                      Lectura Anterior
                    </label>
                    <input
                      type="number"
                      value={prevReading}
                      onChange={(e) =>
                        setPrevReading(parseFloat(e.target.value) || 0)
                      }
                      className="w-full h-11 rounded-[8px] bg-white border border-[#D9D9D9] px-3 text-sm font-mono font-extrabold text-[#091197]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#4B528A] mb-1">
                      Lectura Actual
                    </label>
                    <input
                      type="number"
                      value={currReading}
                      onChange={(e) =>
                        setCurrReading(parseFloat(e.target.value) || 0)
                      }
                      className="w-full h-11 rounded-[8px] bg-white border border-[#D9D9D9] px-3 text-sm font-mono font-extrabold text-[#091197]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#4B528A] mb-1">
                      Múltiplo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={multiplier}
                      onChange={(e) =>
                        setMultiplier(parseFloat(e.target.value) || 1)
                      }
                      className="w-full h-11 rounded-[8px] bg-white border border-[#D9D9D9] px-3 text-sm font-mono font-extrabold text-[#091197]"
                    />
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-[#091197] text-white text-center">
                    <span className="text-[10px] font-bold uppercase text-[#03A9EC] block">
                      CONSUMO CALCULADO
                    </span>
                    <span className="text-lg font-extrabold tabular-nums">
                      {meterDiff.computedKwh} kWh
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                    Consumo Mensual Facturado (kWh)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    value={manualDirectKwh}
                    onChange={(e) =>
                      setManualDirectKwh(parseFloat(e.target.value) || 0)
                    }
                    className="w-full h-12 rounded-[10px] bg-white border border-[#03A9EC] px-4 text-lg font-extrabold text-[#091197]"
                  />
                </div>
              )}
            </div>

            {/* Bloque C: Potencia Contratada, Demanda Leída y Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Potencia Contratada (kW)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={manualContractedKw}
                  onChange={(e) =>
                    setManualContractedKw(parseFloat(e.target.value) || 0)
                  }
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#091197]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Potencia Leída B.T. (kW)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={manualMeasuredKw}
                  onChange={(e) =>
                    setManualMeasuredKw(parseFloat(e.target.value) || 0)
                  }
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#03A9EC]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Días del Ciclo
                </label>
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={manualBillingDays}
                  onChange={(e) =>
                    setManualBillingDays(parseInt(e.target.value, 10) || 30)
                  }
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#091197]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#091197] mb-1">
                  Fecha de Corte
                </label>
                <input
                  type="date"
                  value={manualPeriodEnd}
                  onChange={(e) => setManualPeriodEnd(e.target.value)}
                  className="w-full h-11 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 text-xs font-extrabold text-[#091197]"
                />
              </div>
            </div>
          </div>

          {/* Columna Derecha (5 cols): Liquidación Oficial Exacta en Vivo (Igual al Bloque 5 y 6 de la factura) */}
          <div className="lg:col-span-5 bg-white rounded-[12px] border-2 border-[#03A9EC] p-6 sm:p-7 shadow-xl space-y-5">
            <div className="pb-4 border-b border-[#D9D9D9] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                  MOTOR DE CÁLCULO TARIFARIO EN VIVO
                </span>
                <h4 className="text-xl font-extrabold uppercase text-[#091197]">
                  CÁLCULO DE LA LIQUIDACIÓN
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#091197] text-white text-xs font-extrabold uppercase">
                {manualTariff}
              </span>
            </div>

            {/* Desglose idéntico a la factura real adjunta */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[#D9D9D9]">
                <div>
                  <p className="font-extrabold uppercase text-[#091197]">
                    Cargo Fijo
                  </p>
                  <p className="text-xs text-[#4B528A]">
                    {manualBillingDays} días, RD${" "}
                    {liveEngineCalculation.fixedChargeDop.toFixed(2)}
                  </p>
                </div>
                <span className="font-extrabold text-[#091197] tabular-nums">
                  RD$ {liveEngineCalculation.fixedChargeDop.toFixed(2)}
                </span>
              </div>

              {/* Bloques de energía */}
              {liveEngineCalculation.blocksBreakdown.map((blk, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-[#D9D9D9]"
                >
                  <div>
                    <p className="font-extrabold uppercase text-[#091197]">
                      Energía ({blk.label})
                    </p>
                    <p className="text-xs text-[#4B528A]">
                      {blk.kwhInBlock} kWh × RD$ {blk.rateDop.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-extrabold text-[#091197] tabular-nums">
                    RD${" "}
                    {blk.subtotalDop.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}

              {liveEngineCalculation.demandChargeDop > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-[#D9D9D9]">
                  <div>
                    <p className="font-extrabold uppercase text-[#091197]">
                      Cargo por Potencia Demandada
                    </p>
                    <p className="text-xs text-[#4B528A]">
                      {manualMeasuredKw} kW leídos
                    </p>
                  </div>
                  <span className="font-extrabold text-[#091197] tabular-nums">
                    RD${" "}
                    {liveEngineCalculation.demandChargeDop.toLocaleString(
                      "es-DO",
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Recuadro de Subsidio Gubernamental e Importe Total (Bloque 6 de la factura) */}
            <div className="p-4 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#4B528A]">
                <span>IMPORTE TOTAL SIN SUBSIDIO RD$:</span>
                <span className="font-extrabold text-[#091197] tabular-nums">
                  {liveEngineCalculation.unsubsidizedTotalDop.toLocaleString(
                    "es-DO",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-[#008A5E]">
                <span>APORTE TOTAL GOBIERNO (SUBSIDIO FETE) RD$:</span>
                <span className="font-extrabold tabular-nums">
                  -{" "}
                  {liveEngineCalculation.governmentSubsidyDop.toLocaleString(
                    "es-DO",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>

              <div className="pt-2.5 border-t border-[#D9D9D9] flex items-baseline justify-between">
                <span className="text-xs sm:text-sm font-extrabold uppercase text-[#091197]">
                  VALOR TOTAL A PAGAR EN RD$
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#091197] tabular-nums">
                  RD${" "}
                  {liveEngineCalculation.totalEstimatedBillDop.toLocaleString(
                    "es-DO",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>
            </div>

            {/* Alerta de ahorro inmediato si superó los 700 kWh */}
            {liveEngineCalculation.lostStepSubsidy701 && (
              <div className="p-4 rounded-[10px] bg-[#F75600]/10 border border-[#F75600] text-xs text-[#091197] leading-relaxed">
                <strong className="text-[#F75600] uppercase font-extrabold block mb-0.5">
                  ¡Penalización de Escalón Detectada ({effectiveManualKwh} kWh)!
                </strong>
                Por superar los 700 kWh por solo{" "}
                <strong>{(effectiveManualKwh - 700).toFixed(0)} kWh</strong>,
                todos tus kWh se están cobrando a{" "}
                <strong>
                  RD$ {liveEngineCalculation.marginalRateDopPerKwh}/kWh
                </strong>
                . Si hubieras consumido <strong>699 kWh</strong>, habrías pagado{" "}
                <strong>
                  RD${" "}
                  {comparisonAt699.totalEstimatedBillDop.toLocaleString(
                    "es-DO",
                    { minimumFractionDigits: 2 }
                  )}
                </strong>{" "}
                (ahorrándote{" "}
                <strong className="text-[#F75600]">
                  RD${" "}
                  {(
                    liveEngineCalculation.totalEstimatedBillDop -
                    comparisonAt699.totalEstimatedBillDop
                  ).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                </strong>{" "}
                en este mismo mes).
              </div>
            )}

            <button type="submit" className="grupamar-cta w-full">
              <span>GUARDAR ESTOS DATOS EN MI EXPEDIENTE</span>
              <span className="grupamar-cta-arrow">
                <Plus className="w-5 h-5" />
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ================= MODO 2: SUBIR HISTÓRICO DE 13 MESES EN LOTE ================= */}
      {inputMode === "batch_history" && (
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                CARGA MASIVA DE HISTÓRICO DE CONSUMOS (12 - 13 MESES)
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                IMPORTAR SERIE HISTÓRICA MENSUAL AL DASHBOARD
              </h3>
              <p className="text-xs text-[#4B528A] mt-0.5">
                Escribe o pega una línea por mes en formato{" "}
                <code>AAAA-MM-DD: kWh</code>. Ya viene precargado con los 13
                meses del documento real (Oct 2025 a Oct 2026).
              </p>
            </div>
          </div>

          <textarea
            rows={8}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] p-4 font-mono text-xs font-bold text-[#091197]"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImportBatchHistory}
              className="grupamar-cta"
            >
              <span>CALCULAR E IMPORTAR LOS 13 MESES AL EXPEDIENTE</span>
              <span className="grupamar-cta-arrow">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MODO 3: ESCÁNER OCR DE PDF / IMAGEN ================= */}
      {inputMode === "ocr_upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
              OPCIÓN A · ARCHIVO DIGITAL
            </span>
            <h3 className="font-extrabold text-xl uppercase text-[#091197] mt-0.5 mb-1">
              SUBIR REPORTE DE CONSUMO (PDF O IMAGEN)
            </h3>
            <p className="text-xs text-[#4B528A] mb-5">
              Analiza localmente NIC, Medidor, Lectura Anterior/Actual, Potencia
              Contratada, Importe Sin Subsidio, Aporte Gobierno y Total.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#03A9EC] hover:border-[#091197] rounded-[12px] p-8 cursor-pointer bg-[#F1F1F1] hover:bg-[#03A9EC]/10 transition">
              <div className="w-12 h-12 rounded-[10px] bg-[#091197] text-white flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6 text-[#03A9EC]" />
              </div>
              <span className="font-extrabold text-sm uppercase text-[#091197]">
                SELECCIONAR DOCUMENTO DE CONSUMO (PDF O IMAGEN)
              </span>
              <span className="text-xs text-[#4B528A] mt-1">
                Reconocimiento óptico 100% local en tu navegador
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
          </div>

          <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    OPCIÓN B · TEXTO DE ESTADO DE CONSUMO
                  </span>
                  <h3 className="font-extrabold text-xl uppercase text-[#091197] mt-0.5">
                    PEGAR TEXTO DE DOCUMENTO ELECTRÓNICO
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRawSampleInput(
                      "NIC: 2032762 Medidor: 57117767 TARIFA: BTS1 POTENCIA CONTRATADA 4.028 kW PERIODO DE FACTURACION 04/09/2026 - 05/10/2026 = 31 dias Potencia B.T. 57117767 0 3.816 1.0000 3.816 kW Activa B.T. 57117767 61465 62200 1.0000 735 kWh Cargo fijo 31 dias, RD$ 128.59 Energia 735 kWh X RD$ 13.09 = 9,621.15 IMPORTE TOTAL SIN SUBSIDIO RD$: 11,178.43 APORTE TOTAL GOBIERNO RD$: 1,428.69 VALOR TOTAL A PAGAR EN RD$ 9,749.74"
                    )
                  }
                  className="text-xs font-extrabold uppercase text-[#03A9EC] hover:text-[#091197] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Cargar ejemplo real 735 kWh
                </button>
              </div>
              <textarea
                rows={4}
                value={rawSampleInput}
                onChange={(e) => setRawSampleInput(e.target.value)}
                placeholder="Pega aquí el texto extraído de tu estado de cuenta..."
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] p-4 text-xs text-[#091197] font-medium focus:outline-none focus:border-[#03A9EC] mt-3"
              />
            </div>
            <button
              type="button"
              onClick={handleAnalyzePastedText}
              className="grupamar-cta w-full mt-4"
            >
              <span>EXTRAER DATOS Y AUDITAR</span>
              <span className="grupamar-cta-arrow">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-[10px] bg-[#F75600]/10 border border-[#F75600] text-xs font-bold text-[#F75600] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Revisión de borrador extraído por OCR */}
      {draftInvoice && (
        <div className="bg-white rounded-[12px] p-6 sm:p-8 border-2 border-[#03A9EC] shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-[#D9D9D9]">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-[#03A9EC]" />
              <h3 className="font-extrabold text-lg uppercase text-[#091197]">
                VERIFICACIÓN TÉCNICA DE DATOS EXTRAÍDOS
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Consumo (kWh)
              </label>
              <input
                type="number"
                value={draftInvoice.billedKwh.value}
                onChange={(e) =>
                  updateDraftField("billedKwh", parseFloat(e.target.value) || 0)
                }
                className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-xs font-extrabold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Valor Total a Pagar (RD$)
              </label>
              <input
                type="number"
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

            <div className="sm:col-span-2 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDraftInvoice(null)}
                className="px-5 py-2.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-extrabold uppercase text-[#4B528A]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSaveDraft}
                className="px-6 py-2.5 rounded-[10px] bg-[#091197] hover:bg-[#03A9EC] text-white font-extrabold uppercase text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e Incorporar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA HISTÓRICA COMPLETA CON SUBSIDIO Y LECTURAS */}
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
                <tr className="border-b border-[#D9D9D9] text-[#4B528A] text-[11px] uppercase font-extrabold">
                  <th className="py-3 pr-3">Corte / Ciclo</th>
                  <th className="py-3 px-2">Pliego / NIC</th>
                  <th className="py-3 px-2">Lecturas / Potencia</th>
                  <th className="py-3 px-2">Consumo</th>
                  <th className="py-3 px-2">Sin Subsidio</th>
                  <th className="py-3 px-2">Aporte Gobierno</th>
                  <th className="py-3 px-2">Valor Pagado</th>
                  <th className="py-3 pl-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D9D9]">
                {sortedInvoices.map((inv) => {
                  const schedule = resolveTariffSchedule(
                    inv.distributor.value,
                    inv.tariffCode.value
                  );
                  const calc = calculateDominicanTariffBill(
                    inv.billedKwh.value,
                    schedule
                  );
                  const unsub =
                    inv.unsubsidizedTotalDop ?? calc.unsubsidizedTotalDop;
                  const govSub =
                    inv.governmentSubsidyDop ?? calc.governmentSubsidyDop;

                  return (
                    <tr key={inv.id} className="hover:bg-[#F1F1F1]/70">
                      <td className="py-3.5 pr-3 font-extrabold text-[#091197]">
                        <div>{inv.billingPeriodEnd.value}</div>
                        <div className="text-[10px] font-semibold text-[#4B528A]">
                          {inv.billingDays.value} días
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="px-2 py-0.5 rounded bg-[#091197] text-white text-[10px] font-extrabold uppercase">
                          {inv.tariffCode.value}
                        </span>
                        <div className="text-[11px] font-mono text-[#4B528A] mt-0.5">
                          NIC: {inv.contractNumber.value}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-xs text-[#4B528A]">
                        {inv.previousReading !== undefined &&
                        inv.currentReading !== undefined ? (
                          <div className="font-mono font-bold text-[#091197]">
                            {inv.previousReading} → {inv.currentReading}
                          </div>
                        ) : (
                          <div>Lectura Directa</div>
                        )}
                        {inv.measuredPowerDemandKw && (
                          <div className="text-[10px] font-bold text-[#03A9EC]">
                            Pot. {inv.measuredPowerDemandKw} /{" "}
                            {inv.contractedPowerKw || 4.028} kW
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-2 font-extrabold text-[#091197]">
                        {inv.billedKwh.value.toLocaleString("es-DO")} kWh
                        {inv.billedKwh.value >= 701 && (
                          <span className="block text-[10px] text-[#F75600] font-extrabold uppercase">
                            Tarifa Plena
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 font-semibold text-[#4B528A] tabular-nums">
                        RD${" "}
                        {unsub.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-2 font-extrabold text-[#008A5E] tabular-nums">
                        - RD${" "}
                        {govSub.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-2 font-extrabold text-[#091197] tabular-nums">
                        RD${" "}
                        {inv.totalAmountDop.value.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 pl-2 text-right">
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
            Aún no se han incorporado registros a este expediente.
          </div>
        )}
      </div>
    </div>
  );
}
