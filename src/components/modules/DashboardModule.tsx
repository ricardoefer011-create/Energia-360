"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BatteryCharging,
  Calculator,
  FileSpreadsheet,
  ShieldCheck,
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

const MONOCHROME_CHART_COLORS = [
  "#18181B",
  "#3F3F46",
  "#71717A",
  "#A1A1AA",
  "#D4D4D8",
  "#52525B",
  "#E4E4E7",
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
      <div className="apple-card p-8 sm:p-12 text-center max-w-3xl mx-auto my-6">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-8 h-8 text-zinc-900" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-3">
          Bienvenido a tu resumen energético
        </h2>
        <p className="text-zinc-500 max-w-xl mx-auto text-base mb-8">
          Para mostrar tus métricas reales con la tarifa de{" "}
          <strong className="text-zinc-900">
            {vault.profile.distributor} ({vault.profile.tariffCode})
          </strong>
          , elige cómo deseas comenzar:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <button
            onClick={() => onNavigateTab("equipos")}
            className="p-6 rounded-3xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition"
          >
            <Calculator className="w-6 h-6 text-zinc-900 mb-3" />
            <div className="font-bold text-base text-zinc-900 mb-1">
              Agregar Equipos
            </div>
            <p className="text-xs text-zinc-500">
              Selecciona tus aires, nevera y abanicos en segundos.
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("facturas")}
            className="p-6 rounded-3xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition"
          >
            <FileSpreadsheet className="w-6 h-6 text-zinc-900 mb-3" />
            <div className="font-bold text-base text-zinc-900 mb-1">
              Subir una Factura
            </div>
            <p className="text-xs text-zinc-500">
              Analiza tu recibo en PDF o foto localmente en tu navegador.
            </p>
          </button>

          <button
            onClick={onLoadDemoMode}
            className="p-6 rounded-3xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900 transition"
          >
            <Sparkles className="w-6 h-6 text-white mb-3" />
            <div className="font-bold text-base text-white mb-1">
              Cargar Usuario Demo
            </div>
            <p className="text-xs text-zinc-300">
              Explora un hogar completo con facturas e inversor precargados.
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
      {/* Cabecera minimalista del espacio y controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
              {vault.profile.distributor} · {activeSchedule.tariff_code}
            </span>
            {billSimulation.lostStepSubsidy701 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 text-white">
                <AlertTriangle className="w-3.5 h-3.5" />
                Escalón &ge; 701 kWh (Sin subsidio escalonado)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {vault.profile.spaceName}
          </h1>
        </div>

        {/* Controles tipo Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-zinc-100 border border-zinc-200/80 p-1 text-xs font-semibold">
            {(["3m", "6m", "all"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-3.5 py-1.5 rounded-full transition ${
                  periodFilter === period
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
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

          <div className="inline-flex rounded-full bg-zinc-100 border border-zinc-200/80 p-1 text-xs font-semibold">
            <button
              onClick={() => setViewUnit("kwh")}
              className={`px-3.5 py-1.5 rounded-full transition ${
                viewUnit === "kwh"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              kWh
            </button>
            <button
              onClick={() => setViewUnit("dop")}
              className={`px-3.5 py-1.5 rounded-full transition ${
                viewUnit === "dop"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              RD$
            </button>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas Bento Principales en Blanco y Gris Suave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Consumo Mensual */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-3">
            <span>Consumo Mensual</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200/70 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-900">
            {currentReferenceKwh.toLocaleString("es-DO")}{" "}
            <span className="text-base font-medium text-zinc-500">kWh</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Promedio:{" "}
              <strong className="text-zinc-900">{dailyAverageKwh} kWh/día</strong>
            </span>
            {monthOverMonthVariationPct !== null && (
              <span className="inline-flex items-center gap-0.5 font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
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

        {/* Card 2: Factura Estimada / Importe */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-3">
            <span>Factura Mensual</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200/70 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-900">
            RD${" "}
            {(
              latestInvoice?.totalAmountDop.value ||
              billSimulation.totalEstimatedBillDop
            ).toLocaleString("es-DO", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Tarifa media:{" "}
              <strong className="text-zinc-900">
                RD$ {billSimulation.averageRateDopPerKwh.toFixed(2)}/kWh
              </strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-medium border border-zinc-200/60">
              {latestInvoice ? "Medido" : "Estimado"}
            </span>
          </div>
        </div>

        {/* Card 3: Termómetro del Subsidio 700 kWh */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-3">
            <span>Límite Subsidio (700 kWh)</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200/70 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-900">
            {currentReferenceKwh >= 701 ? (
              <span>
                +{(currentReferenceKwh - 700).toFixed(0)}{" "}
                <span className="text-sm font-medium text-zinc-500">
                  kWh sobre límite
                </span>
              </span>
            ) : (
              <span>
                {(700 - currentReferenceKwh).toFixed(0)}{" "}
                <span className="text-sm font-medium text-zinc-500">
                  kWh disponibles
                </span>
              </span>
            )}
          </div>
          <div className="mt-3 w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200/60">
            <div
              className={`h-full rounded-full transition-all ${
                currentReferenceKwh >= 701
                  ? "bg-zinc-900"
                  : currentReferenceKwh >= 600
                  ? "bg-zinc-700"
                  : "bg-zinc-500"
              }`}
              style={{
                width: `${Math.min(100, (currentReferenceKwh / 700) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Eficiencia y Respaldo Inversor */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-3">
            <span>Eficiencia y Respaldo</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200/70 flex items-center justify-center">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <div className="text-3xl font-bold tracking-tight text-zinc-900">
              {efficiencyScore !== null ? `${efficiencyScore}%` : "N/D"}
            </div>
            {inverterAutonomy && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                {inverterAutonomy.estimatedAutonomyFormatted} en apagón
              </span>
            )}
          </div>
          <div className="mt-3 text-xs text-zinc-500 truncate">
            {primaryInverter
              ? `${primaryInverter.inverterBrand} (${primaryInverter.batteryBrand})`
              : "Configurar inversor en pestaña Solar"}
          </div>
        </div>
      </div>

      {/* Gráficos Limpios en Escala de Grises Suave */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-bold text-lg text-zinc-900">
                {filteredInvoices.length > 0
                  ? "Tendencia Histórica de Consumo"
                  : "Escalones Tarifarios Aplicados"}
              </h3>
              <p className="text-xs text-zinc-500">
                {filteredInvoices.length > 0
                  ? "Evolución mensual de tus facturas confirmadas"
                  : activeSchedule.notes}
              </p>
            </div>
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
                    <linearGradient id="appleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#18181B"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#18181B"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="periodo" stroke="#71717A" fontSize={12} />
                  <YAxis stroke="#71717A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E4E4E7",
                      borderRadius: "16px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                      color: "#18181B",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={viewUnit}
                    name={viewUnit === "kwh" ? "Consumo (kWh)" : "Total (RD$)"}
                    stroke="#18181B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#appleGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billSimulation.blocksBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="label" stroke="#71717A" fontSize={11} />
                  <YAxis stroke="#71717A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E4E4E7",
                      borderRadius: "16px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey={viewUnit === "kwh" ? "kwhInBlock" : "subtotalDop"}
                    fill="#18181B"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución por Categoría */}
        <div className="apple-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-zinc-900">
              ¿En qué se va tu energía?
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              Suma de equipos:{" "}
              <strong className="text-zinc-900">
                {totalAppliancesMonthlyKwh} kWh/mes
              </strong>
            </p>
          </div>

          {categoryDistribution.length > 0 ? (
            <>
              <div className="h-48 w-full">
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
                            MONOCHROME_CHART_COLORS[
                              index % MONOCHROME_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E4E4E7",
                        borderRadius: "14px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {categoryDistribution.slice(0, 4).map((cat, idx) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            MONOCHROME_CHART_COLORS[
                              idx % MONOCHROME_CHART_COLORS.length
                            ],
                        }}
                      />
                      <span className="truncate font-medium text-zinc-900">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-semibold text-zinc-600">
                      RD$ {cat.costDop.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-xs text-zinc-500">
              Agrega tus equipos para ver el desglose.
            </div>
          )}
        </div>
      </div>

      {/* Equipos de Mayor Gasto y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-card p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-zinc-900">
                Equipos de Mayor Costo Mensual
              </h3>
              <p className="text-xs text-zinc-500">
                Tus aparatos ordenados por su impacto en pesos dominicanos
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("equipos")}
              className="text-xs font-semibold text-zinc-900 hover:underline"
            >
              Ajustar horas &rarr;
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
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-sm text-zinc-900">
                      {item.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {item.dailyHours}h al día · {item.monthlyKwh} kWh/mes (
                      {pct}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-zinc-900">
                      RD${" "}
                      {item.estimatedMonthlyCostDop.toLocaleString("es-DO")}
                    </div>
                    <div className="text-[11px] text-zinc-500">al mes</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas y Desglose de Bloques SIE */}
        <div className="apple-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-zinc-900 mb-1">
              Avisos Inteligentes y Escalones SIE
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {billSimulation.explanation}
            </p>

            {triggeredAlerts.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                {triggeredAlerts.slice(0, 3).map((al) => (
                  <div
                    key={al.id}
                    className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-zinc-900">
                      <span>{al.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 text-zinc-800 text-[11px]">
                        {al.metricValue}
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-1">{al.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 mb-4">
                Todo tu consumo se encuentra dentro de los parámetros normales.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-200/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Total calculado con pliego {activeSchedule.distributor_code}:
            </span>
            <span className="text-xl font-bold text-zinc-900">
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
