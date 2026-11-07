"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Lightbulb,
  Scale,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertConfig,
  ElectricityInvoice,
  SavingsScenario,
  TariffSchedule,
  TriggeredAlert,
  UserAppliance,
} from "@/types/energia360";
import {
  calculateApplianceConsumption,
  calculateDominicanTariffBill,
  generateEnergyRecommendations,
} from "@/lib/engine/energy-engine";

interface IntelligenceAndSavingsModuleProps {
  invoices: ElectricityInvoice[];
  appliances: UserAppliance[];
  activeSchedule: TariffSchedule;
  customRateDopPerKwh: number | null;
  alertConfigs: AlertConfig[];
  triggeredAlerts: TriggeredAlert[];
  onUpdateAlertConfig: (updated: AlertConfig) => void;
}

const PRESET_SAVINGS_SCENARIOS: SavingsScenario[] = [
  {
    id: "scen-ac-hours",
    name: "Escenario 1: Reducir 1.5h de A/C + Termostato a 24°C",
    type: "reducir_horas_ac",
    description:
      "Ajuste de hábito nocturno y limpieza de filtros sin inversión de capital.",
    kwhReductionMonthly: 95,
    estimatedInvestmentDop: 0,
  },
  {
    id: "scen-ac-inverter",
    name: "Escenario 2: Sustituir A/C Convencional por Inverter SEER 20",
    type: "cambiar_inverter",
    description:
      "Reemplazo del aire acondicionado principal On-Off por tecnología Inverter de alta eficiencia.",
    kwhReductionMonthly: 165,
    estimatedInvestmentDop: 38500,
  },
  {
    id: "scen-fridge-led",
    name: "Escenario 3: Cambio de Nevera Antigua + Revisión de Bomba/LED",
    type: "reemplazar_nevera",
    description:
      "Sustitución de nevera convencional + corrección de flotador de cisterna e iluminación LED.",
    kwhReductionMonthly: 120,
    estimatedInvestmentDop: 44000,
  },
];

export function IntelligenceAndSavingsModule({
  invoices,
  appliances,
  activeSchedule,
  customRateDopPerKwh,
  alertConfigs,
  triggeredAlerts,
  onUpdateAlertConfig,
}: IntelligenceAndSavingsModuleProps) {
  const [scenarios, setScenarios] = useState<SavingsScenario[]>(
    PRESET_SAVINGS_SCENARIOS
  );

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort((a, b) =>
        a.billingPeriodEnd.value.localeCompare(b.billingPeriodEnd.value)
      ),
    [invoices]
  );
  const latestInvoice = sortedInvoices[sortedInvoices.length - 1];

  const totalAppliancesKwh = useMemo(
    () =>
      appliances.reduce(
        (s, a) => s + calculateApplianceConsumption(a, 12).monthlyKwh,
        0
      ),
    [appliances]
  );

  const baseMonthlyKwh =
    latestInvoice?.billedKwh.value || totalAppliancesKwh || 550;

  const currentBill = useMemo(
    () =>
      calculateDominicanTariffBill(
        baseMonthlyKwh,
        activeSchedule,
        customRateDopPerKwh
      ),
    [baseMonthlyKwh, activeSchedule, customRateDopPerKwh]
  );

  const recommendations = useMemo(
    () =>
      generateEnergyRecommendations(invoices, appliances, activeSchedule),
    [invoices, appliances, activeSchedule]
  );

  const scenarioComparisons = useMemo(() => {
    return scenarios.map((sc) => {
      const projectedKwh = Math.max(40, baseMonthlyKwh - sc.kwhReductionMonthly);
      const projectedBill = calculateDominicanTariffBill(
        projectedKwh,
        activeSchedule,
        customRateDopPerKwh
      );
      const monthlySavingsDop = Math.max(
        0,
        Math.round(
          (currentBill.totalEstimatedBillDop -
            projectedBill.totalEstimatedBillDop) *
            100
        ) / 100
      );
      const annualSavingsDop = Math.round(monthlySavingsDop * 12 * 100) / 100;
      const paybackMonths =
        sc.estimatedInvestmentDop > 0 && monthlySavingsDop > 0
          ? Math.round((sc.estimatedInvestmentDop / monthlySavingsDop) * 10) /
            10
          : 0;

      return {
        ...sc,
        baseMonthlyKwh,
        projectedKwh,
        currentBillDop: currentBill.totalEstimatedBillDop,
        projectedBillDop: projectedBill.totalEstimatedBillDop,
        monthlySavingsDop,
        annualSavingsDop,
        paybackMonths,
        recoversStepSubsidy:
          currentBill.lostStepSubsidy701 && !projectedBill.lostStepSubsidy701,
      };
    });
  }, [scenarios, baseMonthlyKwh, activeSchedule, customRateDopPerKwh, currentBill]);

  function updateScenarioKwh(id: string, newKwhReduction: number) {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, kwhReductionMonthly: newKwhReduction } : s
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* MÓDULO D: Motor de Inteligencia Energética */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Motor de Inteligencia y Diagnóstico Energético
              </h3>
              <p className="text-xs text-slate-400">
                Cada hallazgo detalla la evidencia disponible, el método de
                cálculo y el nivel de confianza. Los ahorros son estimaciones
                técnicas, no promesas garantizadas.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            Consumo base analizado: {baseMonthlyKwh.toFixed(0)} kWh/mes
          </span>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                        rec.severity === "alta"
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      Prioridad {rec.severity}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Confianza: <strong>{rec.confidenceLevel}</strong> ·{" "}
                      {rec.dataBasis === "datos_medidos_factura"
                        ? "Datos Medidos"
                        : rec.dataBasis === "datos_usuario_equipos"
                        ? "Datos de Equipos"
                        : "Análisis Combinado"}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-100 mb-2">
                    {rec.title}
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-300">
                      <strong className="text-slate-100">
                        Problema identificado:
                      </strong>{" "}
                      {rec.problemIdentified}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-300">
                        Evidencia disponible:
                      </strong>{" "}
                      {rec.availableEvidence}
                    </p>
                    <p className="text-emerald-300">
                      <strong>Acción sugerida:</strong> {rec.suggestedAction}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <strong>Método matemático:</strong> {rec.calculationMethod}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Reducción estimada:{" "}
                    <strong className="text-sky-400">
                      -{rec.potentialMonthlySavingsKwh} kWh/mes
                    </strong>
                  </span>
                  <span className="font-extrabold text-sm text-emerald-400">
                    Ahorro potencial: ~RD${" "}
                    {rec.potentialMonthlySavingsDop.toLocaleString("es-DO")}/mes
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
            Introduce al menos una factura o registra tus equipos eléctricos
            para activar el motor de recomendaciones personalizadas.
          </div>
        )}
      </div>

      {/* MÓDULO E: Simulador de Ahorro (Comparación de hasta 3 escenarios) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Simulador Comparativo de Escenarios de Ahorro (Hasta 3 Escenarios)
              </h3>
              <p className="text-xs text-slate-400">
                Situación actual: {baseMonthlyKwh.toFixed(0)} kWh/mes (RD${" "}
                {currentBill.totalEstimatedBillDop.toLocaleString("es-DO")}/mes).
                Ajusta los kWh ahorrados en cada escenario para comparar el
                efecto en tu factura.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {scenarioComparisons.map((sc) => (
            <div
              key={sc.id}
              className="rounded-xl border border-slate-800 bg-slate-950/85 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-sky-400">
                    {sc.name}
                  </span>
                  {sc.recoversStepSubsidy && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      ¡Recupera Subsidio &lt;700 kWh!
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-3">{sc.description}</p>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">
                      Recorte mensual simulado:
                    </span>
                    <strong className="text-sky-400">
                      -{sc.kwhReductionMonthly} kWh/mes
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={Math.max(250, Math.round(baseMonthlyKwh * 0.6))}
                    step={5}
                    value={sc.kwhReductionMonthly}
                    onChange={(e) =>
                      updateScenarioKwh(sc.id, parseInt(e.target.value, 10))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Consumo proyectado:</span>
                  <span className="font-semibold text-slate-200">
                    {sc.projectedKwh.toFixed(0)} kWh/mes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Factura proyectada:</span>
                  <span className="font-semibold text-slate-200">
                    RD$ {sc.projectedBillDop.toLocaleString("es-DO")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ahorro mensual estimado:</span>
                  <span className="font-bold text-emerald-400">
                    RD$ {sc.monthlySavingsDop.toLocaleString("es-DO")}/mes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ahorro anual estimado:</span>
                  <span className="font-bold text-emerald-300">
                    RD$ {sc.annualSavingsDop.toLocaleString("es-DO")}/año
                  </span>
                </div>
                {sc.estimatedInvestmentDop > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      Inversión: RD${" "}
                      {sc.estimatedInvestmentDop.toLocaleString("es-DO")}
                    </span>
                    <span>Retorno: ~{sc.paybackMonths} meses</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico Comparativo de los 3 Escenarios */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={scenarioComparisons.map((s, idx) => ({
                escenario: `Escenario ${idx + 1}`,
                "Factura Actual (RD$)": s.currentBillDop,
                "Factura Proyectada (RD$)": s.projectedBillDop,
                "Ahorro Mensual (RD$)": s.monthlySavingsDop,
              }))}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="escenario" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderColor: "#1E293B",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="Factura Actual (RD$)"
                fill="#475569"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="Factura Proyectada (RD$)"
                fill="#0EA5E9"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="Ahorro Mensual (RD$)"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MÓDULO H: Configuración de Alertas Inteligentes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Centro de Control de Alertas Inteligentes
              </h3>
              <p className="text-xs text-slate-400">
                Activa o desactiva cada alerta y personaliza el umbral para
                evitar notificaciones excesivas.
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-300 font-semibold">
            {triggeredAlerts.length} alerta(s) activa(s) hoy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertConfigs.map((cfg) => (
            <div
              key={cfg.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/75 flex items-center justify-between gap-4"
            >
              <div className="flex-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) =>
                      onUpdateAlertConfig({
                        ...cfg,
                        enabled: e.target.checked,
                      })
                    }
                    className="rounded accent-sky-500"
                  />
                  <span className="font-semibold text-xs text-slate-100">
                    {cfg.label}
                  </span>
                </label>
                <div className="text-[11px] text-slate-400 mt-1 pl-5">
                  Umbral configurado: {cfg.thresholdValue} {cfg.unit}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={cfg.thresholdValue}
                  onChange={(e) =>
                    onUpdateAlertConfig({
                      ...cfg,
                      thresholdValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-20 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-right font-bold text-slate-100"
                />
                <span className="text-xs text-slate-400 w-10">{cfg.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

