"use client";

import React, { useMemo, useState } from "react";
import { BatteryCharging, Plus, Sun, Trash2 } from "lucide-react";
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

  const criticalAppliancesLoadW = useMemo(() => {
    const sum = appliances
      .filter((a) => a.isCriticalBackupLoad)
      .reduce(
        (acc, a) => acc + a.nominalWatts * a.quantity * a.dutyCycleFactor,
        0
      );
    return Math.round(sum);
  }, [appliances]);

  const [simulatedBlackoutWatts, setSimulatedBlackoutWatts] = useState<number>(
    criticalAppliancesLoadW > 0 ? criticalAppliancesLoadW : 480
  );

  const [invName, setInvName] = useState("Inversor Principal Residencial");
  const [invBrand] = useState("Trace / Xantrex");
  const [invPowerW, setInvPowerW] = useState(3600);
  const [batType, setBatType] =
    useState<InverterBatterySystem["batteryType"]>("lead_acid_flooded");
  const [batVoltageV, setBatVoltageV] = useState(24);
  const [batCapacityAh] = useState(225);
  const [batCount] = useState(4);
  const [socPercent] = useState(95);

  const solarReport = useMemo(
    () => simulateDominicanSolarSystem(solarInput),
    [solarInput]
  );

  function handleAddFromCatalog(
    preset: (typeof RD_INVERTER_BATTERY_LIBRARY)[number]
  ) {
    const totalWh =
      preset.batteryType === "lifepo4"
        ? preset.batteryVoltageV *
          preset.batteryCapacityAh *
          preset.batteryCount
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
      inverterModel: "Estándar",
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
      {/* SIMULADOR SOLAR */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEE75C]/20 text-[#FEE75C] flex items-center justify-center">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-xl sm:text-2xl text-white">
                ☀️ Simulador de Paneles Solares en RD
              </h2>
              <p className="text-xs text-[#B5BAC1]">
                Calculado con la radiación solar real de {solarInput.province} (
                {solarReport.provinceHsp} Horas Solares Pico)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-5 rounded-3xl bg-[#1E1F22] border border-white/5">
          <div>
            <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
              Consumo Mensual (kWh)
            </label>
            <input
              type="number"
              min={50}
              value={solarInput.monthlyKwh}
              onChange={(e) =>
                setSolarInput({
                  ...solarInput,
                  monthlyKwh: parseFloat(e.target.value) || 100,
                })
              }
              className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs font-black text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
              Factura Promedio (RD$)
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
              className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs font-black text-[#57F287]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
              Provincia en RD
            </label>
            <select
              value={solarInput.province}
              onChange={(e) =>
                setSolarInput({ ...solarInput, province: e.target.value })
              }
              className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs text-white"
            >
              {Object.keys(RD_PROVINCES_SOLAR_HSP).map((prov) => (
                <option key={prov} value={prov}>
                  {prov} ({RD_PROVINCES_SOLAR_HSP[prov].hsp} HSP)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
              Tipo de Sistema
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
              className="w-full rounded-2xl bg-[#2B2D31] border border-white/10 px-3.5 py-2.5 text-xs text-white"
            >
              <option value="on_grid_net_metering">
                Medición Neta (Sin baterías)
              </option>
              <option value="hibrido_con_baterias">
                Híbrido (Con baterías de Litio)
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {solarReport.scenarios.map((sc) => (
            <div
              key={sc.scenarioLabel}
              className={`p-6 rounded-3xl flex flex-col justify-between ${
                sc.scenarioLabel === "Intermedio"
                  ? "bg-[#1E1F22] border-2 border-[#5865F2] shadow-xl"
                  : "bg-[#1E1F22] border border-white/5"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#5865F2]">
                    Escenario {sc.scenarioLabel}
                  </span>
                  <span className="text-xs font-bold text-[#FEE75C]">
                    Cubre {sc.coveragePercent}%
                  </span>
                </div>

                <div className="text-3xl font-black text-white">
                  {sc.recommendedKwPeak} kWp
                </div>
                <div className="text-xs font-medium text-[#B5BAC1] mb-4">
                  {sc.estimatedPanelsCount} paneles solares de{" "}
                  {sc.panelWattsEach}W · Techo: {sc.requiredRoofAreaM2} m²
                </div>

                <div className="space-y-2 text-xs pt-3 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-[#B5BAC1]">Producción mensual:</span>
                    <strong className="text-white">
                      {sc.monthlyGenerationKwh} kWh/mes
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B5BAC1]">Inversión estimada:</span>
                    <strong className="text-white">
                      RD$ {sc.estimatedInvestmentDop.toLocaleString("es-DO")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B5BAC1]">Ahorro mensual:</span>
                    <strong className="text-[#57F287]">
                      RD$ {sc.monthlySavingsDop.toLocaleString("es-DO")}/mes
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[#B5BAC1]">
                  Retorno:{" "}
                  <strong className="text-white">{sc.paybackYears} años</strong>
                </span>
                <span className="font-black text-[#FEE75C]">
                  ROI 10 años: +{sc.roi10YearsPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INVERSORES Y BATERÍAS */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EB459E]/20 text-[#EB459E] flex items-center justify-center">
            <BatteryCharging className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-xl sm:text-2xl text-white">
              🔋 Inversores y Respaldo en Apagones
            </h2>
            <p className="text-xs text-[#B5BAC1]">
              Simula cuántas horas te duran las baterías según los equipos que
              dejes encendidos
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#1E1F22] border border-white/5 mb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-bold text-white">
              Carga conectada durante el apagón:{" "}
              <strong className="text-[#57F287]">
                {simulatedBlackoutWatts} Watts
              </strong>
            </span>
            {criticalAppliancesLoadW > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSimulatedBlackoutWatts(criticalAppliancesLoadW)
                }
                className="text-xs font-extrabold text-[#FEE75C] hover:underline cursor-pointer"
              >
                Usar mis equipos en inversor ({criticalAppliancesLoadW} W)
              </button>
            )}
          </div>
          <input
            type="range"
            min={100}
            max={4000}
            step={25}
            value={simulatedBlackoutWatts}
            onChange={(e) =>
              setSimulatedBlackoutWatts(parseInt(e.target.value, 10))
            }
            className="w-full accent-[#EB459E] cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {inverterSystems.map((sys) => {
              const aut = calculateInverterAutonomy(
                sys,
                simulatedBlackoutWatts
              );
              return (
                <div
                  key={sys.id}
                  className="p-6 rounded-3xl bg-[#1E1F22] border border-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-black text-base text-white">
                        {sys.name}
                      </span>
                      <p className="text-xs text-[#B5BAC1] mt-0.5">
                        {sys.inverterBrand} ({sys.inverterPowerW}W) ·{" "}
                        {sys.batteryBrand} ({sys.batteryVoltageV}V)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-[#B5BAC1]">
                          Autonomía estimada
                        </div>
                        <div className="text-2xl font-black text-[#57F287]">
                          {aut.estimatedAutonomyFormatted}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteInverterSystem(sys.id)}
                        className="p-2 rounded-full text-[#B5BAC1] hover:text-[#F23F43] hover:bg-[#F23F43]/15 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {RD_INVERTER_BATTERY_LIBRARY.map((preset) => (
                <div
                  key={preset.id}
                  className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="font-extrabold text-xs text-white">
                      {preset.brand} — {preset.model}
                    </div>
                    <p className="text-[11px] text-[#B5BAC1] mt-1">
                      {preset.note}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(preset)}
                    className="mt-3 py-2 rounded-xl bg-[#2B2D31] hover:bg-[#5865F2] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Cargar este sistema
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateCustomInverter}
            className="p-6 rounded-3xl bg-[#1E1F22] border border-white/5 space-y-3.5 h-fit"
          >
            <h4 className="font-black text-base text-white">
              + Registrar Mi Inversor
            </h4>
            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                className="w-full rounded-xl bg-[#2B2D31] border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                  Potencia (W)
                </label>
                <input
                  type="number"
                  value={invPowerW}
                  onChange={(e) =>
                    setInvPowerW(parseInt(e.target.value, 10) || 1500)
                  }
                  className="w-full rounded-xl bg-[#2B2D31] border border-white/10 px-3 py-2 text-xs font-black text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                  Voltaje
                </label>
                <select
                  value={batVoltageV}
                  onChange={(e) =>
                    setBatVoltageV(parseInt(e.target.value, 10))
                  }
                  className="w-full rounded-xl bg-[#2B2D31] border border-white/10 px-3 py-2 text-xs text-white"
                >
                  <option value={12}>12 V</option>
                  <option value={24}>24 V</option>
                  <option value={48}>48 V</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#B5BAC1] mb-1">
                Tipo de Baterías
              </label>
              <select
                value={batType}
                onChange={(e) =>
                  setBatType(
                    e.target.value as InverterBatterySystem["batteryType"]
                  )
                }
                className="w-full rounded-xl bg-[#2B2D31] border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="lead_acid_flooded">
                  Plomo-Ácido (Trojan / Ciclo Profundo)
                </option>
                <option value="agm_gel">AGM / Gel Selladas</option>
                <option value="lifepo4">Litio LiFePO4</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs transition cursor-pointer"
            >
              Guardar Inversor
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
