"use client";

import React, { useMemo, useState } from "react";
import { Bell, Cpu, Scale } from "lucide-react";
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
      "Ajuste de horario nocturno y limpieza de filtros sin costo de inversión.",
    kwhReductionMonthly: 95,
    estimatedInvestmentDop: 0,
  },
  {
    id: "scen-ac-inverter",
    name: "Escenario 2: Cambiar Aire Convencional por Inverter",
    type: "cambiar_inverter",
    description:
      "Sustitución del aire acondicionado principal por tecnología Inverter SEER 20.",
    kwhReductionMonthly: 165,
    estimatedInvestmentDop: 38500,
  },
  {
    id: "scen-fridge-led",
    name: "Escenario 3: Nevera Inverter + Control de Bomba de Agua",
    type: "reemplazar_nevera",
    description:
      "Modernización de refrigeración y revisión de flotador de cisterna.",
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

      return {
        ...sc,
        baseMonthlyKwh,
        projectedKwh,
        currentBillDop: currentBill.totalEstimatedBillDop,
        projectedBillDop: projectedBill.totalEstimatedBillDop,
        monthlySavingsDop,
        annualSavingsDop,
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
      {/* Recomendaciones Inteligentes */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-[#1D1D1F]">
                Recomendaciones Personalizadas de Ahorro
              </h2>
              <p className="text-xs text-[#6E6E73]">
                Basadas en tus facturas y equipos registrados en{" "}
                {activeSchedule.distributor_code}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-6 rounded-3xl bg-[#F5F5F7] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      rec.severity === "alta"
                        ? "bg-[#FF3B30]/12 text-[#C92A2A]"
                        : "bg-[#0071E3]/10 text-[#0071E3]"
                    }`}
                  >
                    Impacto {rec.severity}
                  </span>
                  <span className="text-xs text-[#6E6E73]">
                    Confianza: <strong>{rec.confidenceLevel}</strong>
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#1D1D1F] mb-2">
                  {rec.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed mb-3">
                  {rec.problemIdentified}
                </p>
                <div className="p-3.5 rounded-2xl bg-white text-xs text-[#1D1D1F]">
                  <strong>Qué hacer:</strong> {rec.suggestedAction}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs">
                <span className="text-[#6E6E73]">
                  Reducción: <strong>-{rec.potentialMonthlySavingsKwh} kWh</strong>
                </span>
                <span className="font-bold text-sm text-[#1D832D]">
                  Ahorro: ~RD${" "}
                  {rec.potentialMonthlySavingsDop.toLocaleString("es-DO")}/mes
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulador de 3 Escenarios */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#28CD41]/15 text-[#1D832D] flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#1D1D1F]">
              Comparador de Escenarios de Ahorro
            </h3>
            <p className="text-xs text-[#6E6E73]">
              Compara hasta 3 planes de acción frente a tu factura actual de RD${" "}
              {currentBill.totalEstimatedBillDop.toLocaleString("es-DO")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {scenarioComparisons.map((sc) => (
            <div
              key={sc.id}
              className="p-6 rounded-3xl bg-[#F5F5F7] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-sm text-[#1D1D1F]">
                    {sc.name}
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73] mb-4">{sc.description}</p>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6E6E73]">Ahorro en energía:</span>
                    <strong className="text-[#0071E3]">
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
                    className="w-full accent-[#28CD41]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-black/[0.06] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Nueva factura:</span>
                  <strong className="text-[#1D1D1F]">
                    RD$ {sc.projectedBillDop.toLocaleString("es-DO")}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Ahorro mensual:</span>
                  <strong className="text-sm text-[#1D832D]">
                    RD$ {sc.monthlySavingsDop.toLocaleString("es-DO")}/mes
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Ahorro en 1 año:</span>
                  <strong className="text-[#1D832D]">
                    RD$ {sc.annualSavingsDop.toLocaleString("es-DO")}/año
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={scenarioComparisons.map((s, idx) => ({
                escenario: `Opción ${idx + 1}`,
                "Factura Actual": s.currentBillDop,
                "Nueva Factura": s.projectedBillDop,
                "Ahorro Mensual": s.monthlySavingsDop,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="escenario" stroke="#8E8E93" fontSize={12} />
              <YAxis stroke="#8E8E93" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "rgba(0,0,0,0.08)",
                  borderRadius: "16px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="Factura Actual"
                fill="#8E8E93"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="Nueva Factura"
                fill="#0071E3"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="Ahorro Mensual"
                fill="#28CD41"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas Configurables */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF9500]/15 text-[#C97400] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1D1D1F]">
                Mis Alertas Inteligentes
              </h3>
              <p className="text-xs text-[#6E6E73]">
                Personaliza cuándo quieres que te avisemos ({triggeredAlerts.length}{" "}
                activas)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {alertConfigs.map((cfg) => (
            <div
              key={cfg.id}
              className="p-4 rounded-2xl bg-[#F5F5F7] flex items-center justify-between gap-4"
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) =>
                    onUpdateAlertConfig({
                      ...cfg,
                      enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-[#0071E3]"
                />
                <span className="font-medium text-xs sm:text-sm text-[#1D1D1F]">
                  {cfg.label}
                </span>
              </label>

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
                  className="w-20 rounded-xl bg-white border border-black/10 px-2.5 py-1.5 text-xs text-right font-bold text-[#1D1D1F]"
                />
                <span className="text-xs text-[#6E6E73] w-10">{cfg.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
