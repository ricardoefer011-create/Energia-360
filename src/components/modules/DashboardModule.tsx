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
  MessageSquare,
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

const DISCORD_CHART_COLORS = [
  "#5865F2",
  "#57F287",
  "#EB459E",
  "#FEE75C",
  "#00B0F4",
  "#F0B232",
  "#F23F43",
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
        <div className="w-16 h-16 rounded-3xl bg-[#5865F2] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#5865F2]/30">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
          ¡Bienvenido a tu Servidor de Energía!
        </h2>
        <p className="text-[#B5BAC1] max-w-xl mx-auto text-base mb-8">
          Para mostrar tus métricas en vivo con la tarifa de{" "}
          <strong className="text-[#57F287]">
            {vault.profile.distributor} ({vault.profile.tariffCode})
          </strong>
          , elige cómo quieres arrancar:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <button
            onClick={() => onNavigateTab("equipos")}
            className="p-6 rounded-3xl bg-[#1E1F22] hover:bg-[#383A40] border border-white/10 transition cursor-pointer"
          >
            <Calculator className="w-6 h-6 text-[#5865F2] mb-3" />
            <div className="font-extrabold text-base text-white mb-1">
              Agregar Equipos
            </div>
            <p className="text-xs text-[#B5BAC1]">
              Selecciona tus aires, nevera y abanicos en segundos.
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("facturas")}
            className="p-6 rounded-3xl bg-[#1E1F22] hover:bg-[#383A40] border border-white/10 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-6 h-6 text-[#57F287] mb-3" />
            <div className="font-extrabold text-base text-white mb-1">
              Subir una Factura
            </div>
            <p className="text-xs text-[#B5BAC1]">
              Escanea tu recibo en PDF o foto localmente en tu navegador.
            </p>
          </button>

          <button
            onClick={onLoadDemoMode}
            className="p-6 rounded-3xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition cursor-pointer shadow-lg shadow-[#5865F2]/25"
          >
            <Sparkles className="w-6 h-6 text-[#FEE75C] mb-3" />
            <div className="font-extrabold text-base text-white mb-1">
              Cargar Servidor Demo
            </div>
            <p className="text-xs text-white/85">
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
      {/* Banner Jovial Estilo Discord Nitro / Bot Callout */}
      <div className="rounded-[24px] bg-gradient-to-r from-[#5865F2] via-[#4752C4] to-[#EB459E] p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black/25 backdrop-blur-md flex items-center justify-center shrink-0 -rotate-3">
            <MessageSquare className="w-6 h-6 text-[#FEE75C]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-black/30 text-[#57F287]">
                {vault.profile.distributor} · {activeSchedule.tariff_code}
              </span>
              {billSimulation.lostStepSubsidy701 && (
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#F23F43] text-white inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Escalón &ge; 701 kWh
                  Activo
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {vault.profile.spaceName}
            </h1>
          </div>
        </div>

        {/* Controles de filtro tipo píldoras Discord */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-black/30 p-1 text-xs font-extrabold">
            {(["3m", "6m", "all"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
                  periodFilter === period
                    ? "bg-white text-[#23272A]"
                    : "text-white/80 hover:text-white"
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

          <div className="inline-flex rounded-full bg-black/30 p-1 text-xs font-extrabold">
            <button
              onClick={() => setViewUnit("kwh")}
              className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
                viewUnit === "kwh"
                  ? "bg-[#57F287] text-[#1E1F22]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              kWh
            </button>
            <button
              onClick={() => setViewUnit("dop")}
              className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
                viewUnit === "dop"
                  ? "bg-[#FEE75C] text-[#1E1F22]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              RD$
            </button>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas Principales con Personalidad Discord */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Consumo Mensual */}
        <div className="apple-card p-5 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#B5BAC1] mb-3">
            <span>Consumo del Mes</span>
            <div className="w-9 h-9 rounded-2xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black tracking-tight text-white">
            {currentReferenceKwh.toLocaleString("es-DO")}{" "}
            <span className="text-sm font-bold text-[#B5BAC1]">kWh</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#B5BAC1]">
              Ritmo:{" "}
              <strong className="text-white">{dailyAverageKwh} kWh/día</strong>
            </span>
            {monthOverMonthVariationPct !== null && (
              <span
                className={`inline-flex items-center gap-0.5 font-extrabold px-2 py-0.5 rounded-full ${
                  monthOverMonthVariationPct > 0
                    ? "bg-[#F23F43]/20 text-[#F23F43]"
                    : "bg-[#23A55A]/20 text-[#57F287]"
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

        {/* Card 2: Factura Estimada */}
        <div className="apple-card p-5 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#B5BAC1] mb-3">
            <span>Factura Mensual</span>
            <div className="w-9 h-9 rounded-2xl bg-[#23A55A]/20 text-[#57F287] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black tracking-tight text-[#57F287]">
            RD${" "}
            {(
              latestInvoice?.totalAmountDop.value ||
              billSimulation.totalEstimatedBillDop
            ).toLocaleString("es-DO", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#B5BAC1]">
            <span>
              Promedio:{" "}
              <strong className="text-white">
                RD$ {billSimulation.averageRateDopPerKwh.toFixed(2)}/kWh
              </strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#1E1F22] text-[#FEE75C] font-bold">
              {latestInvoice ? "Real" : "Estimado"}
            </span>
          </div>
        </div>

        {/* Card 3: Termómetro Subsidio 700 kWh */}
        <div className="apple-card p-5 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#B5BAC1] mb-3">
            <span>Meta Subsidio (700 kWh)</span>
            <div className="w-9 h-9 rounded-2xl bg-[#FEE75C]/20 text-[#FEE75C] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black tracking-tight">
            {currentReferenceKwh >= 701 ? (
              <span className="text-[#F23F43]">
                +{(currentReferenceKwh - 700).toFixed(0)}{" "}
                <span className="text-xs font-bold">kWh pasados</span>
              </span>
            ) : (
              <span className="text-[#FEE75C]">
                {(700 - currentReferenceKwh).toFixed(0)}{" "}
                <span className="text-xs font-bold text-[#B5BAC1]">
                  kWh de margen
                </span>
              </span>
            )}
          </div>
          <div className="mt-3 w-full bg-[#1E1F22] h-3 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all ${
                currentReferenceKwh >= 701
                  ? "bg-[#F23F43]"
                  : currentReferenceKwh >= 600
                  ? "bg-[#FEE75C]"
                  : "bg-[#57F287]"
              }`}
              style={{
                width: `${Math.min(100, (currentReferenceKwh / 700) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Eficiencia & Respaldo Inversor */}
        <div className="apple-card p-5 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#B5BAC1] mb-3">
            <span>Nivel Nitro &amp; Inversor</span>
            <div className="w-9 h-9 rounded-2xl bg-[#EB459E]/20 text-[#EB459E] flex items-center justify-center">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <div className="text-3xl font-black tracking-tight text-white">
              {efficiencyScore !== null ? `${efficiencyScore}%` : "N/D"}
            </div>
            {inverterAutonomy && (
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#EB459E]/20 text-[#EB459E]">
                ⚡ {inverterAutonomy.estimatedAutonomyFormatted}
              </span>
            )}
          </div>
          <div className="mt-3 text-xs text-[#B5BAC1] truncate">
            {primaryInverter
              ? `${primaryInverter.inverterBrand} (${primaryInverter.batteryBrand})`
              : "Configura tu inversor en #solar-e-inversor"}
          </div>
        </div>
      </div>

      {/* Gráficos con Colores Discord Blurple / Neon Green / Fuchsia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-black text-lg text-white">
                {filteredInvoices.length > 0
                  ? "📈 Evolución de tus Recibos Eléctricos"
                  : "📊 Escalones Tarifarios SIE"}
              </h3>
              <p className="text-xs text-[#B5BAC1]">
                {filteredInvoices.length > 0
                  ? "Historial confirmado mes a mes en tu servidor"
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
                    <linearGradient
                      id="discordGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={viewUnit === "kwh" ? "#5865F2" : "#57F287"}
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="95%"
                        stopColor={viewUnit === "kwh" ? "#5865F2" : "#57F287"}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F4147" />
                  <XAxis dataKey="periodo" stroke="#B5BAC1" fontSize={12} />
                  <YAxis stroke="#B5BAC1" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E1F22",
                      borderColor: "#5865F2",
                      borderRadius: "16px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={viewUnit}
                    name={viewUnit === "kwh" ? "Consumo (kWh)" : "Total (RD$)"}
                    stroke={viewUnit === "kwh" ? "#5865F2" : "#57F287"}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#discordGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billSimulation.blocksBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F4147" />
                  <XAxis dataKey="label" stroke="#B5BAC1" fontSize={11} />
                  <YAxis stroke="#B5BAC1" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E1F22",
                      borderColor: "#5865F2",
                      borderRadius: "16px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Bar
                    dataKey={viewUnit === "kwh" ? "kwhInBlock" : "subtotalDop"}
                    fill="#5865F2"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución por Categoría */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-lg text-white">
              🎯 ¿Quién gasta más?
            </h3>
            <p className="text-xs text-[#B5BAC1] mb-3">
              Suma de equipos:{" "}
              <strong className="text-[#57F287]">
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
                            DISCORD_CHART_COLORS[
                              index % DISCORD_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E1F22",
                        borderColor: "#5865F2",
                        borderRadius: "14px",
                        fontSize: "12px",
                        color: "#FFFFFF",
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
                            DISCORD_CHART_COLORS[
                              idx % DISCORD_CHART_COLORS.length
                            ],
                        }}
                      />
                      <span className="truncate font-bold text-white">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-extrabold text-[#57F287]">
                      RD$ {cat.costDop.toLocaleString("es-DO")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-xs text-[#B5BAC1]">
              Agrega tus equipos para ver el reparto.
            </div>
          )}
        </div>
      </div>

      {/* Equipos de Mayor Costo y Alertas tipo Mensajes de Bot Discord */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-lg text-white">
                🔥 Top Equipos por Impacto en RD$
              </h3>
              <p className="text-xs text-[#B5BAC1]">
                Tus aparatos ordenados por lo que cuestan cada mes
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("equipos")}
              className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white transition cursor-pointer"
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
                  className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-extrabold text-sm text-white">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#B5BAC1] mt-0.5">
                      {item.dailyHours}h al día · {item.monthlyKwh} kWh/mes (
                      {pct}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-[#FEE75C]">
                      RD${" "}
                      {item.estimatedMonthlyCostDop.toLocaleString("es-DO")}
                    </div>
                    <div className="text-[11px] text-[#B5BAC1]">al mes</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas estilo Mensajes de Bot de Discord */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-[#5865F2] text-[10px] font-black text-white">
                BOT SIE
              </span>
              <h3 className="font-black text-lg text-white">
                Avisos en Vivo del Servidor
              </h3>
            </div>
            <p className="text-xs text-[#B5BAC1] mb-4">
              {billSimulation.explanation}
            </p>

            {triggeredAlerts.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                {triggeredAlerts.slice(0, 3).map((al) => (
                  <div
                    key={al.id}
                    className="p-4 rounded-2xl bg-[#1E1F22] border-l-4 border-[#FEE75C] text-xs"
                  >
                    <div className="flex items-center justify-between font-extrabold text-white">
                      <span>{al.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FEE75C]/20 text-[#FEE75C] text-[11px]">
                        {al.metricValue}
                      </span>
                    </div>
                    <p className="text-[#B5BAC1] mt-1">{al.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#23A55A]/15 border border-[#23A55A]/30 text-xs text-[#57F287] mb-4">
                ¡Todo nítido! Tu consumo está dentro de los parámetros ideales.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-[#B5BAC1]">
              Total calculado con pliego {activeSchedule.distributor_code}:
            </span>
            <span className="text-xl font-black text-[#57F287]">
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
