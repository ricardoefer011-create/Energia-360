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
  FileSpreadsheet,
  Sparkles,
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
  const [periodFilter, setPeriodFilter] = useState<"3m" | "6m" | "all">("all");
  const [viewUnit, setViewUnit] = useState<"kwh" | "dop">("kwh");

  const sortedInvoices = useMemo(
    () =>
      [...vault.invoices].sort((a, b) =>
        a.billingPeriodEnd.value.localeCompare(b.billingPeriodEnd.value)
      ),
    [vault.invoices]
  );

  const filteredInvoices = useMemo(() => {
    if (periodFilter === "3m") return sortedInvoices.slice(-3);
    if (periodFilter === "6m") return sortedInvoices.slice(-6);
    return sortedInvoices;
  }, [sortedInvoices, periodFilter]);

  const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
  const prevInvoice =
    sortedInvoices.length >= 2
      ? sortedInvoices[sortedInvoices.length - 2]
      : undefined;

  const preliminaryBill = calculateDominicanTariffBill(
    latestInvoice?.billedKwh.value || 350,
    activeSchedule,
    vault.profile.customRateDopPerKwh
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

  const billSimulation = useMemo(
    () =>
      calculateDominicanTariffBill(
        currentReferenceKwh,
        activeSchedule,
        vault.profile.customRateDopPerKwh
      ),
    [currentReferenceKwh, activeSchedule, vault.profile.customRateDopPerKwh]
  );

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
            onClick={() => onNavigateTab("equipos")}
            className="p-6 rounded-[12px] bg-[#F1F1F1] hover:bg-white border border-[#D9D9D9] hover:border-[#03A9EC] transition cursor-pointer"
          >
            <Calculator className="w-6 h-6 text-[#03A9EC] mb-3" />
            <div className="font-extrabold uppercase text-sm text-[#091197] mb-1">
              INVENTARIO DE EQUIPOS
            </div>
            <p className="text-xs text-[#4B528A]">
              Incorpora tus aires acondicionados, nevera y cargas críticas.
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("facturas")}
            className="p-6 rounded-[12px] bg-[#F1F1F1] hover:bg-white border border-[#D9D9D9] hover:border-[#03A9EC] transition cursor-pointer"
          >
            <FileSpreadsheet className="w-6 h-6 text-[#091197] mb-3" />
            <div className="font-extrabold uppercase text-sm text-[#091197] mb-1">
              ESCANEAR FACTURA OCR
            </div>
            <p className="text-xs text-[#4B528A]">
              Analiza tu recibo en PDF o fotografía localmente en tu navegador.
            </p>
          </button>

          <button
            onClick={onLoadDemoMode}
            className="p-6 rounded-[12px] bg-[#091197] hover:bg-[#03A9EC] text-white transition cursor-pointer"
          >
            <Sparkles className="w-6 h-6 text-[#03A9EC] mb-3" />
            <div className="font-extrabold uppercase text-sm text-white mb-1">
              CARGAR EXPEDIENTE DEMO
            </div>
            <p className="text-xs text-white/80">
              Audita un caso real dominicano con facturas e inversor.
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

  return (
    <div className="space-y-6">
      {/* BANNER EJECUTIVO AZUL REAL (.csectionsolucionesinner style) */}
      <div className="rounded-[12px] bg-[#091197] text-white p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4 border border-[#091197]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1 rounded-[6px] bg-[#03A9EC] text-white">
              {vault.profile.distributor} · {activeSchedule.tariff_code}
            </span>
            {billSimulation.lostStepSubsidy701 ? (
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-[#F75600] text-white inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> PENALIZACIÓN &ge; 701
                KWH ACTIVA (SIN SUBSIDIO)
              </span>
            ) : (
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-white/10 text-[#03A9EC] border border-[#03A9EC]/40">
                SUBSIDIO ESCALONADO SIE ACTIVO
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-2">
            {vault.profile.spaceName} — DIAGNÓSTICO DE CONSUMO Y COSTOS
          </h2>
        </div>

        {/* Controles de periodo y unidad */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[10px] bg-white/10 p-1 text-xs font-extrabold uppercase">
            {(["3m", "6m", "all"] as const).map((period) => (
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
                  : "Histórico"}
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

      {/* 4 BLOQUES DE CIFRAS ARQUITECTÓNICOS (.citemicon style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Consumo Mensual */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              CONSUMO MENSUAL
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
                </strong>
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
                  {Math.abs(monthOverMonthVariationPct)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Factura Mensual */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              LIQUIDACIÓN MENSUAL ESTIMADA
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
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-xs text-[#4B528A]">
              <span>
                Tarifa media:{" "}
                <strong className="text-[#091197]">
                  RD$ {billSimulation.averageRateDopPerKwh.toFixed(2)}/kWh
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#F1F1F1] text-[#091197] font-extrabold uppercase text-[10px]">
                {latestInvoice ? "Recibo" : "Simulado"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Margen Subsidio 700 kWh */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              UMBRAL SUBSIDIO 700 KWH
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">
              {currentReferenceKwh >= 701 ? (
                <span className="text-[#F75600]">
                  +{(currentReferenceKwh - 700).toFixed(0)}{" "}
                  <span className="text-xs font-extrabold uppercase">
                    kWh excedidos
                  </span>
                </span>
              ) : (
                <span className="text-[#091197]">
                  {(700 - currentReferenceKwh).toFixed(0)}{" "}
                  <span className="text-xs font-bold text-[#4B528A] uppercase">
                    kWh disponibles
                  </span>
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[#D9D9D9]">
              <div className="w-full bg-[#F1F1F1] h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    currentReferenceKwh >= 701
                      ? "bg-[#F75600]"
                      : currentReferenceKwh >= 600
                      ? "bg-[#03A9EC]"
                      : "bg-[#091197]"
                  }`}
                  style={{
                    width: `${Math.min(100, (currentReferenceKwh / 700) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Índice de Eficiencia y Respaldo */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] hover:border-[#03A9EC] p-6 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              EFICIENCIA &amp; RESPALDO
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

      {/* GRÁFICOS DE EVOLUCIÓN Y REPARTO POR CATEGORÍA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[12px] border border-[#D9D9D9] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                TELEMETRÍA HISTÓRICA Y ESCALONES
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                {filteredInvoices.length > 0
                  ? "EVOLUCIÓN DE DATOS ENERGÉTICOS"
                  : "ESCALONES TARIFARIOS SIE"}
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#4B528A]">
              {activeSchedule.notes}
            </span>
          </div>

          <div className="h-72 w-full">
            {filteredInvoices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredInvoices.map((inv) => ({
                    periodo: inv.billingPeriodEnd.value.slice(0, 7),
                    kwh: inv.billedKwh.value,
                    dop: inv.totalAmountDop.value,
                  }))}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="grupamarGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={viewUnit === "kwh" ? "#03A9EC" : "#091197"}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={viewUnit === "kwh" ? "#03A9EC" : "#091197"}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="periodo" stroke="#4B528A" fontSize={12} />
                  <YAxis stroke="#4B528A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#091197",
                      borderColor: "#03A9EC",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={viewUnit}
                    name={viewUnit === "kwh" ? "Consumo (kWh)" : "Total (RD$)"}
                    stroke={viewUnit === "kwh" ? "#03A9EC" : "#091197"}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#grupamarGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billSimulation.blocksBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" stroke="#4B528A" fontSize={11} />
                  <YAxis stroke="#4B528A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#091197",
                      borderColor: "#03A9EC",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Bar
                    dataKey={viewUnit === "kwh" ? "kwhInBlock" : "subtotalDop"}
                    fill="#091197"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución por Categoría */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 flex flex-col justify-between">
          <div className="pb-4 border-b border-[#D9D9D9]">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
              DISTRIBUCIÓN DE CARGA
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

      {/* TOP EQUIPOS Y DICTAMEN DE AUDITORÍA SIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                IMPACTO ECONÓMICO MENSUAL
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                EQUIPOS DE MAYOR COSTO EN RD$
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
                      del total)
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

        {/* Dictamen Técnico y Alertas Preventivas */}
        <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 mb-4 border-b border-[#D9D9D9]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                AUDITORÍA AUTOMÁTICA SIE
              </span>
              <h3 className="font-extrabold text-xl uppercase text-[#091197]">
                DICTAMEN TARIFARIO Y ALERTAS
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#4B528A] mb-4 leading-relaxed">
              {billSimulation.explanation}
            </p>

            {triggeredAlerts.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                {triggeredAlerts.slice(0, 3).map((al) => (
                  <div
                    key={al.id}
                    className="p-4 rounded-[10px] bg-[#F1F1F1] border-l-4 border-[#F75600] text-xs"
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
              LIQUIDACIÓN ESTIMADA ({activeSchedule.distributor_code}):
            </span>
            <span className="text-2xl font-extrabold text-[#091197]">
              RD${" "}
              {billSimulation.totalEstimatedBillDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
