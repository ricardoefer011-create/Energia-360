"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BatteryCharging,
  Calculator,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Sun,
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

const CHART_COLORS = [
  "#0EA5E9",
  "#10B981",
  "#6366F1",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#8B5CF6",
];

export function DashboardModule({
  vault,
  activeSchedule,
  triggeredAlerts,
  isDemoMode,
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

  // Cálculo real a partir de equipos registrados
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

  // Distribución por categoría de equipos
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, { name: string; kwh: number; costDop: number }>();
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

  // Índice de Eficiencia Energética (0 - 100)
  const efficiencyScore = useMemo(() => {
    if (currentReferenceKwh === 0) return null;
    let score = 82;
    if (billSimulation.lostStepSubsidy701) score -= 22;
    else if (currentReferenceKwh > 600) score -= 10;
    else if (currentReferenceKwh <= 300) score += 10;

    const inverterEquipCount = vault.appliances.filter((a) =>
      a.efficiencyRating.toLowerCase().includes("inverter")
    ).length;
    if (inverterEquipCount > 0) score += 6;
    return Math.max(25, Math.min(98, score));
  }, [currentReferenceKwh, billSimulation.lostStepSubsidy701, vault.appliances]);

  // Estado vacío real si el usuario no ha introducido ni facturas ni equipos
  const hasAnyRealData =
    vault.invoices.length > 0 || vault.appliances.length > 0;

  if (!hasAnyRealData) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 md:p-12 text-center max-w-4xl mx-auto my-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-8 h-8 text-sky-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Tu Centro de Control Energético está listo para comenzar
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base mb-8">
          ENERGIA360 nunca inventa ni rellena tus gráficos con cifras falsas.
          Para calcular tu consumo real, proyecciones y oportunidades de ahorro
          con las tarifas de{" "}
          <strong className="text-slate-200">
            {vault.profile.distributor} ({vault.profile.tariffCode})
          </strong>
          , elige cómo deseas empezar:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8">
          <button
            onClick={() => onNavigateTab("equipos")}
            className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-sky-500/60 transition group"
          >
            <Calculator className="w-6 h-6 text-sky-400 mb-3 group-hover:scale-110 transition" />
            <div className="font-semibold text-base mb-1">
              1. Registrar Equipos (Sin Factura)
            </div>
            <p className="text-xs text-slate-400">
              Usa nuestra biblioteca de equipos de República Dominicana para
              estimar tu consumo desde el primer minuto.
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("facturas")}
            className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-emerald-500/60 transition group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition" />
            <div className="font-semibold text-base mb-1">
              2. Analizar una Factura Localmente
            </div>
            <p className="text-xs text-slate-400">
              Carga tu recibo de EDESUR, EDENORTE, EDEESTE o CEPM (PDF o foto).
              Se procesa 100% en tu navegador.
            </p>
          </button>

          <button
            onClick={onLoadDemoMode}
            className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition group"
          >
            <Sparkles className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition" />
            <div className="font-semibold text-base mb-1 text-amber-300">
              3. Explorar Modo Demostración
            </div>
            <p className="text-xs text-slate-400">
              Carga un hogar dominicano sintético con 5 meses de historial,
              inversor y simulaciones (aislado de tus datos).
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
      {/* Cinta de Origen de Datos y Contexto Tarifario */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Distribuidora: {vault.profile.distributor} ({activeSchedule.tariff_code})
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            Base de cálculo:{" "}
            {latestInvoice
              ? "Factura Confirmada + Inventario de Equipos"
              : "Estimación por Inventario de Equipos"}
          </span>
          {billSimulation.lostStepSubsidy701 && (
            <span className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              Escalón &ge; 701 kWh Activo (Sin subsidio escalonado SIE)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            {(["3m", "6m", "all"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  periodFilter === period
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {period === "3m"
                  ? "3 Meses"
                  : period === "6m"
                  ? "6 Meses"
                  : "Todo"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewUnit("kwh")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                viewUnit === "kwh"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              kWh
            </button>
            <button
              onClick={() => setViewUnit("dop")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                viewUnit === "dop"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              RD$
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Consumo del Mes */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>
              {latestInvoice
                ? "CONSUMO ÚLTIMA FACTURA"
                : "CONSUMO MENSUAL ESTIMADO"}
            </span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {currentReferenceKwh.toLocaleString("es-DO")}{" "}
            <span className="text-base font-semibold text-slate-400">kWh</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Promedio diario:{" "}
              <strong className="text-slate-200">
                {dailyAverageKwh} kWh/día
              </strong>
            </span>
            {monthOverMonthVariationPct !== null && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  monthOverMonthVariationPct > 0
                    ? "text-rose-400"
                    : "text-emerald-400"
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

        {/* KPI 2: Costo / Proyección de Factura */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>
              {latestInvoice
                ? "IMPORTE FACTURADO / PROYECCIÓN"
                : "FACTURA MENSUAL ESTIMADA"}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-400">
            RD${" "}
            {(
              latestInvoice?.totalAmountDop.value ||
              billSimulation.totalEstimatedBillDop
            ).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              Costo medio:{" "}
              <strong className="text-slate-200">
                RD$ {billSimulation.averageRateDopPerKwh.toFixed(2)}/kWh
              </strong>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">
              {latestInvoice ? "Medido" : "Estimado SIE"}
            </span>
          </div>
        </div>

        {/* KPI 3: Objetivo de Ahorro y Escalón 700 kWh */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>MARGEN ESCALÓN 700 kWh (SIE)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {currentReferenceKwh >= 701 ? (
              <span className="text-rose-400">
                +{(currentReferenceKwh - 700).toFixed(0)} kWh
              </span>
            ) : (
              <span className="text-sky-400">
                {(700 - currentReferenceKwh).toFixed(0)} kWh libres
              </span>
            )}
          </div>
          <div className="mt-2.5 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                currentReferenceKwh >= 701
                  ? "bg-rose-500"
                  : currentReferenceKwh >= 600
                  ? "bg-amber-400"
                  : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.min(100, (currentReferenceKwh / 700) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400">
            Meta de ahorro mensual: RD${" "}
            {vault.profile.monthlySavingsGoalDop.toLocaleString("es-DO")}
          </div>
        </div>

        {/* KPI 4: Eficiencia y Respaldo Inversor */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>ÍNDICE EFICIENCIA Y RESPALDO</span>
            <BatteryCharging className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {efficiencyScore !== null ? `${efficiencyScore}/100` : "N/D"}
            </div>
            {inverterAutonomy && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Respaldo: {inverterAutonomy.estimatedAutonomyFormatted}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {primaryInverter
              ? `${primaryInverter.inverterBrand} (${
                  primaryInverter.installedSolarKw > 0
                    ? `${primaryInverter.installedSolarKw} kWp Solar`
                    : "Solo Baterías"
                })`
              : "Sin inversor registrado — configurar en módulo Respaldo"}
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes Activas */}
      {triggeredAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              Alertas Inteligentes Detectadas ({triggeredAlerts.length})
            </div>
            <button
              onClick={() => onNavigateTab("inteligencia")}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Configurar umbrales &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {triggeredAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        alert.severity === "critica"
                          ? "bg-rose-500"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="font-semibold text-xs text-slate-100">
                      {alert.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    Sugerencia: {alert.recommendedAction}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800 whitespace-nowrap">
                  {alert.metricValue}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolución Histórica de Facturas o Desglose por Bloques */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-base">
                {filteredInvoices.length > 0
                  ? "Evolución Histórica de Consumo y Facturación"
                  : "Desglose por Escalones Tarifarios SIE"}
              </h3>
              <p className="text-xs text-slate-400">
                {filteredInvoices.length > 0
                  ? "Datos reales procedentes de las facturas confirmadas por el usuario"
                  : activeSchedule.notes}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
              Moneda: RD$ | Unidad: kWh
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
                    limiteSubsidio: 700,
                  }))}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={viewUnit === "kwh" ? "#0EA5E9" : "#10B981"}
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="95%"
                        stopColor={viewUnit === "kwh" ? "#0EA5E9" : "#10B981"}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="periodo" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#1E293B",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={viewUnit}
                    name={viewUnit === "kwh" ? "Consumo (kWh)" : "Total (RD$)"}
                    stroke={viewUnit === "kwh" ? "#0EA5E9" : "#10B981"}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={billSimulation.blocksBreakdown}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#1E293B",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey={viewUnit === "kwh" ? "kwhInBlock" : "subtotalDop"}
                    name={
                      viewUnit === "kwh"
                        ? "Energía en bloque (kWh)"
                        : "Costo bloque (RD$)"
                    }
                    fill="#0EA5E9"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución por Categoría de Equipos */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base">
              Distribución por Categoría de Equipos
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Total estimado por equipos:{" "}
              <strong className="text-slate-200">
                {totalAppliancesMonthlyKwh} kWh/mes
              </strong>
            </p>
          </div>

          {categoryDistribution.length > 0 ? (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey={viewUnit === "kwh" ? "kwh" : "costDop"}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#1E293B",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {categoryDistribution.slice(0, 4).map((cat, idx) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                      <span className="truncate text-slate-300">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200">
                      {cat.kwh} kWh (RD$ {cat.costDop.toLocaleString("es-DO")})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              Aún no has registrado equipos en la calculadora.
              <div className="mt-3">
                <button
                  onClick={() => onNavigateTab("equipos")}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium"
                >
                  Agregar equipos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Equipos de Mayor Impacto y Desglose Tarifario Explicado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">
                Equipos de Mayor Impacto en tu Factura
              </h3>
              <p className="text-xs text-slate-400">
                Estimación basada en potencia nominal, factor de ciclo y horas de
                uso
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("equipos")}
              className="text-xs font-medium text-sky-400 hover:underline"
            >
              Simular horas &rarr;
            </button>
          </div>

          {applianceBreakdown.length > 0 ? (
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
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-100">{item.name}</span>
                      <span className="text-emerald-400">
                        RD${" "}
                        {item.estimatedMonthlyCostDop.toLocaleString("es-DO")}/mes
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>
                        {item.nominalWatts}W × {item.quantity} und ·{" "}
                        {item.dailyHours}h/día
                      </span>
                      <span>
                        {item.monthlyKwh} kWh ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Registra tus equipos eléctricos para identificar cuáles generan los
              mayores costos.
            </p>
          )}
        </div>

        {/* Explicación Transparente de la Factura según Pliego SIE */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base">
                Auditoría Matemática del Pliego Tarifario ({activeSchedule.distributor_code})
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {activeSchedule.is_official_sie
                  ? "Tarifa Oficial SIE"
                  : "Tarifa Orientativa"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {billSimulation.explanation}
            </p>

            <div className="space-y-2">
              {billSimulation.blocksBreakdown.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80"
                >
                  <div>
                    <div className="font-medium text-slate-200">{b.label}</div>
                    <div className="text-[11px] text-slate-400">
                      {b.kwhInBlock} kWh × RD$ {b.rateDop.toFixed(2)}/kWh
                    </div>
                  </div>
                  <div className="font-bold text-slate-100">
                    RD$ {b.subtotalDop.toLocaleString("es-DO")}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-300">Cargo Fijo Mensual Regulado</span>
                <span className="font-bold text-slate-100">
                  RD$ {billSimulation.fixedChargeDop.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Total Calculado por Fórmulas Oficiales:
            </span>
            <span className="text-lg font-extrabold text-emerald-400">
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

