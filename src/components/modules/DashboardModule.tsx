"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Calculator,
  CheckCircle2,
  Compass,
  Cpu,
  FileSpreadsheet,
  Gauge,
  Landmark,
  Plus,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LocalVaultPayload,
  TariffSchedule,
  TriggeredAlert,
} from "@/types/energia360";
import {
  calculateApplianceConsumption,
  calculateDominicanTariffBill,
  calculateInverterAutonomy,
} from "@/lib/engine/energy-engine";
import { INITIAL_SIE_TARIFF_SCHEDULES } from "@/lib/data/rd-energy-catalog";

interface DashboardModuleProps {
  vault: LocalVaultPayload;
  activeSchedule: TariffSchedule;
  triggeredAlerts: TriggeredAlert[];
  isDemoMode: boolean;
  onNavigateTab: (tab: string) => void;
  onLoadDemoMode: () => void;
}

const GRUPAMAR_CHART_COLORS = [
  "#091197",
  "#03A9EC",
  "#F75600",
  "#1E3A8A",
  "#0284C7",
  "#4B528A",
  "#008A5E",
];

export function DashboardModule({
  vault,
  activeSchedule,
  triggeredAlerts,
  onNavigateTab,
  onLoadDemoMode,
}: DashboardModuleProps) {
  const [periodFilter, setPeriodFilter] = useState<"3m" | "6m" | "13m">("13m");
  const [viewUnit, setViewUnit] = useState<"kwh" | "dop">("kwh");
  const [activeToolTab, setActiveToolTab] = useState<
    "meter_projector" | "what_if_699" | "national_comparator"
  >("meter_projector");

  const sortedInvoices = useMemo(
    () =>
      [...vault.invoices].sort((a, b) =>
        a.billingPeriodEnd.value.localeCompare(b.billingPeriodEnd.value)
      ),
    [vault.invoices]
  );

  const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
  const prevInvoice =
    sortedInvoices.length >= 2
      ? sortedInvoices[sortedInvoices.length - 2]
      : undefined;

  const preliminaryBill = calculateDominicanTariffBill(
    latestInvoice?.billedKwh.value || 350,
    activeSchedule,
    vault.profile.customRateDopPerKwh,
    latestInvoice?.measuredPowerDemandKw ||
      latestInvoice?.contractedPowerKw ||
      0
  );

  const applianceBreakdown = useMemo(() => {
    return vault.appliances
      .map((app) => {
        const metrics = calculateApplianceConsumption(
          app,
          preliminaryBill.averageRateDopPerKwh
        );
        return {
          ...app,
          ...metrics,
        };
      })
      .sort((a, b) => b.monthlyKwh - a.monthlyKwh);
  }, [vault.appliances, preliminaryBill.averageRateDopPerKwh]);

  const totalAppliancesMonthlyKwh = useMemo(
    () =>
      Math.round(
        applianceBreakdown.reduce((acc, item) => acc + item.monthlyKwh, 0) * 100
      ) / 100,
    [applianceBreakdown]
  );

  const currentReferenceKwh =
    latestInvoice?.billedKwh.value || totalAppliancesMonthlyKwh || 0;

  const currentDemandKw =
    latestInvoice?.measuredPowerDemandKw ||
    latestInvoice?.contractedPowerKw ||
    3.816;
  const currentContractedKw = latestInvoice?.contractedPowerKw || 4.028;

  const billSimulation = useMemo(
    () =>
      calculateDominicanTariffBill(
        currentReferenceKwh,
        activeSchedule,
        vault.profile.customRateDopPerKwh,
        currentDemandKw
      ),
    [
      currentReferenceKwh,
      activeSchedule,
      vault.profile.customRateDopPerKwh,
      currentDemandKw,
    ]
  );

  // Simulación a 699 kWh para cuantificar el sobrecosto exacto de cruzar 700 kWh
  const billAt699 = useMemo(
    () =>
      calculateDominicanTariffBill(
        699,
        activeSchedule,
        vault.profile.customRateDopPerKwh,
        currentDemandKw
      ),
    [activeSchedule, vault.profile.customRateDopPerKwh, currentDemandKw]
  );

  const stepPenaltyOver699Dop =
    currentReferenceKwh >= 701
      ? Math.max(
          0,
          Math.round(
            (billSimulation.totalEstimatedBillDop -
              billAt699.totalEstimatedBillDop) *
              100
          ) / 100
        )
      : 0;

  const dailyAverageKwh =
    latestInvoice && latestInvoice.billingDays.value > 0
      ? Math.round(
          (latestInvoice.billedKwh.value / latestInvoice.billingDays.value) *
            100
        ) / 100
      : Math.round((totalAppliancesMonthlyKwh / 30) * 100) / 100;

  const monthOverMonthVariationPct =
    latestInvoice && prevInvoice && prevInvoice.billedKwh.value > 0
      ? Math.round(
          ((latestInvoice.billedKwh.value - prevInvoice.billedKwh.value) /
            prevInvoice.billedKwh.value) *
            1000
        ) / 10
      : null;

  // Estados de las herramientas interactivas del Dashboard
  const [midMonthPrevReading, setMidMonthPrevReading] = useState<number>(
    latestInvoice?.currentReading || 62200
  );
  const [midMonthTodayReading, setMidMonthTodayReading] = useState<number>(
    (latestInvoice?.currentReading || 62200) + 335
  );
  const [midMonthElapsedDays, setMidMonthElapsedDays] = useState<number>(15);
  const [midMonthCycleDays, setMidMonthCycleDays] = useState<number>(31);
  const [midMonthMultiplier, setMidMonthMultiplier] = useState<number>(
    latestInvoice?.meterMultiplier || 1
  );

  const [whatIfTargetKwh, setWhatIfTargetKwh] = useState<number>(
    currentReferenceKwh >= 701 ? 699 : Math.max(180, currentReferenceKwh - 80)
  );

  // Cálculo de la Herramienta 1: Proyector de Lectura de Medidor a Mitad de Mes
  const meterProjection = useMemo(() => {
    const consumedSoFar = Math.max(
      0,
      Math.round(
        (midMonthTodayReading - midMonthPrevReading) * midMonthMultiplier * 100
      ) / 100
    );
    const validElapsed = Math.max(1, midMonthElapsedDays);
    const validCycle = Math.max(validElapsed, midMonthCycleDays);
    const remainingDays = Math.max(0, validCycle - validElapsed);
    const dailyPace = Math.round((consumedSoFar / validElapsed) * 100) / 100;
    const projectedCycleKwh = Math.round(dailyPace * validCycle);

    const projectedBill = calculateDominicanTariffBill(
      projectedCycleKwh,
      activeSchedule,
      vault.profile.customRateDopPerKwh,
      currentDemandKw
    );

    const safeAllowanceRemainingKwh = Math.max(0, 699 - consumedSoFar);
    const maxSafeDailyKwhRemaining =
      remainingDays > 0
        ? Math.round((safeAllowanceRemainingKwh / remainingDays) * 100) / 100
        : 0;

    return {
      consumedSoFar,
      dailyPace,
      projectedCycleKwh,
      projectedBill,
      remainingDays,
      safeAllowanceRemainingKwh,
      maxSafeDailyKwhRemaining,
    };
  }, [
    midMonthPrevReading,
    midMonthTodayReading,
    midMonthElapsedDays,
    midMonthCycleDays,
    midMonthMultiplier,
    activeSchedule,
    vault.profile.customRateDopPerKwh,
    currentDemandKw,
  ]);

  // Cálculo de la Herramienta 2: Simulador What-If
  const whatIfSimulation = useMemo(
    () =>
      calculateDominicanTariffBill(
        whatIfTargetKwh,
        activeSchedule,
        vault.profile.customRateDopPerKwh,
        currentDemandKw
      ),
    [
      whatIfTargetKwh,
      activeSchedule,
      vault.profile.customRateDopPerKwh,
      currentDemandKw,
    ]
  );

  // Cálculo de la Herramienta 3: Motor Comparador Nacional Multi-Prestadora
  const nationalComparisonRows = useMemo(() => {
    const schedules =
      vault.customTariffs.length > 0
        ? vault.customTariffs
        : INITIAL_SIE_TARIFF_SCHEDULES;

    return schedules.map((sched) => {
      const sim = calculateDominicanTariffBill(
        currentReferenceKwh,
        sched,
        null,
        currentDemandKw
      );
      return {
        schedule: sched,
        simulation: sim,
      };
    });
  }, [vault.customTariffs, currentReferenceKwh, currentDemandKw]);

  // Serie histórica de 13 meses (combina el histórico de 13 meses de la última factura o las facturas registradas)
  const historicalChartData = useMemo(() => {
    if (
      periodFilter === "13m" &&
      latestInvoice?.historical13Months &&
      latestInvoice.historical13Months.length > 0
    ) {
      return latestInvoice.historical13Months.map((h) => {
        const sim = calculateDominicanTariffBill(
          h.kwh,
          activeSchedule,
          vault.profile.customRateDopPerKwh,
          currentDemandKw
        );
        return {
          periodo: h.monthLabel,
          kwh: h.kwh,
          dop: sim.totalEstimatedBillDop,
          over700: h.kwh >= 701,
        };
      });
    }

    const sliceCount =
      periodFilter === "3m" ? 3 : periodFilter === "6m" ? 6 : 13;
    return sortedInvoices.slice(-sliceCount).map((inv) => ({
      periodo: inv.billingPeriodEnd.value.slice(0, 7),
      kwh: inv.billedKwh.value,
      dop: inv.totalAmountDop.value,
      over700: inv.billedKwh.value >= 701,
    }));
  }, [
    periodFilter,
    latestInvoice,
    sortedInvoices,
    activeSchedule,
    vault.profile.customRateDopPerKwh,
    currentDemandKw,
  ]);

  const categoryDistribution = useMemo(() => {
    const map = new Map<
      string,
      { name: string; kwh: number; costDop: number }
    >();
    for (const item of applianceBreakdown) {
      const existing = map.get(item.category) || {
        name: item.category,
        kwh: 0,
        costDop: 0,
      };
      existing.kwh = Math.round((existing.kwh + item.monthlyKwh) * 10) / 10;
      existing.costDop =
        Math.round((existing.costDop + item.estimatedMonthlyCostDop) * 10) / 10;
      map.set(item.category, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.kwh - a.kwh);
  }, [applianceBreakdown]);

  const efficiencyScore = useMemo(() => {
    if (currentReferenceKwh === 0) return null;
    let score = 84;
    if (billSimulation.lostStepSubsidy701) score -= 22;
    else if (currentReferenceKwh > 600) score -= 10;
    else if (currentReferenceKwh <= 300) score += 10;

    const inverterEquipCount = vault.appliances.filter((a) =>
      a.efficiencyRating.toLowerCase().includes("inverter")
    ).length;
    if (inverterEquipCount > 0) score += 6;
    return Math.max(25, Math.min(98, score));
  }, [currentReferenceKwh, billSimulation.lostStepSubsidy701, vault.appliances]);

  const hasAnyRealData =
    vault.invoices.length > 0 || vault.appliances.length > 0;

  if (!hasAnyRealData) {
    return (
      <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-8 sm:p-12 text-center max-w-3xl mx-auto my-6">
        <div className="w-16 h-16 rounded-[12px] bg-[#091197] flex items-center justify-center mx-auto mb-5">
          <Zap className="w-8 h-8 text-[#03A9EC]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#091197] mb-3">
          EXPEDIENTE ENERGÉTICO LISTO PARA AUDITORÍA
        </h2>
        <p className="text-[#4B528A] max-w-xl mx-auto text-base mb-8">
          Para activar la simulación con el pliego de{" "}
          <strong className="text-[#091197]">
            {vault.profile.distributor} ({vault.profile.tariffCode})
          </strong>
          , selecciona cómo deseas iniciar:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <button
            onClick={() => onNavigateTab("facturas")}
            className="p-6 rounded-[12px] bg-[#F1F1F1] hover:bg-white border border-[#D9D9D9] hover:border-[#03A9EC] transition cursor-pointer"
          >
            <FileSpreadsheet className="w-6 h-6 text-[#03A9EC] mb-3" />
            <div className="font-extrabold uppercase text-sm text-[#091197] mb-1">
              SUBIR DATOS MANUALES U OCR
            </div>
            <p className="text-xs text-[#4B528A]">
              Digita tus lecturas de medidor, histórico de 13 meses o escanea tu
              recibo.
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("equipos")}
            className="p-6 rounded-[12px] bg-[#F1F1F1] hover:bg-white border border-[#D9D9D9] hover:border-[#03A9EC] transition cursor-pointer"
          >
            <Calculator className="w-6 h-6 text-[#091197] mb-3" />
            <div className="font-extrabold uppercase text-sm text-[#091197] mb-1">
              INVENTARIO DE EQUIPOS
            </div>
            <p className="text-xs text-[#4B528A]">
              Incorpora tus aires acondicionados, nevera y cargas críticas.
            </p>
          </button>

          <button
            onClick={onLoadDemoMode}
            className="p-6 rounded-[12px] bg-[#091197] hover:bg-[#03A9EC] text-white transition cursor-pointer"
          >
            <Sparkles className="w-6 h-6 text-[#03A9EC] mb-3" />
            <div className="font-extrabold uppercase text-sm text-white mb-1">
              CARGAR EXPEDIENTE REAL (735 KWH)
            </div>
            <p className="text-xs text-white/80">
              Audita un caso real calibrado con lecturas de medidor e histórico
              de 13 meses.
            </p>
          </button>
        </div>
      </div>
    );
  }

  const criticalBackupWatts = vault.appliances
    .filter((a) => a.isCriticalBackupLoad)
    .reduce((s, a) => s + a.nominalWatts * a.quantity * a.dutyCycleFactor, 0);

  const primaryInverter = vault.inverterSystems[0];
  const inverterAutonomy = primaryInverter
    ? calculateInverterAutonomy(primaryInverter, criticalBackupWatts || 420)
    : null;

  const powerUtilizationPct =
    currentContractedKw > 0
      ? Math.min(100, Math.round((currentDemandKw / currentContractedKw) * 1000) / 10)
      : 0;

  const unsubsidizedTotalDop =
    latestInvoice?.unsubsidizedTotalDop || billSimulation.unsubsidizedTotalDop;
  const governmentSubsidyDop =
    latestInvoice?.governmentSubsidyDop || billSimulation.governmentSubsidyDop;

  return (
    <div className="space-y-6">
      {/* ================= BANNER EJECUTIVO CON TELEMETRÍA TÉCNICA DE SUMINISTRO ================= */}
      <div className="rounded-[12px] bg-[#091197] text-white p-5 sm:p-7 border border-[#091197] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1 rounded-[6px] bg-[#03A9EC] text-white">
                {activeSchedule.distributor_code} · PLIEGO{" "}
                {activeSchedule.tariff_code}
              </span>
              {latestInvoice?.contractNumber?.value && (
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-white/10 text-white border border-white/15">
                  NIC: {latestInvoice.contractNumber.value}
                </span>
              )}
              {latestInvoice?.meterNumber && (
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-white/10 text-[#03A9EC] border border-[#03A9EC]/30">
                  MEDIDOR #{latestInvoice.meterNumber}
                </span>
              )}
              {billSimulation.lostStepSubsidy701 ? (
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-[#F75600] text-white inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> PENALIZACIÓN &ge;
                  701 KWH ACTIVA (TARIFA PLANA RD$ 13.09)
                </span>
              ) : (
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-[#008A5E] text-white inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ESCALONES PROTEGIDOS
                  SIE ACTIVOS
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-2.5">
              {vault.profile.spaceName} — CENTRO DE MANDO Y AUDITORÍA ELÉCTRICA
            </h2>
          </div>

          {/* Botón directo para subir datos manuales + controles de vista */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab("facturas")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#F75600] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Subir Datos Manuales / Medidor</span>
            </button>

            <div className="inline-flex rounded-[10px] bg-white/10 p-1 text-xs font-extrabold uppercase">
              {(["3m", "6m", "13m"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodFilter(period)}
                  className={`px-3 py-1.5 rounded-[7px] transition cursor-pointer ${
                    periodFilter === period
                      ? "bg-white text-[#091197]"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {period === "3m"
                    ? "3 Meses"
                    : period === "6m"
                    ? "6 Meses"
                    : "13 Meses"}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-[10px] bg-white/10 p-1 text-xs font-extrabold uppercase">
              <button
                onClick={() => setViewUnit("kwh")}
                className={`px-3 py-1.5 rounded-[7px] transition cursor-pointer ${
                  viewUnit === "kwh"
                    ? "bg-[#03A9EC] text-white"
                    : "text-white/80 hover:text-white"
                }`}
              >
                kWh
              </button>
              <button
                onClick={() => setViewUnit("dop")}
                className={`px-3 py-1.5 rounded-[7px] transition cursor-pointer ${
                  viewUnit === "dop"
                    ? "bg-[#03A9EC] text-white"
                    : "text-white/80 hover:text-white"
                }`}
              >
                RD$
              </button>
            </div>
          </div>
        </div>

        {/* Cinta de Telemetría de Medidor y Liquidación Oficial */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-white/5 rounded-[8px] px-3.5 py-2.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-white/60 block">
              LECTURA MEDIDOR ACTIVA B.T.
            </span>
            <span className="font-extrabold text-white text-sm">
              {latestInvoice?.previousReading && latestInvoice?.currentReading
                ? `${latestInvoice.previousReading} → ${latestInvoice.currentReading}`
                : "Directo kWh"}
            </span>
          </div>
          <div className="bg-white/5 rounded-[8px] px-3.5 py-2.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-white/60 block">
              POTENCIA B.T. LEÍDA / CONTRATADA
            </span>
            <span className="font-extrabold text-[#03A9EC] text-sm">
              {currentDemandKw.toFixed(3)} / {currentContractedKw.toFixed(3)} kW
            </span>
          </div>
          <div className="bg-white/5 rounded-[8px] px-3.5 py-2.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-white/60 block">
              CARGO FIJO OFICIAL
            </span>
            <span className="font-extrabold text-white text-sm">
              RD$ {billSimulation.fixedChargeDop.toFixed(2)}
            </span>
          </div>
          <div className="bg-white/5 rounded-[8px] px-3.5 py-2.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-white/60 block">
              IMPORTE SIN SUBSIDIO
            </span>
            <span className="font-extrabold text-white text-sm">
              RD${" "}
              {unsubsidizedTotalDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="bg-white/5 rounded-[8px] px-3.5 py-2.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-[#03A9EC] block">
              APORTE TOTAL GOBIERNO
            </span>
            <span className="font-extrabold text-[#03A9EC] text-sm">
              - RD${" "}
              {governmentSubsidyDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="bg-[#03A9EC]/20 rounded-[8px] px-3.5 py-2.5 border border-[#03A9EC]">
            <span className="text-[10px] font-extrabold uppercase text-[#03A9EC] block">
              VALOR TOTAL A PAGAR
            </span>
            <span className="font-extrabold text-white text-sm">
              RD${" "}
              {(
                latestInvoice?.totalAmountDop.value ||
                billSimulation.totalEstimatedBillDop
              ).toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 6 TARJETAS EJECUTIVAS DE TELEMETRÍA Y AUDITORÍA ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* KPI 1: Consumo Mensual y Lecturas */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              01 · ENERGÍA ACTIVA FACTURADA
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#091197] tabular-nums">
              {currentReferenceKwh.toLocaleString("es-DO")}{" "}
              <span className="text-sm font-bold text-[#03A9EC]">kWh</span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-xs">
              <span className="text-[#4B528A]">
                Promedio:{" "}
                <strong className="text-[#091197]">
                  {dailyAverageKwh} kWh/día
                </strong>{" "}
                ({latestInvoice?.billingDays.value || 31} días)
              </span>
              {monthOverMonthVariationPct !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 font-extrabold px-2 py-0.5 rounded ${
                    monthOverMonthVariationPct > 0
                      ? "bg-[#F75600]/15 text-[#F75600]"
                      : "bg-[#008A5E]/15 text-[#008A5E]"
                  }`}
                >
                  {monthOverMonthVariationPct > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(monthOverMonthVariationPct)}% vs mes ant.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Valor Total a Pagar */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              02 · VALOR TOTAL A PAGAR EN RD$
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#03A9EC] tabular-nums">
              RD${" "}
              {(
                latestInvoice?.totalAmountDop.value ||
                billSimulation.totalEstimatedBillDop
              ).toLocaleString("es-DO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-xs text-[#4B528A]">
              <span>
                Energía:{" "}
                <strong className="text-[#091197]">
                  RD$ {billSimulation.energyChargeDop.toLocaleString("es-DO")}
                </strong>{" "}
                + Fijo:{" "}
                <strong className="text-[#091197]">
                  RD$ {billSimulation.fixedChargeDop}
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#F1F1F1] text-[#091197] font-extrabold uppercase text-[10px]">
                RD$ {billSimulation.averageRateDopPerKwh.toFixed(2)}/kWh
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Subsidio Estatal FETE vs Tarifa Sin Subsidio */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              03 · APORTE GOBIERNO (SUBSIDIO FETE)
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#008A5E]" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#008A5E] tabular-nums">
              - RD${" "}
              {governmentSubsidyDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-xs text-[#4B528A]">
              <span>
                Sin subsidio:{" "}
                <strong className="text-[#091197]">
                  RD${" "}
                  {unsubsidizedTotalDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#008A5E]/15 text-[#008A5E] font-extrabold uppercase text-[10px]">
                Compensación SIE
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Penalización por Cruzar 701 kWh (Potencial de Ahorro Inmediato) */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              04 · IMPACTO UMBRAL 701 KWH
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#F75600]" />
            </div>
          </div>
          <div>
            {currentReferenceKwh >= 701 ? (
              <>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F75600] tabular-nums">
                  + RD${" "}
                  {stepPenaltyOver699Dop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-xs">
                  <span className="text-[#4B528A]">
                    Exceso de{" "}
                    <strong className="text-[#F75600]">
                      +{currentReferenceKwh - 699} kWh
                    </strong>{" "}
                    sobre 699 kWh
                  </span>
                  <button
                    onClick={() => setActiveToolTab("what_if_699")}
                    className="text-[#091197] hover:text-[#03A9EC] font-extrabold uppercase underline cursor-pointer"
                  >
                    Simular 699 kWh →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#091197] tabular-nums">
                  {(700 - currentReferenceKwh).toFixed(0)}{" "}
                  <span className="text-sm font-bold text-[#008A5E]">
                    kWh de margen
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#D9D9D9] text-xs text-[#4B528A]">
                  Mantienes los tramos subsidiados de RD$ 6.05 y RD$ 8.59/kWh.
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI 5: Demanda de Potencia B.T. Leída vs Contratada */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              05 · POTENCIA LEÍDA VS CONTRATADA
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Gauge className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#091197] tabular-nums">
                {currentDemandKw.toFixed(3)}{" "}
                <span className="text-sm font-bold text-[#03A9EC]">kW</span>
              </div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-[#F1F1F1] text-[#091197]">
                {powerUtilizationPct}% de {currentContractedKw.toFixed(3)} kW
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9]">
              <div className="w-full bg-[#F1F1F1] h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    powerUtilizationPct > 92
                      ? "bg-[#F75600]"
                      : "bg-[#03A9EC]"
                  }`}
                  style={{ width: `${powerUtilizationPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 6: Índice de Eficiencia y Respaldo LiFePO4 */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              06 · EFICIENCIA &amp; RESPALDO LITIO
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <BatteryCharging className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#091197]">
                {efficiencyScore !== null ? `${efficiencyScore}%` : "N/D"}
              </div>
              {inverterAutonomy && (
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#03A9EC]/15 text-[#091197] border border-[#03A9EC]">
                  ⚡ {inverterAutonomy.estimatedAutonomyFormatted}
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] text-xs text-[#4B528A] truncate">
              {primaryInverter
                ? `${primaryInverter.inverterBrand} · ${primaryInverter.batteryBrand}`
                : "Configura tu banco en Solar & Inversores"}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SUITE DE HERRAMIENTAS INTERACTIVAS DE INGENIERÍA EN VIVO ================= */}
      <div className="bg-white rounded-[12px] border-2 border-[#091197] overflow-hidden shadow-[0_12px_32px_rgba(9,17,151,0.06)]">
        <div className="bg-[#091197] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#03A9EC] block">
              LABORATORIO DE SIMULACIÓN &amp; CONTROL OPERATIVO EN TIEMPO REAL
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight mt-1">
              HERRAMIENTAS INTERACTIVAS DE AUDITORÍA ELÉCTRICA
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveToolTab("meter_projector")}
              className={`px-3.5 py-2.5 rounded-[10px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition cursor-pointer ${
                activeToolTab === "meter_projector"
                  ? "bg-[#03A9EC] text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>1. Proyector de Medidor Hoy</span>
            </button>

            <button
              onClick={() => setActiveToolTab("what_if_699")}
              className={`px-3.5 py-2.5 rounded-[10px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition cursor-pointer ${
                activeToolTab === "what_if_699"
                  ? "bg-[#F75600] text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>2. Simulador Meta 699 kWh</span>
            </button>

            <button
              onClick={() => setActiveToolTab("national_comparator")}
              className={`px-3.5 py-2.5 rounded-[10px] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition cursor-pointer ${
                activeToolTab === "national_comparator"
                  ? "bg-[#03A9EC] text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>3. Motor Multi-Prestadora RD</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO DE LA HERRAMIENTA ACTIVA */}
        <div className="p-6">
          {/* HERRAMIENTA 1: PROYECTOR DE MEDIDOR A MITAD DE MES */}
          {activeToolTab === "meter_projector" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#03A9EC]">
                    AUDITORÍA PREVENTIVA ANTES DEL CORTE DE FACTURACIÓN
                  </span>
                  <h4 className="text-lg font-extrabold uppercase text-[#091197]">
                    ¿CUÁNTO MARCA TU MEDIDOR HOY? PROYECTA TU CIERRE DE MES
                  </h4>
                  <p className="text-xs text-[#4B528A] mt-1">
                    Ingresa la lectura del último recibo y la lectura que ves hoy
                    en tu contador físico para anticipar si cruzarás el umbral de{" "}
                    <strong>701 kWh</strong> antes de que cierre el ciclo.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-[#4B528A] block mb-1">
                      Lectura Corte Anterior
                    </label>
                    <input
                      type="number"
                      value={midMonthPrevReading}
                      onChange={(e) =>
                        setMidMonthPrevReading(Number(e.target.value))
                      }
                      className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-sm font-extrabold text-[#091197]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-[#03A9EC] block mb-1">
                      Lectura Hoy en Medidor
                    </label>
                    <input
                      type="number"
                      value={midMonthTodayReading}
                      onChange={(e) =>
                        setMidMonthTodayReading(Number(e.target.value))
                      }
                      className="w-full rounded-[10px] bg-[#F1F1F1] border-2 border-[#03A9EC] px-3 py-2.5 text-sm font-extrabold text-[#091197]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-[#4B528A] block mb-1">
                      Días Transcurridos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={midMonthElapsedDays}
                      onChange={(e) =>
                        setMidMonthElapsedDays(Number(e.target.value))
                      }
                      className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-sm font-extrabold text-[#091197]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-[#4B528A] block mb-1">
                      Días del Ciclo Total
                    </label>
                    <input
                      type="number"
                      min={28}
                      max={35}
                      value={midMonthCycleDays}
                      onChange={(e) =>
                        setMidMonthCycleDays(Number(e.target.value))
                      }
                      className="w-full rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] px-3 py-2.5 text-sm font-extrabold text-[#091197]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9]">
                    <span className="text-[10px] font-extrabold uppercase text-[#4B528A] block">
                      CONSUMIDO HASTA HOY
                    </span>
                    <span className="text-xl font-extrabold text-[#091197]">
                      {meterProjection.consumedSoFar} kWh
                    </span>
                    <span className="text-[11px] text-[#4B528A] block">
                      en {midMonthElapsedDays} días
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9]">
                    <span className="text-[10px] font-extrabold uppercase text-[#4B528A] block">
                      RITMO DIARIO ACTUAL
                    </span>
                    <span className="text-xl font-extrabold text-[#03A9EC]">
                      {meterProjection.dailyPace} kWh/día
                    </span>
                    <span className="text-[11px] text-[#4B528A] block">
                      Restan {meterProjection.remainingDays} días
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9]">
                    <span className="text-[10px] font-extrabold uppercase text-[#4B528A] block">
                      TOPE DIARIO PARA &le; 699 KWH
                    </span>
                    <span className="text-xl font-extrabold text-[#008A5E]">
                      {meterProjection.maxSafeDailyKwhRemaining} kWh/día
                    </span>
                    <span className="text-[11px] text-[#4B528A] block">
                      Disponibles: {meterProjection.safeAllowanceRemainingKwh} kWh
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-[12px] bg-[#091197] text-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#03A9EC]">
                    PROYECCIÓN DE CIERRE ({midMonthCycleDays} DÍAS)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      meterProjection.projectedCycleKwh >= 701
                        ? "bg-[#F75600] text-white"
                        : "bg-[#008A5E] text-white"
                    }`}
                  >
                    {meterProjection.projectedCycleKwh >= 701
                      ? "ALERTA: PIERDE SUBSIDIO (>=701)"
                      : "DENTRO DE TRAMOS PROTEGIDOS"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/15">
                  <div>
                    <span className="text-xs text-white/70 block">
                      Volumen Proyectado
                    </span>
                    <span className="text-3xl font-extrabold text-white">
                      {meterProjection.projectedCycleKwh}{" "}
                      <span className="text-sm text-[#03A9EC]">kWh</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-white/70 block">
                      Liquidación Proyectada
                    </span>
                    <span className="text-3xl font-extrabold text-[#03A9EC]">
                      RD${" "}
                      {meterProjection.projectedBill.totalEstimatedBillDop.toLocaleString(
                        "es-DO",
                        { maximumFractionDigits: 0 }
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-white/10 text-xs leading-relaxed">
                  {meterProjection.projectedCycleKwh >= 701 ? (
                    <>
                      <strong className="text-[#F75600] uppercase block mb-0.5">
                        Acción Correctiva Recomendada Hoy:
                      </strong>
                      Si reduces tu ritmo diario de{" "}
                      <strong>{meterProjection.dailyPace} kWh/día</strong> a{" "}
                      <strong>
                        {meterProjection.maxSafeDailyKwhRemaining} kWh/día
                      </strong>{" "}
                      durante los próximos{" "}
                      <strong>{meterProjection.remainingDays} días</strong>,
                      cerrarás en <strong>699 kWh</strong> y ahorrarás{" "}
                      <strong className="text-[#03A9EC]">
                        RD${" "}
                        {Math.max(
                          0,
                          Math.round(
                            meterProjection.projectedBill.totalEstimatedBillDop -
                              billAt699.totalEstimatedBillDop
                          )
                        ).toLocaleString("es-DO")}
                      </strong>{" "}
                      en este mismo ciclo.
                    </>
                  ) : (
                    <>
                      <strong className="text-[#03A9EC] uppercase block mb-0.5">
                        Ritmo Operativo Óptimo:
                      </strong>
                      A este ritmo cerrarás el mes con{" "}
                      <strong>{meterProjection.projectedCycleKwh} kWh</strong> y
                      conservarás un aporte gubernamental estimado de{" "}
                      <strong>
                        RD${" "}
                        {meterProjection.projectedBill.governmentSubsidyDop.toLocaleString(
                          "es-DO"
                        )}
                      </strong>
                      .
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HERRAMIENTA 2: SIMULADOR WHAT-IF META 699 KWH */}
          {activeToolTab === "what_if_699" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#F75600]">
                      OPTIMIZACIÓN DEL ESCALÓN CRÍTICO 700 / 701 KWH
                    </span>
                    <h4 className="text-lg font-extrabold uppercase text-[#091197]">
                      SIMULADOR INTERACTIVO DE REDUCCIÓN DE CONSUMO
                    </h4>
                  </div>
                  <button
                    onClick={() => setWhatIfTargetKwh(699)}
                    className="px-3 py-1.5 rounded-[8px] bg-[#091197] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase transition cursor-pointer"
                  >
                    Fijar Meta Óptima: 699 kWh
                  </button>
                </div>

                <div className="p-5 rounded-[12px] bg-[#F1F1F1] border border-[#D9D9D9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-[#4B528A]">
                      CONSUMO OBJETIVO SIMULADO:
                    </span>
                    <span className="text-2xl font-extrabold text-[#091197]">
                      {whatIfTargetKwh} kWh/mes
                    </span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={1100}
                    step={1}
                    value={whatIfTargetKwh}
                    onChange={(e) => setWhatIfTargetKwh(Number(e.target.value))}
                    className="w-full accent-[#091197] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-extrabold uppercase text-[#4B528A]">
                    <span>150 kWh (Tramo 1)</span>
                    <span>300 kWh (Tramo 2)</span>
                    <span className="text-[#008A5E]">699 kWh (Tope Subsidio)</span>
                    <span className="text-[#F75600]">701+ kWh (Tarifa Plana)</span>
                  </div>
                </div>

                {/* Tabla de Tramos del Escenario Simulado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {whatIfSimulation.blocksBreakdown.map((blk) => (
                    <div
                      key={blk.label}
                      className="p-3.5 rounded-[10px] bg-white border border-[#D9D9D9]"
                    >
                      <span className="text-[10px] font-extrabold uppercase text-[#03A9EC] block truncate">
                        {blk.label}
                      </span>
                      <div className="text-base font-extrabold text-[#091197] mt-1">
                        {blk.kwhInBlock} kWh × RD$ {blk.rateDop.toFixed(2)}
                      </div>
                      <div className="text-xs font-bold text-[#4B528A] mt-0.5">
                        Subtotal: RD${" "}
                        {blk.subtotalDop.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-[12px] bg-[#091197] text-white p-6 space-y-4">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#03A9EC]">
                  COMPARATIVA DIRECTA CONTRA TU RECIBO ACTUAL ({currentReferenceKwh}{" "}
                  KWH)
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/15">
                  <div>
                    <span className="text-xs text-white/70 block">
                      Pago Actual ({currentReferenceKwh} kWh)
                    </span>
                    <span className="text-2xl font-extrabold text-white">
                      RD${" "}
                      {billSimulation.totalEstimatedBillDop.toLocaleString(
                        "es-DO",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-white/70 block">
                      Nuevo Pago ({whatIfTargetKwh} kWh)
                    </span>
                    <span className="text-2xl font-extrabold text-[#03A9EC]">
                      RD${" "}
                      {whatIfSimulation.totalEstimatedBillDop.toLocaleString(
                        "es-DO",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-[10px] bg-white/10 border border-[#03A9EC]/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#03A9EC] block">
                      AHORRO MENSUAL NETO
                    </span>
                    <span className="text-2xl font-extrabold text-white">
                      RD${" "}
                      {Math.max(
                        0,
                        Math.round(
                          (billSimulation.totalEstimatedBillDop -
                            whatIfSimulation.totalEstimatedBillDop) *
                            100
                        ) / 100
                      ).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase text-[#008A5E] block">
                      AHORRO ANUAL (12 MESES)
                    </span>
                    <span className="text-lg font-extrabold text-[#03A9EC]">
                      RD${" "}
                      {Math.max(
                        0,
                        Math.round(
                          (billSimulation.totalEstimatedBillDop -
                            whatIfSimulation.totalEstimatedBillDop) *
                            12
                        )
                      ).toLocaleString("es-DO")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HERRAMIENTA 3: MOTOR COMPARADOR NACIONAL MULTI-PRESTADORA */}
          {activeToolTab === "national_comparator" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#03A9EC]">
                    MOTOR MULTITARIFA DE TODAS LAS PRESTADORAS DEL PAÍS
                  </span>
                  <h4 className="text-lg font-extrabold uppercase text-[#091197]">
                    LIQUIDACIÓN DE {currentReferenceKwh} KWH Y{" "}
                    {currentDemandKw.toFixed(3)} KW EN CADA PLIEGO NACIONAL
                  </h4>
                </div>
                <button
                  onClick={() => onNavigateTab("tarifas")}
                  className="px-3.5 py-2 rounded-[8px] border border-[#091197] text-xs font-extrabold uppercase text-[#091197] hover:bg-[#091197] hover:text-white transition cursor-pointer"
                >
                  Configurar Pliegos y Tarifas →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#091197] text-[#091197] font-extrabold uppercase bg-[#F1F1F1]">
                      <th className="py-3 px-3">Prestadora / Zona</th>
                      <th className="py-3 px-3">Pliego Tarifario</th>
                      <th className="py-3 px-3">Cargo Fijo</th>
                      <th className="py-3 px-3">Cargo Energía</th>
                      <th className="py-3 px-3">Cargo Potencia (kW)</th>
                      <th className="py-3 px-3">Sin Subsidio</th>
                      <th className="py-3 px-3">Aporte Gobierno</th>
                      <th className="py-3 px-3 text-right">Total a Pagar RD$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9D9D9]">
                    {nationalComparisonRows.map(({ schedule, simulation }) => {
                      const isCurrent = schedule.id === activeSchedule.id;
                      return (
                        <tr
                          key={schedule.id}
                          className={
                            isCurrent
                              ? "bg-[#03A9EC]/10 font-bold"
                              : "hover:bg-[#F1F1F1]/60"
                          }
                        >
                          <td className="py-3 px-3 font-extrabold text-[#091197]">
                            {schedule.distributor_code}
                            {isCurrent && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-[#091197] text-white text-[9px] uppercase">
                                ACTIVO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#4B528A]">
                            {schedule.tariff_code} · {schedule.category_name}
                          </td>
                          <td className="py-3 px-3">
                            RD$ {simulation.fixedChargeDop.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            RD${" "}
                            {simulation.energyChargeDop.toLocaleString(
                              "es-DO",
                              { minimumFractionDigits: 2 }
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {simulation.demandChargeDop > 0
                              ? `RD$ ${simulation.demandChargeDop.toLocaleString(
                                  "es-DO",
                                  { minimumFractionDigits: 2 }
                                )}`
                              : "Incluido B.T."}
                          </td>
                          <td className="py-3 px-3 text-[#4B528A]">
                            RD${" "}
                            {simulation.unsubsidizedTotalDop.toLocaleString(
                              "es-DO",
                              { minimumFractionDigits: 2 }
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#008A5E] font-bold">
                            - RD${" "}
                            {simulation.governmentSubsidyDop.toLocaleString(
                              "es-DO",
                              { minimumFractionDigits: 2 }
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-sm text-[#091197]">
                            RD${" "}
                            {simulation.totalEstimatedBillDop.toLocaleString(
                              "es-DO",
                              { minimumFractionDigits: 2 }
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= GRÁFICO HISTÓRICO DE 13 MESES + REPARTO POR CATEGORÍA ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[12px] border border-[#D9D9D9] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                CURVA HISTÓRICA DE CONSUMOS (ESTILO BLOQUE 3 DE FACTURA)
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                EVOLUCIÓN DE {historicalChartData.length} CICLOS FACTURADOS VS
                UMBRAL 700 KWH
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase">
              <span className="inline-flex items-center gap-1.5 text-[#091197]">
                <span className="w-3 h-3 rounded-xs bg-[#03A9EC] inline-block" />
                &le; 700 kWh (Subsidiado)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#F75600]">
                <span className="w-3 h-3 rounded-xs bg-[#F75600] inline-block" />
                &ge; 701 kWh (Tarifa Plana)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {historicalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={historicalChartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="periodo" stroke="#4B528A" fontSize={11} />
                  <YAxis stroke="#4B528A" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#091197",
                      borderColor: "#03A9EC",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  {viewUnit === "kwh" && (
                    <ReferenceLine
                      y={700}
                      stroke="#F75600"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: "Tope Subsidio 700 kWh",
                        position: "insideTopRight",
                        fill: "#F75600",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    />
                  )}
                  <Bar
                    dataKey={viewUnit}
                    name={
                      viewUnit === "kwh"
                        ? "Consumo Facturado (kWh)"
                        : "Importe Liquidado (RD$)"
                    }
                    radius={[6, 6, 0, 0]}
                  >
                    {historicalChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          entry.over700
                            ? "#F75600"
                            : viewUnit === "kwh"
                            ? "#03A9EC"
                            : "#091197"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={billSimulation.blocksBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" stroke="#4B528A" fontSize={11} />
                  <YAxis stroke="#4B528A" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="subtotalDop"
                    stroke="#091197"
                    fill="#03A9EC"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución por Categoría */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 flex flex-col justify-between">
          <div className="pb-4 border-b border-[#D9D9D9]">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
              DISTRIBUCIÓN DE CARGA POR ÁREA
            </span>
            <h3 className="font-extrabold text-xl uppercase text-[#091197]">
              CONSUMO POR CATEGORÍA
            </h3>
            <p className="text-xs text-[#4B528A] mt-0.5">
              Total inventariado:{" "}
              <strong className="text-[#091197]">
                {totalAppliancesMonthlyKwh} kWh/mes
              </strong>
            </p>
          </div>

          {categoryDistribution.length > 0 ? (
            <>
              <div className="h-48 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey={viewUnit === "kwh" ? "kwh" : "costDop"}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            GRUPAMAR_CHART_COLORS[
                              index % GRUPAMAR_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#091197",
                        borderColor: "#03A9EC",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#FFFFFF",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 pt-3 border-t border-[#D9D9D9]">
                {categoryDistribution.slice(0, 4).map((cat, idx) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-[4px] shrink-0"
                        style={{
                          backgroundColor:
                            GRUPAMAR_CHART_COLORS[
                              idx % GRUPAMAR_CHART_COLORS.length
                            ],
                        }}
                      />
                      <span className="truncate font-bold text-[#091197] uppercase">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-extrabold text-[#03A9EC]">
                      RD$ {cat.costDop.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-xs text-[#4B528A]">
              Agrega tus equipos para visualizar la distribución.
            </div>
          )}
        </div>
      </div>

      {/* ================= TOP EQUIPOS Y DICTAMEN DE AUDITORÍA SIE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                IMPACTO ECONÓMICO MENSUAL POR EQUIPO
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                CARGAS DE MAYOR COSTO EN RD$
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("equipos")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[#03A9EC] text-xs font-extrabold uppercase text-[#091197] hover:bg-[#091197] hover:text-white transition cursor-pointer"
            >
              <span>Ajustar Horas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {applianceBreakdown.slice(0, 5).map((item) => {
              const pct =
                totalAppliancesMonthlyKwh > 0
                  ? Math.round(
                      (item.monthlyKwh / totalAppliancesMonthlyKwh) * 100
                    )
                  : 0;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-extrabold text-sm uppercase text-[#091197]">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#4B528A] mt-0.5">
                      {item.dailyHours}h/día · {item.monthlyKwh} kWh/mes ({pct}%
                      del inventario)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-base text-[#091197]">
                      RD${" "}
                      {item.estimatedMonthlyCostDop.toLocaleString("es-DO")}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-[#03A9EC]">
                      mensual
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dictamen Técnico y Desglose Exacto de Liquidación */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 mb-4 border-b border-[#D9D9D9] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                  AUDITORÍA DE DETALLE DE FACTURACIÓN
                </span>
                <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                  LIQUIDACIÓN OFICIAL Y ALERTAS ACTIVA B.T.
                </h3>
              </div>
              <TrendingDown className="w-5 h-5 text-[#03A9EC]" />
            </div>

            {/* Cuadro estilo "Detalle de la Facturación Actual" de la factura real */}
            <div className="rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-[#4B528A]">
                <span>Cargo Fijo ({latestInvoice?.billingDays.value || 31} días)</span>
                <span className="text-[#091197]">
                  RD$ {billSimulation.fixedChargeDop.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#4B528A]">
                <span>
                  Energía ({currentReferenceKwh} kWh × RD${" "}
                  {(
                    billSimulation.energyChargeDop /
                    Math.max(1, currentReferenceKwh)
                  ).toFixed(2)}
                  )
                </span>
                <span className="text-[#091197]">
                  RD${" "}
                  {billSimulation.energyChargeDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t border-[#D9D9D9] pt-2 flex justify-between font-bold text-[#4B528A]">
                <span>IMPORTE TOTAL SIN SUBSIDIO RD$</span>
                <span className="text-[#091197]">
                  RD${" "}
                  {unsubsidizedTotalDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-[#008A5E]">
                <span>APORTE TOTAL GOBIERNO RD$</span>
                <span>
                  - RD${" "}
                  {governmentSubsidyDop.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {triggeredAlerts.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                {triggeredAlerts.slice(0, 2).map((al) => (
                  <div
                    key={al.id}
                    className="p-3.5 rounded-[10px] bg-[#F1F1F1] border-l-4 border-[#F75600] text-xs"
                  >
                    <div className="flex items-center justify-between font-extrabold uppercase text-[#091197]">
                      <span>{al.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#F75600] text-white text-[10px]">
                        {al.metricValue}
                      </span>
                    </div>
                    <p className="text-[#4B528A] mt-1">{al.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-[10px] bg-[#F1F1F1] border border-[#03A9EC] text-xs text-[#091197] font-semibold mb-4">
                Parámetros dentro de rango óptimo. No se detectan desviaciones
                críticas de escalón.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#D9D9D9] flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#4B528A]">
              VALOR TOTAL A PAGAR EN RD$ ({activeSchedule.distributor_code}):
            </span>
            <span className="text-2xl font-extrabold text-[#091197]">
              RD${" "}
              {(
                latestInvoice?.totalAmountDop.value ||
                billSimulation.totalEstimatedBillDop
              ).toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
