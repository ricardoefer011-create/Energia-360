"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  Plus,
  Sliders,
  Trash2,
} from "lucide-react";
import {
  ApplianceCategory,
  TariffSchedule,
  UserAppliance,
} from "@/types/energia360";
import {
  CatalogApplianceTemplate,
  RD_APPLIANCE_LIBRARY,
} from "@/lib/data/rd-energy-catalog";
import {
  calculateApplianceConsumption,
  calculateDominicanTariffBill,
} from "@/lib/engine/energy-engine";

interface ApplianceCalculatorModuleProps {
  appliances: UserAppliance[];
  activeSchedule: TariffSchedule;
  customRateDopPerKwh: number | null;
  onAddAppliance: (appliance: UserAppliance) => void;
  onUpdateApplianceHours: (id: string, dailyHours: number) => void;
  onDeleteAppliance: (id: string) => void;
}

const APPLIANCE_CATEGORIES: ApplianceCategory[] = [
  "Aires acondicionados",
  "Neveras",
  "Congeladores",
  "Televisores",
  "Lavadoras",
  "Secadoras",
  "Bombas de agua",
  "Microondas",
  "Estufas eléctricas",
  "Computadoras",
  "Iluminación",
  "Ventiladores",
  "Calentadores",
  "Equipos comerciales",
  "Otros",
];

export function ApplianceCalculatorModule({
  appliances,
  activeSchedule,
  customRateDopPerKwh,
  onAddAppliance,
  onUpdateApplianceHours,
  onDeleteAppliance,
}: ApplianceCalculatorModuleProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("Todas");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ApplianceCategory>(
    "Aires acondicionados"
  );
  const [brand, setBrand] = useState("");
  const [nominalWatts, setNominalWatts] = useState<number>(1050);
  const [dutyCycleFactor, setDutyCycleFactor] = useState<number>(0.65);
  const [quantity, setQuantity] = useState<number>(1);
  const [dailyHours, setDailyHours] = useState<number>(8);
  const [monthlyDays, setMonthlyDays] = useState<number>(30);
  const [isCriticalBackupLoad, setIsCriticalBackupLoad] =
    useState<boolean>(false);

  const totalEstimatedKwh = useMemo(() => {
    return appliances.reduce((sum, a) => {
      const m = calculateApplianceConsumption(a, 10);
      return sum + m.monthlyKwh;
    }, 0);
  }, [appliances]);

  const billResult = useMemo(
    () =>
      calculateDominicanTariffBill(
        totalEstimatedKwh,
        activeSchedule,
        customRateDopPerKwh
      ),
    [totalEstimatedKwh, activeSchedule, customRateDopPerKwh]
  );

  function handleAddFromTemplate(tpl: CatalogApplianceTemplate) {
    const newApp: UserAppliance = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: tpl.name,
      category: tpl.category,
      brand: tpl.brand,
      model: tpl.model,
      nominalWatts: tpl.nominalWatts,
      dutyCycleFactor: tpl.dutyCycleFactor,
      quantity: 1,
      dailyHours: tpl.defaultDailyHours,
      monthlyDays: tpl.defaultMonthlyDays,
      efficiencyRating: tpl.efficiencyRating,
      isCriticalBackupLoad: tpl.isCriticalBackupLoad,
      isNighttimeHeavy: tpl.isNighttimeHeavy,
      provenance: "biblioteca_orientativa",
      observations: tpl.rdNote,
    };
    onAddAppliance(newApp);
  }

  function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || nominalWatts <= 0) return;

    const newApp: UserAppliance = {
      id: `app-${Date.now()}`,
      name: name.trim(),
      category,
      brand: brand.trim() || "Personalizado",
      model: "Estándar",
      nominalWatts: Number(nominalWatts),
      dutyCycleFactor: Number(dutyCycleFactor),
      quantity: Number(quantity),
      dailyHours: Number(dailyHours),
      monthlyDays: Number(monthlyDays),
      efficiencyRating:
        dutyCycleFactor <= 0.65 ? "Alta Eficiencia (Inverter)" : "Estándar",
      isCriticalBackupLoad,
      isNighttimeHeavy: category === "Aires acondicionados",
      provenance: "introducido_usuario",
    };

    onAddAppliance(newApp);
    setName("");
  }

  const filteredTemplates =
    selectedCategoryFilter === "Todas"
      ? RD_APPLIANCE_LIBRARY
      : RD_APPLIANCE_LIBRARY.filter(
          (t) => t.category === selectedCategoryFilter
        );

  return (
    <div className="space-y-6">
      {/* Resumen Principal */}
      <div className="apple-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">
            Calculadora Interactiva de Equipos
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-1">
            {totalEstimatedKwh.toFixed(0)} kWh/mes &middot;{" "}
            <span className="text-[#0071E3]">
              RD${" "}
              {billResult.totalEstimatedBillDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </h2>
          <p className="text-xs text-[#6E6E73] mt-1">
            Desliza las horas de cualquier equipo abajo para ver cómo cambia tu
            factura mensual en {activeSchedule.distributor_code}.
          </p>
        </div>

        {billResult.lostStepSubsidy701 && (
          <div className="p-4 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#C92A2A] max-w-md flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              <strong>Escalón 701 kWh superado:</strong> Estás pagando{" "}
              <strong>
                RD$ {billResult.subsidyLossPenaltyDop.toLocaleString("es-DO")}
              </strong>{" "}
              extra por pérdida del subsidio escalonado. Reduce horas abajo para
              bajar de 700 kWh.
            </span>
          </div>
        )}
      </div>

      {/* Inventario Activo con Sliders estilo Apple */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 apple-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0071E3]" />
              <h3 className="font-bold text-lg text-[#1D1D1F]">
                Mis Equipos ({appliances.length})
              </h3>
            </div>
            <span className="text-xs text-[#6E6E73]">
              Ajusta las horas diarias con la barra
            </span>
          </div>

          {appliances.length > 0 ? (
            <div className="space-y-3.5">
              {appliances.map((app) => {
                const metrics = calculateApplianceConsumption(
                  app,
                  billResult.averageRateDopPerKwh
                );
                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-3xl bg-[#F5F5F7] border border-black/[0.04]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-[#1D1D1F]">
                            {app.name}
                          </span>
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-[#6E6E73]">
                            {app.category}
                          </span>
                          {app.isCriticalBackupLoad && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#5856D6]/12 text-[#5856D6] inline-flex items-center gap-1">
                              <BatteryCharging className="w-3 h-3" /> En Inversor
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6E6E73] mt-1">
                          {app.nominalWatts} W × {app.quantity} und ·{" "}
                          {metrics.monthlyKwh} kWh/mes
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-base font-bold text-[#1D1D1F]">
                            RD${" "}
                            {metrics.estimatedMonthlyCostDop.toLocaleString(
                              "es-DO"
                            )}
                            <span className="text-xs font-normal text-[#6E6E73]">
                              /mes
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteAppliance(app.id)}
                          className="p-2 rounded-full text-[#6E6E73] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center gap-4">
                      <span className="text-xs font-semibold text-[#1D1D1F] whitespace-nowrap w-28">
                        Uso: {app.dailyHours} h/día
                      </span>
                      <input
                        type="range"
                        min={0.5}
                        max={24}
                        step={0.5}
                        value={app.dailyHours}
                        onChange={(e) =>
                          onUpdateApplianceHours(
                            app.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full accent-[#0071E3]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-[#6E6E73]">
              Aún no tienes equipos registrados. Elige cualquiera de la
              biblioteca de abajo o crea uno a la derecha.
            </div>
          )}
        </div>

        {/* Formulario de Nuevo Equipo */}
        <form
          onSubmit={handleCreateCustom}
          className="apple-card p-6 sm:p-7 space-y-4 h-fit"
        >
          <h3 className="font-bold text-lg text-[#1D1D1F]">
            Agregar Equipo Personalizado
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
              Nombre del equipo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aire Acondicionado Habitación"
              className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs text-[#1D1D1F]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ApplianceCategory)}
              className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs text-[#1D1D1F]"
            >
              {APPLIANCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                Potencia (Watts)
              </label>
              <input
                type="number"
                min={1}
                required
                value={nominalWatts}
                onChange={(e) =>
                  setNominalWatts(parseInt(e.target.value, 10) || 0)
                }
                className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs font-bold text-[#1D1D1F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs text-[#1D1D1F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                Horas al día
              </label>
              <input
                type="number"
                min={0.5}
                max={24}
                step="0.5"
                required
                value={dailyHours}
                onChange={(e) =>
                  setDailyHours(parseFloat(e.target.value) || 1)
                }
                className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3.5 py-2.5 text-xs text-[#1D1D1F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1">
                Tecnología
              </label>
              <select
                value={dutyCycleFactor}
                onChange={(e) =>
                  setDutyCycleFactor(parseFloat(e.target.value))
                }
                className="w-full rounded-2xl bg-[#F5F5F7] border border-black/10 px-3 py-2.5 text-xs text-[#1D1D1F]"
              >
                <option value={0.62}>Inverter (Ahorrador)</option>
                <option value={0.85}>Convencional</option>
                <option value={1}>Continuo (Abanico / Luz)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#1D1D1F] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isCriticalBackupLoad}
              onChange={(e) => setIsCriticalBackupLoad(e.target.checked)}
              className="rounded accent-[#0071E3]"
            />
            <span>Conectar al inversor en apagones</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs sm:text-sm transition"
          >
            Guardar Equipo
          </button>
        </form>
      </div>

      {/* Biblioteca de Equipos Habituales en RD */}
      <div className="apple-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-lg text-[#1D1D1F]">
              Catálogo Rápido de Equipos en República Dominicana
            </h3>
            <p className="text-xs text-[#6E6E73]">
              Toca cualquier equipo para añadirlo en 1 clic a tu lista
            </p>
          </div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-full bg-[#F5F5F7] border border-black/10 px-4 py-2 text-xs font-semibold text-[#1D1D1F]"
          >
            <option value="Todas">Todas las categorías</option>
            {APPLIANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-3xl bg-[#F5F5F7] flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-sm text-[#1D1D1F]">
                  {tpl.name}
                </div>
                <div className="text-xs font-semibold text-[#0071E3] mt-1">
                  {tpl.nominalWatts} W · Uso típico {tpl.defaultDailyHours}h/día
                </div>
                <p className="text-xs text-[#6E6E73] mt-1.5">{tpl.rdNote}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAddFromTemplate(tpl)}
                className="mt-4 w-full py-2.5 rounded-2xl bg-white hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white border border-black/[0.06] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar a mis equipos
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
