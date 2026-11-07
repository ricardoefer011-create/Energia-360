"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  Info,
  Plus,
  Sliders,
  Trash2,
  Zap,
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
  const [model, setModel] = useState("");
  const [nominalWatts, setNominalWatts] = useState<number>(1050);
  const [dutyCycleFactor, setDutyCycleFactor] = useState<number>(0.65);
  const [quantity, setQuantity] = useState<number>(1);
  const [dailyHours, setDailyHours] = useState<number>(8);
  const [monthlyDays, setMonthlyDays] = useState<number>(30);
  const [efficiencyRating, setEfficiencyRating] = useState<string>(
    "Alta Eficiencia (Inverter)"
  );
  const [isCriticalBackupLoad, setIsCriticalBackupLoad] =
    useState<boolean>(false);
  const [observations, setObservations] = useState<string>("");

  // Cálculo global del inventario actual
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
      model: model.trim() || "Estándar",
      nominalWatts: Number(nominalWatts),
      dutyCycleFactor: Number(dutyCycleFactor),
      quantity: Number(quantity),
      dailyHours: Number(dailyHours),
      monthlyDays: Number(monthlyDays),
      efficiencyRating,
      isCriticalBackupLoad,
      isNighttimeHeavy: category === "Aires acondicionados",
      provenance: "introducido_usuario",
      observations: observations.trim(),
    };

    onAddAppliance(newApp);
    setName("");
    setObservations("");
  }

  const filteredTemplates =
    selectedCategoryFilter === "Todas"
      ? RD_APPLIANCE_LIBRARY
      : RD_APPLIANCE_LIBRARY.filter(
          (t) => t.category === selectedCategoryFilter
        );

  return (
    <div className="space-y-6">
      {/* Resumen Global en Tiempo Real del Simulador de Equipos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Calculadora y Simulador Interactivo de Equipos
          </span>
          <h3 className="text-xl font-extrabold mt-0.5">
            Consumo Total Estimado:{" "}
            <span className="text-sky-400">
              {totalEstimatedKwh.toFixed(1)} kWh/mes
            </span>{" "}
            &rarr;{" "}
            <span className="text-emerald-400">
              RD${" "}
              {billResult.totalEstimatedBillDop.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
              /mes
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Fórmula científica: kWh/mes = (Watts × cantidad × factor de ciclo ÷
            1000) × horas/día × días/mes. Costo evaluado con pliego{" "}
            {activeSchedule.distributor_code} ({activeSchedule.tariff_code}).
          </p>
        </div>

        {billResult.lostStepSubsidy701 && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 max-w-md flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong>¡Escalón 701 kWh superado!</strong> Tus equipos suman más
              de 700 kWh/mes, generando una penalización de{" "}
              <strong>
                RD$ {billResult.subsidyLossPenaltyDop.toLocaleString("es-DO")}
              </strong>{" "}
              por pérdida del subsidio escalonado. Usa los deslizadores abajo
              para bajar de 700 kWh.
            </span>
          </div>
        )}
      </div>

      {/* Biblioteca de Equipos Habituales en República Dominicana */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-base">
              Biblioteca Orientativa de Equipos en República Dominicana
            </h3>
            <p className="text-xs text-slate-400">
              Valores orientativos claramente identificados (no equivalen a
              mediciones físicas con pinza amperimétrica). Haz clic para añadir
              a tu espacio.
            </p>
          </div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200"
          >
            <option value="Todas">Todas las categorías (15)</option>
            {APPLIANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/75 hover:border-sky-500/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-100">
                    {tpl.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    Valor orientativo
                  </span>
                </div>
                <div className="text-[11px] text-sky-400 mt-1">
                  {tpl.nominalWatts} W nominales · Factor ciclo{" "}
                  {(tpl.dutyCycleFactor * 100).toFixed(0)}% ·{" "}
                  {tpl.defaultDailyHours}h/día
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {tpl.rdNote}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddFromTemplate(tpl)}
                className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white text-xs font-medium inline-flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar a mi inventario
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Inventario Activo + Simulador de Horas en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-base">
                Tus Equipos Registrados y Simulador de Horas ({appliances.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Mueve el deslizador de horas para simular el ahorro inmediato
            </span>
          </div>

          {appliances.length > 0 ? (
            <div className="space-y-3">
              {appliances.map((app) => {
                const metrics = calculateApplianceConsumption(
                  app,
                  billResult.averageRateDopPerKwh
                );
                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/75"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">
                            {app.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {app.category}
                          </span>
                          {app.isCriticalBackupLoad && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1">
                              <BatteryCharging className="w-3 h-3" /> En Inversor
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {app.brand} {app.model} · Potencia nominal:{" "}
                          <strong className="text-slate-200">
                            {app.nominalWatts} W
                          </strong>{" "}
                          × {app.quantity} und · {app.monthlyDays} días/mes
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-400">
                            RD${" "}
                            {metrics.estimatedMonthlyCostDop.toLocaleString(
                              "es-DO"
                            )}
                            /mes
                          </div>
                          <div className="text-xs text-sky-400 font-semibold">
                            {metrics.monthlyKwh} kWh/mes ({metrics.dailyKwh}{" "}
                            kWh/día)
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteAppliance(app.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Eliminar equipo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Simulador interactivo de horas diarias */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xs text-slate-300 whitespace-nowrap">
                          Simular uso diario:{" "}
                          <strong className="text-sky-400">
                            {app.dailyHours} h/día
                          </strong>
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
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {app.provenance === "biblioteca_orientativa"
                          ? "Origen: Biblioteca orientativa RD"
                          : "Origen: Introducido por el usuario"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              No hay equipos registrados. Selecciona cualquiera de la biblioteca
              superior o registra uno personalizado a la derecha.
            </div>
          )}
        </div>

        {/* Formulario de Registro Personalizado */}
        <form
          onSubmit={handleCreateCustom}
          className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 space-y-3.5 h-fit"
        >
          <h3 className="font-bold text-base">
            Registrar Equipo Personalizado
          </h3>
          <p className="text-xs text-slate-400">
            Introduce los datos de la etiqueta técnica de tu equipo.
          </p>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Nombre del equipo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aire Acondicionado Sala"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Categoría *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ApplianceCategory)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
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
              <label className="block text-xs text-slate-300 mb-1">Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej. LG / Carrier"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Potencia Nominal (W) *
              </label>
              <input
                type="number"
                min={1}
                max={25000}
                required
                value={nominalWatts}
                onChange={(e) =>
                  setNominalWatts(parseInt(e.target.value, 10) || 0)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Horas de uso al día *
              </label>
              <input
                type="number"
                min={0.1}
                max={24}
                step="0.5"
                required
                value={dailyHours}
                onChange={(e) =>
                  setDailyHours(parseFloat(e.target.value) || 1)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Días al mes *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={monthlyDays}
                onChange={(e) =>
                  setMonthlyDays(parseInt(e.target.value, 10) || 30)
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Factor ciclo compresor
              </label>
              <select
                value={dutyCycleFactor}
                onChange={(e) =>
                  setDutyCycleFactor(parseFloat(e.target.value))
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value={1}>100% (Carga continua / Resistencia)</option>
                <option value={0.82}>82% (A/C Convencional On-Off)</option>
                <option value={0.62}>62% (A/C Inverter modulando)</option>
                <option value={0.5}>50% (Nevera / Congelador)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Eficiencia Energética
              </label>
              <select
                value={efficiencyRating}
                onChange={(e) => setEfficiencyRating(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="Alta Eficiencia (Inverter)">
                  Alta Eficiencia (Inverter)
                </option>
                <option value="Estándar">Estándar</option>
                <option value="Baja Eficiencia">Baja Eficiencia</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isCriticalBackupLoad}
              onChange={(e) => setIsCriticalBackupLoad(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Conectar este equipo al circuito de respaldo (Inversor)</span>
          </label>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
          >
            Guardar Equipo en Inventario
          </button>

          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              Nota técnica: La potencia nominal impresa en la placa del
              fabricante representa la demanda máxima; el consumo real varía
              según el termostato, temperatura exterior y estado del equipo.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

