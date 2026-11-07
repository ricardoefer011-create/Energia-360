// ============================================================================
// ENERGIA360 — Motor Matemático y Científico Independiente
// ============================================================================
// Diseñado sin dependencias de UI para permitir pruebas automatizadas rigurosas.
// Implementa:
// 1. Cálculo exacto del Pliego Tarifario SIE (RD) con bloques escalonados y pérdida
//    de subsidio en >= 701 kWh ("Todo a este precio").
// 2. Consumo diario, mensual y costo por equipo considerando factor de ciclo (duty cycle).
// 3. Dimensionamiento fotovoltaico con Horas Solares Pico (HSP) de RD y pérdidas.
// 4. Autonomía de inversores y baterías con Profundidad de Descarga (DoD), SoC y eficiencia.
// 5. Motor de Inteligencia Energética (recomendaciones con método y nivel de confianza).
// 6. Motor de Alertas Inteligentes.
// ============================================================================

import {
  AlertConfig,
  DistributorCode,
  ElectricityInvoice,
  EnergyRecommendation,
  InverterBatterySystem,
  SolarScenarioResult,
  SolarSimulationInput,
  TariffSchedule,
  TriggeredAlert,
  UserAppliance,
} from "@/types/energia360";
import {
  INITIAL_SIE_TARIFF_SCHEDULES,
  RD_PROVINCES_SOLAR_HSP,
} from "@/lib/data/rd-energy-catalog";

export interface TariffBillBreakdownBlock {
  label: string;
  kwhInBlock: number;
  rateDop: number;
  subtotalDop: number;
}

export interface TariffBillCalculationResult {
  totalKwh: number;
  energyChargeDop: number;
  fixedChargeDop: number;
  totalEstimatedBillDop: number;
  averageRateDopPerKwh: number;
  marginalRateDopPerKwh: number;
  lostStepSubsidy701: boolean;
  subsidyLossPenaltyDop: number;
  blocksBreakdown: TariffBillBreakdownBlock[];
  explanation: string;
}

/**
 * Encuentra el pliego tarifario activo para una distribuidora y código de tarifa.
 */
export function resolveTariffSchedule(
  distributor: DistributorCode,
  tariffCode: string = "BTS-1",
  schedules: TariffSchedule[] = INITIAL_SIE_TARIFF_SCHEDULES
): TariffSchedule {
  const match =
    schedules.find(
      (s) =>
        s.distributor_code === distributor &&
        s.tariff_code === tariffCode &&
        s.is_active
    ) ||
    schedules.find((s) => s.distributor_code === distributor && s.is_active) ||
    INITIAL_SIE_TARIFF_SCHEDULES[0];
  return match;
}

/**
 * Calcula una factura eléctrica según el pliego tarifario de República Dominicana (SIE).
 * Contempla tanto el escalonamiento por bloques (0-200, 201-300, 301-700) como la
 * regla crítica de >= 701 kWh donde cada kWh desde el primero se cobra al precio tope.
 */
export function calculateDominicanTariffBill(
  rawKwh: number,
  schedule: TariffSchedule,
  customOverrideRateDopPerKwh?: number | null
): TariffBillCalculationResult {
  const totalKwh = Math.max(0, Number.isFinite(rawKwh) ? rawKwh : 0);

  // Determinar cargo fijo según rango de consumo
  let fixedChargeDop = 0;
  for (const fc of schedule.fixed_charges) {
    const withinMin = totalKwh >= fc.min_kwh;
    const withinMax = fc.max_kwh === null || totalKwh <= fc.max_kwh;
    if (withinMin && withinMax) {
      fixedChargeDop = fc.charge_dop;
      break;
    }
  }
  if (fixedChargeDop === 0 && schedule.fixed_charges.length > 0) {
    fixedChargeDop =
      schedule.fixed_charges[schedule.fixed_charges.length - 1].charge_dop;
  }

  // Si el usuario definió una tarifa personalizada explícita
  if (customOverrideRateDopPerKwh && customOverrideRateDopPerKwh > 0) {
    const energyChargeDop = round2(totalKwh * customOverrideRateDopPerKwh);
    const totalEstimatedBillDop = round2(energyChargeDop + fixedChargeDop);
    return {
      totalKwh,
      energyChargeDop,
      fixedChargeDop,
      totalEstimatedBillDop,
      averageRateDopPerKwh:
        totalKwh > 0 ? round2(energyChargeDop / totalKwh) : customOverrideRateDopPerKwh,
      marginalRateDopPerKwh: customOverrideRateDopPerKwh,
      lostStepSubsidy701: false,
      subsidyLossPenaltyDop: 0,
      blocksBreakdown: [
        {
          label: "Tarifa personalizada por el usuario",
          kwhInBlock: totalKwh,
          rateDop: customOverrideRateDopPerKwh,
          subtotalDop: energyChargeDop,
        },
      ],
      explanation: `Cálculo realizado con tarifa personalizada de RD$ ${customOverrideRateDopPerKwh.toFixed(2)}/kWh × ${totalKwh.toFixed(1)} kWh + cargo fijo de RD$ ${fixedChargeDop.toFixed(2)}.`,
    };
  }

  // Calcular siempre el costo escalonado progresivo para comparar la penalización de >700 kWh
  let progressiveEnergyDop = 0;
  const progressiveBlocks: TariffBillBreakdownBlock[] = [];
  let marginalRate =
    schedule.energy_blocks[0]?.rate_dop ?? 10;

  for (const block of schedule.energy_blocks) {
    const lowerBound = block.min_kwh === 0 ? 0 : block.min_kwh - 1;
    if (totalKwh > lowerBound) {
      const upperBound = block.max_kwh ?? totalKwh;
      const kwhInThisBlock = Math.max(
        0,
        Math.min(totalKwh, upperBound) - lowerBound
      );
      if (kwhInThisBlock > 0) {
        const sub = round2(kwhInThisBlock * block.rate_dop);
        progressiveEnergyDop += sub;
        marginalRate = block.rate_dop;
        progressiveBlocks.push({
          label:
            block.max_kwh !== null
              ? `Escalón ${block.min_kwh} – ${block.max_kwh} kWh`
              : `Escalón > ${lowerBound} kWh`,
          kwhInBlock: round2(kwhInThisBlock),
          rateDop: block.rate_dop,
          subtotalDop: sub,
        });
      }
    }
  }
  progressiveEnergyDop = round2(progressiveEnergyDop);

  // Verificar si aplica pérdida de subsidio escalonado (>= 701 kWh en BTS-1 / BTS-2 SIE)
  const resetThreshold = schedule.full_reset_threshold_kwh;
  const resetRate = schedule.full_reset_rate_dop;

  if (
    schedule.billing_mode === "tiered_with_threshold_reset" &&
    resetThreshold !== null &&
    resetRate !== null &&
    totalKwh >= resetThreshold
  ) {
    const flatHighEnergyDop = round2(totalKwh * resetRate);
    const totalEstimatedBillDop = round2(flatHighEnergyDop + fixedChargeDop);
    const penaltyDop = Math.max(0, round2(flatHighEnergyDop - progressiveEnergyDop));

    return {
      totalKwh,
      energyChargeDop: flatHighEnergyDop,
      fixedChargeDop,
      totalEstimatedBillDop,
      averageRateDopPerKwh: resetRate,
      marginalRateDopPerKwh: resetRate,
      lostStepSubsidy701: true,
      subsidyLossPenaltyDop: penaltyDop,
      blocksBreakdown: [
        {
          label: `Tarifa Plana >= ${resetThreshold} kWh (Sin subsidio escalonado)`,
          kwhInBlock: totalKwh,
          rateDop: resetRate,
          subtotalDop: flatHighEnergyDop,
        },
      ],
      explanation: `Al alcanzar ${totalKwh.toFixed(0)} kWh (>= ${resetThreshold} kWh en ${schedule.distributor_code} ${schedule.tariff_code}), el pliego SIE aplica RD$ ${resetRate.toFixed(2)}/kWh a la totalidad del consumo, generando un sobrecosto de RD$ ${penaltyDop.toLocaleString("es-DO")} frente al esquema escalonado.`,
    };
  }

  const totalEstimatedBillDop = round2(progressiveEnergyDop + fixedChargeDop);
  const averageRateDopPerKwh =
    totalKwh > 0 ? round2(progressiveEnergyDop / totalKwh) : marginalRate;

  return {
    totalKwh,
    energyChargeDop: progressiveEnergyDop,
    fixedChargeDop,
    totalEstimatedBillDop,
    averageRateDopPerKwh,
    marginalRateDopPerKwh: marginalRate,
    lostStepSubsidy701: false,
    subsidyLossPenaltyDop: 0,
    blocksBreakdown: progressiveBlocks,
    explanation: `Cálculo por bloques progresivos SIE (${schedule.distributor_code} ${schedule.tariff_code}): ${progressiveBlocks.map((b) => `${b.kwhInBlock} kWh × RD$ ${b.rateDop}`).join(" + ")} + Cargo fijo RD$ ${fixedChargeDop.toFixed(2)}.`,
  };
}

/**
 * Calcula el consumo diario, mensual y costo estimado de un equipo individual.
 * Fórmulas oficiales:
 * kWh diario = (Watts × cantidad × factor_ciclo × horas_diarias) / 1000
 * kWh mensual = kWh diario × días_uso_mensual
 */
export interface ApplianceConsumptionMetrics {
  effectiveWatts: number;
  dailyKwh: number;
  monthlyKwh: number;
  estimatedMonthlyCostDop: number;
  formulaExplanation: string;
}

export function calculateApplianceConsumption(
  appliance: Pick<
    UserAppliance,
    | "nominalWatts"
    | "dutyCycleFactor"
    | "quantity"
    | "dailyHours"
    | "monthlyDays"
  >,
  effectiveRateDopPerKwh: number
): ApplianceConsumptionMetrics {
  const watts = Math.max(0, appliance.nominalWatts);
  const qty = Math.max(0, Math.min(500, appliance.quantity));
  const duty = Math.max(0.05, Math.min(1.0, appliance.dutyCycleFactor || 1.0));
  const hours = Math.max(0, Math.min(24, appliance.dailyHours));
  const days = Math.max(0, Math.min(31, appliance.monthlyDays));
  const rate = Math.max(0, effectiveRateDopPerKwh);

  const effectiveWatts = round2(watts * qty * duty);
  const dailyKwh = round2((effectiveWatts * hours) / 1000);
  const monthlyKwh = round2(dailyKwh * days);
  const estimatedMonthlyCostDop = round2(monthlyKwh * rate);

  return {
    effectiveWatts,
    dailyKwh,
    monthlyKwh,
    estimatedMonthlyCostDop,
    formulaExplanation: `(${watts} W × ${qty} und × factor ${duty.toFixed(2)} ÷ 1000) × ${hours} h/día × ${days} días = ${monthlyKwh.toFixed(2)} kWh/mes × RD$ ${rate.toFixed(2)}/kWh`,
  };
}

/**
 * Calcula la autonomía real de un sistema de inversor + banco de baterías.
 * Considera capacidad total (Wh), estado de carga actual (SoC %), profundidad de
 * descarga máxima segura (DoD), eficiencia del inversor y demanda en Watts.
 */
export interface InverterAutonomyResult {
  nominalCapacityWh: number;
  usableCapacityWh: number;
  criticalLoadWatts: number;
  dcPowerDrawWatts: number;
  inverterLoadPercent: number;
  isOverloaded: boolean;
  estimatedAutonomyHours: number;
  estimatedAutonomyFormatted: string;
  compatibilityStatus: "Óptimo" | "Carga Elevada" | "Sobrecarga Crítica";
  explanation: string;
}

export function calculateInverterAutonomy(
  system: InverterBatterySystem,
  criticalLoadWatts: number
): InverterAutonomyResult {
  const safeLoadWatts = Math.max(0, criticalLoadWatts);
  const nominalCapacityWh = Math.max(
    0,
    system.totalBatteryCapacityWh ||
      system.batteryVoltageV * system.batteryCapacityAh
  );

  const dod = Math.max(0.2, Math.min(0.95, system.usableDodFraction || 0.5));
  const socFraction = Math.max(
    0.1,
    Math.min(1.0, (system.currentStateOfChargePercent || 100) / 100)
  );
  const efficiency = Math.max(
    0.7,
    Math.min(0.98, system.inverterEfficiency || 0.88)
  );

  // Energía neta utilizable entregable en AC
  const usableCapacityWh = round2(
    nominalCapacityWh * dod * socFraction * efficiency
  );
  const inverterLoadPercent =
    system.inverterPowerW > 0
      ? round2((safeLoadWatts / system.inverterPowerW) * 100)
      : 0;
  const isOverloaded = safeLoadWatts > system.inverterPowerW;

  const estimatedAutonomyHours =
    safeLoadWatts > 0 ? round2(usableCapacityWh / safeLoadWatts) : 0;

  const wholeHours = Math.floor(estimatedAutonomyHours);
  const mins = Math.round((estimatedAutonomyHours - wholeHours) * 60);
  const estimatedAutonomyFormatted =
    safeLoadWatts > 0 ? `${wholeHours}h ${mins}m` : "Sin carga activa";

  let compatibilityStatus: InverterAutonomyResult["compatibilityStatus"] =
    "Óptimo";
  if (isOverloaded) {
    compatibilityStatus = "Sobrecarga Crítica";
  } else if (inverterLoadPercent > 75) {
    compatibilityStatus = "Carga Elevada";
  }

  return {
    nominalCapacityWh,
    usableCapacityWh,
    criticalLoadWatts: safeLoadWatts,
    dcPowerDrawWatts:
      efficiency > 0 ? round2(safeLoadWatts / efficiency) : safeLoadWatts,
    inverterLoadPercent,
    isOverloaded,
    estimatedAutonomyHours,
    estimatedAutonomyFormatted,
    compatibilityStatus,
    explanation: `Energía útil AC = ${nominalCapacityWh} Wh × DoD ${(dod * 100).toFixed(0)}% × SoC ${(socFraction * 100).toFixed(0)}% × Eficiencia ${(efficiency * 100).toFixed(0)}% = ${usableCapacityWh.toFixed(0)} Wh. Dividido entre demanda crítica de ${safeLoadWatts.toFixed(0)} W = ${estimatedAutonomyHours.toFixed(2)} horas.`,
  };
}

/**
 * Simulador Solar Fotovoltaico para República Dominicana (Conservador, Intermedio, Optimista).
 * Fórmula científica:
 * Potencia FV (kWp) = Consumo diario objetivo (kWh) / (HSP provincial × Performance Ratio)
 */
export interface FullSolarSimulationReport {
  provinceHsp: number;
  regionName: string;
  climateNote: string;
  scenarios: SolarScenarioResult[];
  engineeringDisclaimer: string;
  formulaExplanation: string;
}

export function simulateDominicanSolarSystem(
  input: SolarSimulationInput
): FullSolarSimulationReport {
  const provinceInfo = RD_PROVINCES_SOLAR_HSP[input.province] || {
    hsp: 5.3,
    region: "Nacional RD",
    tempDeratingNote: "Irradiación media nacional de referencia: 5.30 HSP.",
  };

  const monthlyKwh = Math.max(50, input.monthlyKwh);
  const dailyKwh = monthlyKwh / 30;
  const targetDailyKwh =
    dailyKwh * (Math.max(20, Math.min(100, input.targetCoveragePercent)) / 100);

  // Penalización por orientación del techo
  const orientationFactorMap: Record<
    SolarSimulationInput["roofOrientation"],
    number
  > = {
    Sur: 1.0,
    "Techo Plano": 0.98,
    "Sureste/Suroeste": 0.95,
    "No conocida": 0.94,
    "Este/Oeste": 0.88,
  };
  const orientationFactor = orientationFactorMap[input.roofOrientation] ?? 0.95;

  const basePr = Math.max(
    0.65,
    Math.min(0.86, (1 - (input.systemLossFactor || 0.22)) * orientationFactor)
  );

  const panelWattsEach = 580; // Panel monocristalino N-Type estándar actual en RD (580W, ~2.6 m² con pasillos)
  const areaPerPanelM2 = 2.65;

  // Costos referenciales de mercado en RD por kWp instalado (DOP)
  // On-Grid: ~RD$ 58,000 - 66,000 / kWp. Híbrido suma banco de litio (~RD$ 24,000 / kWh batería).
  const costPerKwpDop =
    input.installationType === "on_grid_net_metering" ? 62000 : 74000;
  const batteryCostPerKwhDop = 24500;

  const effectiveTariffDop =
    input.averageMonthlyBillDop > 0 && input.monthlyKwh > 0
      ? input.averageMonthlyBillDop / input.monthlyKwh
      : 12.89;

  const scenarioConfigs: Array<{
    label: SolarScenarioResult["scenarioLabel"];
    prMultiplier: number;
    costMultiplier: number;
  }> = [
    { label: "Conservador", prMultiplier: 0.92, costMultiplier: 1.08 },
    { label: "Intermedio", prMultiplier: 1.0, costMultiplier: 1.0 },
    { label: "Optimista", prMultiplier: 1.06, costMultiplier: 0.94 },
  ];

  const scenarios: SolarScenarioResult[] = scenarioConfigs.map((cfg) => {
    const pr = round2(Math.min(0.88, basePr * cfg.prMultiplier));
    const rawKwPeak = targetDailyKwh / (provinceInfo.hsp * pr);
    const estimatedPanelsCount = Math.max(
      2,
      Math.ceil((rawKwPeak * 1000) / panelWattsEach)
    );
    const recommendedKwPeak = round2(
      (estimatedPanelsCount * panelWattsEach) / 1000
    );
    const requiredRoofAreaM2 = round2(estimatedPanelsCount * areaPerPanelM2);
    const roofSpaceSufficient =
      input.availableRoofAreaM2 >= requiredRoofAreaM2;

    const monthlyGenerationKwh = round2(
      recommendedKwPeak * provinceInfo.hsp * pr * 30
    );
    const coveragePercent = round2(
      Math.min(100, (monthlyGenerationKwh / monthlyKwh) * 100)
    );

    const recommendedBatteryKwh =
      input.installationType === "on_grid_net_metering"
        ? 0
        : round2(
            Math.max(
              5,
              (dailyKwh * (Math.max(2, input.desiredAutonomyHours) / 24)) / 0.85
            )
          );

    const estimatedInvestmentDop = round2(
      (recommendedKwPeak * costPerKwpDop +
        recommendedBatteryKwh * batteryCostPerKwhDop) *
        cfg.costMultiplier
    );

    const monthlySavingsDop = round2(
      Math.min(
        input.averageMonthlyBillDop * 0.96,
        monthlyGenerationKwh * effectiveTariffDop
      )
    );
    const annualSavingsDop = round2(monthlySavingsDop * 12);
    const paybackYears =
      annualSavingsDop > 0
        ? round2(estimatedInvestmentDop / annualSavingsDop)
        : 0;
    const tenYearNetSavings = annualSavingsDop * 10 - estimatedInvestmentDop;
    const roi10YearsPercent =
      estimatedInvestmentDop > 0
        ? round2((tenYearNetSavings / estimatedInvestmentDop) * 100)
        : 0;

    return {
      scenarioLabel: cfg.label,
      performanceRatio: pr,
      recommendedKwPeak,
      estimatedPanelsCount,
      panelWattsEach,
      requiredRoofAreaM2,
      roofSpaceSufficient,
      recommendedBatteryKwh,
      monthlyGenerationKwh,
      coveragePercent,
      estimatedInvestmentDop,
      monthlySavingsDop,
      annualSavingsDop,
      paybackYears,
      roi10YearsPercent,
    };
  });

  return {
    provinceHsp: provinceInfo.hsp,
    regionName: provinceInfo.region,
    climateNote: provinceInfo.tempDeratingNote,
    scenarios,
    formulaExplanation: `Potencia FV (kWp) = Consumo diario objetivo (${targetDailyKwh.toFixed(1)} kWh/día) ÷ [HSP ${input.province} (${provinceInfo.hsp} h) × Rendimiento Global PR (${(basePr * 100).toFixed(0)}%)]. Paneles de ${panelWattsEach} Wp (${areaPerPanelM2} m²/panel).`,
    engineeringDisclaimer:
      "Nota técnica preliminar: Estos cálculos utilizan irradiación solar histórica provincial (HSP) y parámetros de pérdidas térmicas y eléctricas estándar en República Dominicana. No sustituyen una inspección estructural de techo ni un diseño de ingeniería firmado para interconexión en el Programa de Medición Neta de la SIE.",
  };
}

/**
 * Motor de Inteligencia Energética: Analiza facturas reales y equipos registrados
 * para generar recomendaciones accionables con método, evidencia y nivel de confianza.
 */
export function generateEnergyRecommendations(
  invoices: ElectricityInvoice[],
  appliances: UserAppliance[],
  schedule: TariffSchedule
): EnergyRecommendation[] {
  const recommendations: EnergyRecommendation[] = [];

  const sortedInvoices = [...invoices].sort((a, b) =>
    a.billingPeriodEnd.value.localeCompare(b.billingPeriodEnd.value)
  );
  const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
  const previousInvoice =
    sortedInvoices.length >= 2
      ? sortedInvoices[sortedInvoices.length - 2]
      : undefined;

  const estimatedApplianceKwh = appliances.reduce((acc, app) => {
    const metrics = calculateApplianceConsumption(app, 12);
    return acc + metrics.monthlyKwh;
  }, 0);

  const referenceMonthlyKwh =
    latestInvoice?.billedKwh.value || estimatedApplianceKwh || 0;
  const billCalc = calculateDominicanTariffBill(referenceMonthlyKwh, schedule);

  // 1. Análisis del escalón crítico de 701 kWh (Pérdida de subsidio escalonado en RD)
  if (
    schedule.full_reset_threshold_kwh === 701 &&
    referenceMonthlyKwh >= 630
  ) {
    if (referenceMonthlyKwh >= 701) {
      const kwhToDropBelow700 = Math.ceil(referenceMonthlyKwh - 695);
      const billAt695 = calculateDominicanTariffBill(695, schedule);
      const savingsByDroppingTo695 = Math.max(
        0,
        round2(billCalc.totalEstimatedBillDop - billAt695.totalEstimatedBillDop)
      );

      recommendations.push({
        id: "rec-subsidy-cliff-exceeded",
        title: "Recuperación del Subsidio Escalonado (< 700 kWh/mes)",
        severity: "alta",
        problemIdentified: `Tu consumo de referencia (${referenceMonthlyKwh.toFixed(0)} kWh) supera el umbral de 701 kWh de la SIE, haciendo que pierdas los bloques subsidiados y pagues RD$ ${schedule.full_reset_rate_dop?.toFixed(2)} por cada kWh desde el primero.`,
        availableEvidence: latestInvoice
          ? `Factura confirmada de ${latestInvoice.billedKwh.value} kWh (${latestInvoice.distributor.value} ${latestInvoice.tariffCode.value}).`
          : `Suma de equipos registrados equivalente a ${estimatedApplianceKwh.toFixed(0)} kWh/mes.`,
        suggestedAction: `Reducir al menos ${kwhToDropBelow700} kWh al mes (${(kwhToDropBelow700 / 30).toFixed(1)} kWh/día) para mantenerte en 695 kWh y recuperar los primeros escalones tarifarios.`,
        potentialMonthlySavingsDop: savingsByDroppingTo695,
        potentialMonthlySavingsKwh: kwhToDropBelow700,
        confidenceLevel: latestInvoice ? "Alto" : "Medio",
        calculationMethod: `Comparación matemática entre tarifa plana >=701 kWh (RD$ ${billCalc.totalEstimatedBillDop.toLocaleString("es-DO")}) y tarifa escalonada a 695 kWh (RD$ ${billAt695.totalEstimatedBillDop.toLocaleString("es-DO")}).`,
        dataBasis: latestInvoice
          ? "datos_medidos_factura"
          : "datos_usuario_equipos",
      });
    } else {
      const marginKwh = Math.max(0, 700 - referenceMonthlyKwh);
      const billAt705 = calculateDominicanTariffBill(705, schedule);
      const jumpCost = round2(
        billAt705.totalEstimatedBillDop - billCalc.totalEstimatedBillDop
      );
      recommendations.push({
        id: "rec-subsidy-cliff-warning",
        title: "Riesgo Cercano de Salto Tarifario (Umbral 701 kWh SIE)",
        severity: "alta",
        problemIdentified: `Estás en ${referenceMonthlyKwh.toFixed(0)} kWh/mes, a solo ${marginKwh.toFixed(0)} kWh de cruzar los 701 kWh donde se pierde el escalonamiento subsidiado.`,
        availableEvidence: `Consumo actual de ${referenceMonthlyKwh.toFixed(0)} kWh frente al límite regulatorio de 700 kWh en tarifa ${schedule.tariff_code}.`,
        suggestedAction:
          "Vigilar las horas de climatización nocturna para evitar cruzar los 700 kWh en este ciclo de facturación.",
        potentialMonthlySavingsDop: jumpCost,
        potentialMonthlySavingsKwh: 25,
        confidenceLevel: "Alto",
        calculationMethod: `Sobrecosto evitado al no pasar de ${referenceMonthlyKwh.toFixed(0)} kWh a 705 kWh en pliego ${schedule.distributor_code}.`,
        dataBasis: latestInvoice
          ? "datos_medidos_factura"
          : "datos_usuario_equipos",
      });
    }
  }

  // 2. Análisis de Aires Acondicionados y Climatización
  const acAppliances = appliances.filter(
    (a) => a.category === "Aires acondicionados"
  );
  if (acAppliances.length > 0) {
    const totalAcKwh = acAppliances.reduce(
      (sum, a) =>
        sum +
        calculateApplianceConsumption(a, billCalc.marginalRateDopPerKwh)
          .monthlyKwh,
      0
    );
    const oneHourLessKwh = acAppliances.reduce((sum, a) => {
      if (a.dailyHours <= 1) return sum;
      const current = calculateApplianceConsumption(
        a,
        billCalc.marginalRateDopPerKwh
      ).monthlyKwh;
      const reduced = calculateApplianceConsumption(
        { ...a, dailyHours: a.dailyHours - 1 },
        billCalc.marginalRateDopPerKwh
      ).monthlyKwh;
      return sum + (current - reduced);
    }, 0);

    if (oneHourLessKwh > 5) {
      const savingsDop = round2(
        oneHourLessKwh * billCalc.marginalRateDopPerKwh
      );
      recommendations.push({
        id: "rec-ac-optimization",
        title: "Optimización de Climatización Nocturna (-1 hora diaria + Termostato a 24°C)",
        severity: "media",
        problemIdentified: `Tus equipos de aire acondicionado consumen aproximadamente ${totalAcKwh.toFixed(0)} kWh al mes.`,
        availableEvidence: `${acAppliances.length} equipo(s) de climatización registrados por el usuario.`,
        suggestedAction:
          "Programar el apagado automático (Sleep/Timer) 1 hora antes de despertar y fijar el termostato en 24°C con abanico de techo de apoyo.",
        potentialMonthlySavingsDop: savingsDop,
        potentialMonthlySavingsKwh: round2(oneHourLessKwh),
        confidenceLevel: "Medio",
        calculationMethod: `Reducción de 1h/día en ${acAppliances.length} A/C = ${oneHourLessKwh.toFixed(1)} kWh/mes × tarifa marginal RD$ ${billCalc.marginalRateDopPerKwh.toFixed(2)}/kWh.`,
        dataBasis: "datos_usuario_equipos",
      });
    }
  }

  // 3. Discrepancia entre Consumo Facturado y Equipos Registrados (Cargas Fantasma o Fugas)
  if (latestInvoice && appliances.length > 0) {
    const billed = latestInvoice.billedKwh.value;
    const diffKwh = billed - estimatedApplianceKwh;
    const diffPercent = billed > 0 ? (Math.abs(diffKwh) / billed) * 100 : 0;

    if (diffKwh > 60 && diffPercent > 15) {
      const unallocatedCostDop = round2(
        diffKwh * billCalc.averageRateDopPerKwh
      );
      recommendations.push({
        id: "rec-unexplained-consumption",
        title: "Consumo Facturado No Explicado por tus Equipos (Posible Fuga o Carga Oculta)",
        severity: "alta",
        problemIdentified: `Tu última factura registra ${billed.toFixed(0)} kWh, pero la suma de tus equipos declarados explica ${estimatedApplianceKwh.toFixed(0)} kWh (una brecha de ${diffKwh.toFixed(0)} kWh/mes).`,
        availableEvidence: `Comparación entre factura confirmada (${billed} kWh) e inventario de ${appliances.length} equipos (${estimatedApplianceKwh.toFixed(0)} kWh).`,
        suggestedAction:
          "Revisar: 1) Flotador de cisterna/tinaco encendiendo la bomba de agua con frecuencia, 2) Gomas de puertas de nevera/freezer vencidas, 3) Calentador de agua encendido 24h o 4) Aterrizaje eléctrico en el panel.",
        potentialMonthlySavingsDop: round2(unallocatedCostDop * 0.5),
        potentialMonthlySavingsKwh: round2(diffKwh * 0.5),
        confidenceLevel: "Alto",
        calculationMethod: `Diferencia neta: ${billed} kWh facturados - ${estimatedApplianceKwh.toFixed(0)} kWh estimados = ${diffKwh.toFixed(0)} kWh sin asignar (potencial recuperable del 50%).`,
        dataBasis: "estimacion_combinada",
      });
    }
  }

  // 4. Incremento inusual entre las últimas dos facturas
  if (latestInvoice && previousInvoice) {
    const deltaKwh =
      latestInvoice.billedKwh.value - previousInvoice.billedKwh.value;
    const pctChange =
      previousInvoice.billedKwh.value > 0
        ? (deltaKwh / previousInvoice.billedKwh.value) * 100
        : 0;

    if (pctChange >= 12) {
      recommendations.push({
        id: "rec-invoice-spike",
        title: "Incremento Significativo Frente al Período Anterior",
        severity: "media",
        problemIdentified: `El consumo facturado subió un ${pctChange.toFixed(1)}% (+${deltaKwh.toFixed(0)} kWh) respecto al ciclo anterior.`,
        availableEvidence: `Paso de ${previousInvoice.billedKwh.value} kWh (${previousInvoice.billingPeriodEnd.value}) a ${latestInvoice.billedKwh.value} kWh (${latestInvoice.billingPeriodEnd.value}).`,
        suggestedAction:
          "Verificar si el período facturado tuvo más de 30 días o si aumentaron las horas de uso de climatización.",
        potentialMonthlySavingsDop: round2(
          deltaKwh * billCalc.marginalRateDopPerKwh
        ),
        potentialMonthlySavingsKwh: round2(deltaKwh),
        confidenceLevel: "Alto",
        calculationMethod: `Variación intermensual medida: (${latestInvoice.billedKwh.value} - ${previousInvoice.billedKwh.value}) kWh × RD$ ${billCalc.marginalRateDopPerKwh.toFixed(2)}/kWh.`,
        dataBasis: "datos_medidos_factura",
      });
    }
  }

  return recommendations;
}

/**
 * Evalúa las alertas configuradas por el usuario contra las métricas reales actuales.
 */
export function evaluateSmartAlerts(
  alertConfigs: AlertConfig[],
  invoices: ElectricityInvoice[],
  appliances: UserAppliance[],
  inverterSystems: InverterBatterySystem[],
  schedule: TariffSchedule
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];
  const enabledConfigs = alertConfigs.filter((c) => c.enabled);

  const sortedInvoices = [...invoices].sort((a, b) =>
    a.billingPeriodEnd.value.localeCompare(b.billingPeriodEnd.value)
  );
  const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
  const prevInvoice =
    sortedInvoices.length >= 2
      ? sortedInvoices[sortedInvoices.length - 2]
      : undefined;

  const applianceMetricsList = appliances.map((a) => ({
    appliance: a,
    metrics: calculateApplianceConsumption(a, 12.5),
  }));
  const totalApplianceKwh = applianceMetricsList.reduce(
    (s, item) => s + item.metrics.monthlyKwh,
    0
  );

  const currentKwh = latestInvoice?.billedKwh.value || totalApplianceKwh;
  const projectedBill = calculateDominicanTariffBill(currentKwh, schedule);

  for (const cfg of enabledConfigs) {
    if (cfg.type === "aumento_consumo" && latestInvoice && prevInvoice) {
      const pct =
        prevInvoice.billedKwh.value > 0
          ? ((latestInvoice.billedKwh.value - prevInvoice.billedKwh.value) /
              prevInvoice.billedKwh.value) *
            100
          : 0;
      if (pct >= cfg.thresholdValue) {
        triggered.push({
          id: `trig-${cfg.id}`,
          type: cfg.type,
          severity: pct > 25 ? "critica" : "advertencia",
          title: "Aumento de Consumo Detectado",
          message: `Tu última factura creció un ${pct.toFixed(1)}% respecto al mes anterior (umbral configurado: ${cfg.thresholdValue}%).`,
          metricValue: `+${pct.toFixed(1)}%`,
          recommendedAction:
            "Revisa el desglose de equipos y los días facturados en el Analizador de Facturas.",
        });
      }
    }

    if (
      cfg.type === "proyeccion_factura_elevada" &&
      projectedBill.totalEstimatedBillDop >= cfg.thresholdValue
    ) {
      triggered.push({
        id: `trig-${cfg.id}`,
        type: cfg.type,
        severity: "critica",
        title: "Proyección Mensual Supera tu Presupuesto",
        message: `La factura proyectada de RD$ ${projectedBill.totalEstimatedBillDop.toLocaleString("es-DO")} supera tu límite alerta de RD$ ${cfg.thresholdValue.toLocaleString("es-DO")}.`,
        metricValue: `RD$ ${projectedBill.totalEstimatedBillDop.toLocaleString("es-DO")}`,
        recommendedAction:
          "Utiliza el Simulador de Ahorro para recortar horas en los 2 equipos de mayor consumo.",
      });
    }

    if (cfg.type === "equipo_consumo_anormal" && totalApplianceKwh > 0) {
      const topItem = [...applianceMetricsList].sort(
        (a, b) => b.metrics.monthlyKwh - a.metrics.monthlyKwh
      )[0];
      if (topItem) {
        const sharePct = (topItem.metrics.monthlyKwh / totalApplianceKwh) * 100;
        if (sharePct >= cfg.thresholdValue) {
          triggered.push({
            id: `trig-${cfg.id}`,
            type: cfg.type,
            severity: "advertencia",
            title: "Concentración Alta en un Solo Equipo",
            message: `"${topItem.appliance.name}" concentra el ${sharePct.toFixed(1)}% del consumo estimado de tus equipos.`,
            metricValue: `${sharePct.toFixed(1)}% (${topItem.metrics.monthlyKwh.toFixed(0)} kWh)`,
            recommendedAction:
              "Evalúa reducir su tiempo diario o migrar a tecnología Inverter.",
          });
        }
      }
    }

    if (
      cfg.type === "objetivo_ahorro_incumplido" &&
      currentKwh >= cfg.thresholdValue
    ) {
      triggered.push({
        id: `trig-${cfg.id}`,
        type: cfg.type,
        severity: currentKwh >= 701 ? "critica" : "advertencia",
        title:
          currentKwh >= 701
            ? "Umbral 701 kWh Superado (Sin Subsidio Escalonado)"
            : "Cercanía al Escalón Crítico de 701 kWh",
        message: `El consumo de referencia (${currentKwh.toFixed(0)} kWh) supera el umbral preventivo de ${cfg.thresholdValue} kWh.`,
        metricValue: `${currentKwh.toFixed(0)} kWh`,
        recommendedAction:
          "Mantener el consumo por debajo de 700 kWh/mes preserva los bloques subsidiados BTS-1.",
      });
    }

    if (cfg.type === "baja_autonomia_inversor" && inverterSystems.length > 0) {
      const criticalLoadW = appliances
        .filter((a) => a.isCriticalBackupLoad)
        .reduce(
          (s, a) => s + a.nominalWatts * a.quantity * a.dutyCycleFactor,
          0
        );
      const firstSys = inverterSystems[0];
      const autonomy = calculateInverterAutonomy(
        firstSys,
        criticalLoadW || 450
      );
      if (
        autonomy.estimatedAutonomyHours > 0 &&
        autonomy.estimatedAutonomyHours < cfg.thresholdValue
      ) {
        triggered.push({
          id: `trig-${cfg.id}`,
          type: cfg.type,
          severity: "advertencia",
          title: "Autonomía de Respaldo Inferior a la Meta",
          message: `Tu inversor "${firstSys.name}" ofrece ${autonomy.estimatedAutonomyFormatted} ante apagones (meta mínima: ${cfg.thresholdValue}h).`,
          metricValue: autonomy.estimatedAutonomyFormatted,
          recommendedAction:
            "Desconecta cargas no esenciales del circuito de respaldo o considera ampliar el banco de baterías.",
        });
      }
    }
  }

  return triggered;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

