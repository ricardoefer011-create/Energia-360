"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Compass,
  Info,
  Plus,
  ShieldAlert,
  Sun,
  Trash2,
  Zap,
} from "lucide-react";
import {
  InverterBatterySystem,
  PropertyType,
  SolarSimulationInput,
  UserAppliance,
} from "@/types/energia360";
import {
  RD_INVERTER_BATTERY_LIBRARY,
  RD_PROVINCES_SOLAR_HSP,
} from "@/lib/data/rd-energy-catalog";
import {
  calculateInverterAutonomy,
  simulateDominicanSolarSystem,
} from "@/lib/engine/energy-engine";

interface SolarAndInverterModuleProps {
  defaultMonthlyKwh: number;
  defaultMonthlyBillDop: number;
  defaultProvince: string;
  defaultPropertyType: PropertyType;
  appliances: UserAppliance[];
  inverterSystems: InverterBatterySystem[];
  onAddInverterSystem: (system: InverterBatterySystem) => void;
  onDeleteInverterSystem: (id: string) => void;
}

export function SolarAndInverterModule({
  defaultMonthlyKwh,
  defaultMonthlyBillDop,
  defaultProvince,
  defaultPropertyType,
  appliances,
  inverterSystems,
  onAddInverterSystem,
  onDeleteInverterSystem,
}: SolarAndInverterModuleProps) {
  // Estado para MÓDULO F: Simulador Solar
  const [solarInput, setSolarInput] = useState<SolarSimulationInput>({
    monthlyKwh: Math.max(250, Math.round(defaultMonthlyKwh || 580)),
    averageMonthlyBillDop: Math.max(
      2500,
      Math.round(defaultMonthlyBillDop || 6200)
    ),
    province: defaultProvince || "Santo Domingo",
    propertyType: defaultPropertyType || "hogar",
    availableRoofAreaM2: 45,
    roofOrientation: "Sur",
    installationType: "on_grid_net_metering",
    availableBudgetDop: 320000,
    targetCoveragePercent: 95,
    desiredAutonomyHours: 6,
    systemLossFactor: 0.22,
  });

  // Estado para MÓDULO G: Inversores y Baterías
  const criticalAppliancesLoadW = useMemo(() => {
    const sum = appliances
      .filter((a) => a.isCriticalBackupLoad)
      .reduce((acc, a) => acc + a.nominalWatts * a.quantity * a.dutyCycleFactor, 0);
    return Math.round(sum);
  }, [appliances]);

  const [simulatedBlackoutWatts, setSimulatedBlackoutWatts] = useState<number>(
    criticalAppliancesLoadW > 0 ? criticalAppliancesLoadW : 480
  );

  // Formulario nuevo inversor
  const [invName, setInvName] = useState("Inversor Principal Residencial");
  const [invBrand, setInvBrand] = useState("Trace / Xantrex");
  const [invModel, setInvModel] = useState("SW 3.6kW 24V");
  const [invPowerW, setInvPowerW] = useState(3600);
  const [batType, setBatType] =
    useState<InverterBatterySystem["batteryType"]>("lead_acid_flooded");
  const [batVoltageV, setBatVoltageV] = useState(24);
  const [batCapacityAh, setBatCapacityAh] = useState(225);
  const [batCount, setBatCount] = useState(4);
  const [socPercent, setSocPercent] = useState(95);

  const solarReport = useMemo(
    () => simulateDominicanSolarSystem(solarInput),
    [solarInput]
  );

  function handleAddFromCatalog(
    preset: (typeof RD_INVERTER_BATTERY_LIBRARY)[number]
  ) {
    const totalWh =
      preset.batteryType === "lifepo4"
        ? preset.batteryVoltageV * preset.batteryCapacityAh * preset.batteryCount
        : preset.batteryVoltageV * preset.batteryCapacityAh;

    const newSys: InverterBatterySystem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: `${preset.brand} — ${preset.model}`,
      inverterBrand: preset.brand,
      inverterModel: preset.model,
      inverterPowerW: preset.inverterPowerW,
      inverterEfficiency: preset.inverterEfficiency,
      batteryBrand: preset.batteryBrand,
      batteryType: preset.batteryType,
      batteryVoltageV: preset.batteryVoltageV,
      batteryCapacityAh: preset.batteryCapacityAh,
      batteryCount: preset.batteryCount,
      totalBatteryCapacityWh: totalWh,
      usableDodFraction: preset.usableDodFraction,
      currentStateOfChargePercent: 95,
      installedPanelsCount: 0,
      installedSolarKw: 0,
      installationDate: new Date().toISOString().slice(0, 10),
      observations: preset.note,
    };
    onAddInverterSystem(newSys);
  }

  function handleCreateCustomInverter(e: React.FormEvent) {
    e.preventDefault();
    const dod =
      batType === "lifepo4" ? 0.85 : batType === "agm_gel" ? 0.6 : 0.5;
    const totalWh = batVoltageV * batCapacityAh;

    const newSys: InverterBatterySystem = {
      id: `inv-${Date.now()}`,
      name: invName.trim() || "Sistema de Respaldo",
      inverterBrand: invBrand.trim() || "Genérico",
      inverterModel: invModel.trim() || "Estándar",
      inverterPowerW: Number(invPowerW),
      inverterEfficiency: batType === "lifepo4" ? 0.92 : 0.86,
      batteryBrand:
        batType === "lifepo4" ? "Litio LiFePO4" : "Ciclo Profundo Plomo-Ácido",
      batteryType: batType,
      batteryVoltageV: Number(batVoltageV),
      batteryCapacityAh: Number(batCapacityAh),
      batteryCount: Number(batCount),
      totalBatteryCapacityWh: totalWh,
      usableDodFraction: dod,
      currentStateOfChargePercent: Number(socPercent),
      installedPanelsCount: 0,
      installedSolarKw: 0,
      installationDate: new Date().toISOString().slice(0, 10),
    };
    onAddInverterSystem(newSys);
  }

  return (
    <div className="space-y-8">
      {/* =====================================================================
          MÓDULO F: SIMULADOR SOLAR FOTOVOLTAICO (REPÚBLICA DOMINICANA)
         ===================================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Simulador Solar Fotovoltaico para República Dominicana
              </h3>
              <p className="text-xs text-slate-400">
                Evalúa potencia recomendada (kWp), paneles, área de techo,
                inversión y retorno utilizando Horas Solares Pico (HSP) por
                provincia.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
            HSP {solarInput.province}: {solarReport.provinceHsp} h/día
          </span>
        </div>

        {/* Parámetros de entrada del Simulador Solar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Consumo Mensual (kWh)
            </label>
            <input
              type="number"
              min={50}
              max={50000}
              value={solarInput.monthlyKwh}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  monthlyKwh: parseFloat(e.target.value) || 100,
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Factura Promedio Mensual (RD$)
            </label>
            <input
              type="number"
              min={500}
              value={solarInput.averageMonthlyBillDop}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  averageMonthlyBillDop: parseFloat(e.target.value) || 1000,
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-emerald-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Provincia / Zona Climática RD
            </label>
            <select
              value={solarInput.province}
              onChange={(e) =>
                setSolarInput({ ...solarInput, province: e.target.value })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              {Object.keys(RD_PROVINCES_SOLAR_HSP).map((prov) => (
                <option key={prov} value={prov}>
                  {prov} ({RD_PROVINCES_SOLAR_HSP[prov].hsp} HSP)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Tipo de Instalación Solar
            </label>
            <select
              value={solarInput.installationType}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  installationType:
                    e.target.value as SolarSimulationInput["installationType"],
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value="on_grid_net_metering">
                Interconectado a Red (Medición Neta SIE sin baterías)
              </option>
              <option value="hibrido_con_baterias">
                Híbrido (Medición Neta + Baterías de Litio para Apagones)
              </option>
              <option value="off_grid_aislado">
                Aislado de la Red (Off-Grid Autónomo)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Área de Techo Disponible (m²)
            </label>
            <input
              type="number"
              min={5}
              max={5000}
              value={solarInput.availableRoofAreaM2}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  availableRoofAreaM2: parseFloat(e.target.value) || 10,
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Orientación del Techo
            </label>
            <select
              value={solarInput.roofOrientation}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  roofOrientation:
                    e.target.value as SolarSimulationInput["roofOrientation"],
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value="Sur">Sur (Óptima en República Dominicana)</option>
              <option value="Techo Plano">
                Losa de Hormigón Plana (Estructura inclinada)
              </option>
              <option value="Sureste/Suroeste">Sureste / Suroeste</option>
              <option value="Este/Oeste">Este / Oeste</option>
              <option value="No conocida">No conocida</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Cobertura Energética Deseada ({solarInput.targetCoveragePercent}%)
            </label>
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={solarInput.targetCoveragePercent}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  targetCoveragePercent: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-amber-400 cursor-pointer mt-2"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Pérdidas del Sistema ({Math.round(solarInput.systemLossFactor * 100)}
              %)
            </label>
            <select
              value={solarInput.systemLossFactor}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  systemLossFactor: parseFloat(e.target.value),
                })
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value={0.18}>18% (Techo ventilado sin sombras)</option>
              <option value={0.22}>
                22% (Estándar térmico tropical RD recomendado)
              </option>
              <option value={0.27}>
                27% (Sombras parciales o polvo urbano elevado)
              </option>
            </select>
          </div>
        </div>

        {/* 3 Escenarios Solares: Conservador, Intermedio, Optimista */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {solarReport.scenarios.map((sc) => (
            <div
              key={sc.scenarioLabel}
              className={`rounded-2xl border p-5 flex flex-col justify-between ${
                sc.scenarioLabel === "Intermedio"
                  ? "border-amber-500/60 bg-slate-950/95 shadow-lg"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-amber-400">
                    Escenario {sc.scenarioLabel}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    PR: {(sc.performanceRatio * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="text-2xl font-extrabold text-slate-100 mb-1">
                  {sc.recommendedKwPeak} kWp{" "}
                  <span className="text-sm font-medium text-sky-400">
                    ({sc.estimatedPanelsCount} paneles de {sc.panelWattsEach}W)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Generación estimada:{" "}
                  <strong className="text-slate-200">
                    {sc.monthlyGenerationKwh} kWh/mes
                  </strong>{" "}
                  ({sc.coveragePercent}% de tu consumo)
                </p>

                <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Área de techo requerida:</span>
                    <span
                      className={`font-semibold ${
                        sc.roofSpaceSufficient
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {sc.requiredRoofAreaM2} m²{" "}
                      {sc.roofSpaceSufficient
                        ? "(Espacio suficiente)"
                        : "(Supera tu techo)"}
                    </span>
                  </div>
                  {sc.recommendedBatteryKwh > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Banco de Litio sugerido:
                      </span>
                      <span className="font-semibold text-indigo-300">
                        {sc.recommendedBatteryKwh} kWh LiFePO4
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inversión estimada RD$:</span>
                    <span className="font-bold text-slate-100">
                      RD$ {sc.estimatedInvestmentDop.toLocaleString("es-DO")}
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
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span>
                  Recuperación:{" "}
                  <strong className="text-amber-300">
                    {sc.paybackYears} años
                  </strong>
                </span>
                <span>
                  ROI a 10 años:{" "}
                  <strong className="text-emerald-400">
                    +{sc.roi10YearsPercent}%
                  </strong>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Nota de ingeniería obligatoria */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">
            Fórmula científica aplicada: {solarReport.formulaExplanation}
          </div>
          <div>
            <strong>Contexto climático ({solarReport.regionName}):</strong>{" "}
            {solarReport.climateNote}
          </div>
          <div className="text-[11px] text-amber-300/90">
            {solarReport.engineeringDisclaimer}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MÓDULO G: INVERSORES Y BATERÍAS (AUTONOMÍA EN APAGONES)
         ===================================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Gestión de Inversores, Baterías y Autonomía ante Apagones
              </h3>
              <p className="text-xs text-slate-400">
                Calcula el tiempo real de respaldo según la química de tus
                baterías (Plomo-Ácido vs Litio LiFePO4), Profundidad de Descarga
                (DoD) y demanda en Watts. Sin conexiones simuladas falsas.
              </p>
            </div>
          </div>
        </div>

        {/* Simulador de Demanda durante el Apagón */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">
                Demanda Eléctrica Conectada Durante el Apagón:{" "}
                <strong className="text-sky-400">
                  {simulatedBlackoutWatts} Watts
                </strong>
              </span>
              {criticalAppliancesLoadW > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedBlackoutWatts(criticalAppliancesLoadW)
                  }
                  className="text-sky-400 hover:underline"
                >
                  Usar suma de mis equipos críticos ({criticalAppliancesLoadW} W)
                </button>
              )}
            </div>
            <input
              type="range"
              min={100}
              max={4500}
              step={25}
              value={simulatedBlackoutWatts}
              onChange={(e) =>
                setSimulatedBlackoutWatts(parseInt(e.target.value, 10))
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>150W (Router + Bombillos LED + 1 Abanico)</span>
              <span>550W (+ Nevera + TV + Laptop)</span>
              <span>1,800W (+ 1 Aire Inverter)</span>
            </div>
          </div>
        </div>

        {/* Lista de Sistemas de Inversor Registrados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-sm text-slate-200">
              Sistemas de Respaldo Registrados ({inverterSystems.length})
            </h4>

            {inverterSystems.length > 0 ? (
              inverterSystems.map((sys) => {
                const aut = calculateInverterAutonomy(
                  sys,
                  simulatedBlackoutWatts
                );
                return (
                  <div
                    key={sys.id}
                    className="p-5 rounded-xl border border-slate-800 bg-slate-950/85 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-100">
                            {sys.name}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              aut.compatibilityStatus === "Óptimo"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : aut.compatibilityStatus === "Carga Elevada"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {aut.compatibilityStatus} ({aut.inverterLoadPercent}%
                            del inversor)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Inversor: {sys.inverterBrand} {sys.inverterModel} (
                          {sys.inverterPowerW} W) · Banco: {sys.batteryBrand} (
                          {sys.batteryVoltageV}V / {sys.batteryCapacityAh}Ah · DoD{" "}
                          {(sys.usableDodFraction * 100).toFixed(0)}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">
                            Tiempo Estimado de Respaldo
                          </div>
                          <div className="text-2xl font-extrabold text-indigo-400">
                            {aut.estimatedAutonomyFormatted}
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteInverterSystem(sys.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Eliminar sistema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-800/80">
                      <div className="p-2.5 rounded-lg bg-slate-900/80">
                        <span className="text-slate-400 block text-[11px]">
                          Capacidad Nominal Total
                        </span>
                        <strong className="text-slate-200">
                          {aut.nominalCapacityWh.toLocaleString("es-DO")} Wh
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80">
                        <span className="text-slate-400 block text-[11px]">
                          Energía Útil Segura (AC)
                        </span>
                        <strong className="text-emerald-400">
                          {aut.usableCapacityWh.toLocaleString("es-DO")} Wh
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80">
                        <span className="text-slate-400 block text-[11px]">
                          Extracción desde Baterías (DC)
                        </span>
                        <strong className="text-sky-400">
                          {aut.dcPowerDrawWatts} W (
                          {(aut.dcPowerDrawWatts / sys.batteryVoltageV).toFixed(
                            1
                          )}{" "}
                          Amperios)
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {aut.explanation}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-400 text-center">
                No has registrado un inversor todavía. Elige un modelo habitual
                del catálogo de República Dominicana abajo o regístralo a la
                derecha.
              </div>
            )}

            {/* Biblioteca de Inversores comunes en RD */}
            <div className="pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                Biblioteca de Inversores y Bancos de Baterías Comunes en RD
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RD_INVERTER_BATTERY_LIBRARY.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-100">
                        {preset.brand} — {preset.model}
                      </div>
                      <div className="text-[11px] text-indigo-400 mt-0.5">
                        {preset.inverterPowerW}W · {preset.batteryBrand} (
                        {preset.batteryVoltageV}V)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {preset.note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFromCatalog(preset)}
                      className="mt-3 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium inline-flex items-center justify-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Usar esta configuración
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formulario Personalizado de Inversor y Baterías */}
          <form
            onSubmit={handleCreateCustomInverter}
            className="rounded-xl border border-slate-800 bg-slate-950/85 p-5 space-y-3 h-fit"
          >
            <h4 className="font-bold text-sm text-slate-100">
              Registrar Mi Propio Inversor / Baterías
            </h4>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nombre de la instalación
              </label>
              <input
                type="text"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Marca Inversor
                </label>
                <input
                  type="text"
                  value={invBrand}
                  onChange={(e) => setInvBrand(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Potencia (Watts)
                </label>
                <input
                  type="number"
                  min={500}
                  max={30000}
                  value={invPowerW}
                  onChange={(e) =>
                    setInvPowerW(parseInt(e.target.value, 10) || 1500)
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Tecnología del Banco de Baterías
              </label>
              <select
                value={batType}
                onChange={(e) =>
                  setBatType(
                    e.target.value as InverterBatterySystem["batteryType"]
                  )
                }
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="lead_acid_flooded">
                  Plomo-Ácido Ciclo Profundo (Trojan / US Battery - DoD 50%)
                </option>
                <option value="agm_gel">
                  Selladas AGM / Gel Libre Mantenimiento (DoD 60%)
                </option>
                <option value="lifepo4">
                  Litio Ferrofosfato LiFePO4 (DoD 85%+)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Voltaje Banco
                </label>
                <select
                  value={batVoltageV}
                  onChange={(e) =>
                    setBatVoltageV(parseInt(e.target.value, 10))
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-2 text-xs text-slate-100"
                >
                  <option value={12}>12 V</option>
                  <option value={24}>24 V</option>
                  <option value={48}>48 V</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Capacidad (Ah)
                </label>
                <input
                  type="number"
                  min={20}
                  max={2000}
                  value={batCapacityAh}
                  onChange={(e) =>
                    setBatCapacityAh(parseInt(e.target.value, 10) || 100)
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  N.º Baterías
                </label>
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={batCount}
                  onChange={(e) =>
                    setBatCount(parseInt(e.target.value, 10) || 2)
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Estado de Carga Actual Estimado ({socPercent}%)
              </label>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={socPercent}
                onChange={(e) => setSocPercent(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Guardar Sistema de Respaldo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

