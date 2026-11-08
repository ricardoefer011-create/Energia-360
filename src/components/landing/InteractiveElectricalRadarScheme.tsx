"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Cpu,
  Radio,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react";

type SystemScenarioId = "solar_day" | "night_peak" | "grid_outage" | "optimized_360";

interface ScenarioTelemetry {
  id: SystemScenarioId;
  badge: string;
  title: string;
  subtitle: string;
  gridKw: number;
  solarKw: number;
  batteryKw: number; // positivo = cargando, negativo = descargando
  batterySocPct: number;
  loadKw: number;
  autonomyHours: string;
  efficiencyIndex: number;
  monthlySavingsPct: number;
  gridActive: boolean;
  solarActive: boolean;
  radarScores: {
    axis: string;
    baseline: number;
    optimized: number;
  }[];
  engineeringSummary: string;
}

const SCENARIOS: Record<SystemScenarioId, ScenarioTelemetry> = {
  solar_day: {
    id: "solar_day",
    badge: "ESCENARIO 01 · 12:30 PM",
    title: "CAPTACIÓN SOLAR & INYECCIÓN INTELIGENTE",
    subtitle: "Generación fotovoltaica máxima y carga limpia de almacenamiento",
    gridKw: 0.35,
    solarKw: 4.85,
    batteryKw: 1.4,
    batterySocPct: 96,
    loadKw: 3.8,
    autonomyHours: "14.5 hrs",
    efficiencyIndex: 95,
    monthlySavingsPct: 44,
    gridActive: true,
    solarActive: true,
    radarScores: [
      { axis: "Eficiencia Térmica", baseline: 48, optimized: 92 },
      { axis: "Control de Tramo", baseline: 42, optimized: 95 },
      { axis: "Captación Solar", baseline: 15, optimized: 98 },
      { axis: "Autonomía Crítica", baseline: 50, optimized: 94 },
      { axis: "Factor de Potencia", baseline: 62, optimized: 91 },
      { axis: "Retorno ROI", baseline: 45, optimized: 96 },
    ],
    engineeringSummary:
      "La matriz solar de 5.8 kWp cubre el 100% de la climatización diurna y recarga el banco LiFePO4 sin demandar energía cara de la prestadora de servicio.",
  },
  night_peak: {
    id: "night_peak",
    badge: "ESCENARIO 02 · 09:45 PM",
    title: "GESTIÓN DE DEMANDA NOCTURNA",
    subtitle: "Modulación Inverter y descarga controlada para proteger tu escalón",
    gridKw: 1.15,
    solarKw: 0.0,
    batteryKw: -0.95,
    batterySocPct: 78,
    loadKw: 2.1,
    autonomyHours: "11.2 hrs",
    efficiencyIndex: 91,
    monthlySavingsPct: 38,
    gridActive: true,
    solarActive: false,
    radarScores: [
      { axis: "Eficiencia Térmica", baseline: 44, optimized: 94 },
      { axis: "Control de Tramo", baseline: 38, optimized: 96 },
      { axis: "Captación Solar", baseline: 15, optimized: 76 },
      { axis: "Autonomía Crítica", baseline: 48, optimized: 88 },
      { axis: "Factor de Potencia", baseline: 58, optimized: 93 },
      { axis: "Retorno ROI", baseline: 42, optimized: 90 },
    ],
    engineeringSummary:
      "Durante la noche, el sistema combina climatización SEER 20 con aporte parcial de baterías (Peak Shaving) para impedir que el consumo mensual cruce el umbral de penalización.",
  },
  grid_outage: {
    id: "grid_outage",
    badge: "ESCENARIO 03 · CORTE EXTERNO",
    title: "ISLA ELÉCTRICA & TRANSFERENCIA < 10 MS",
    subtitle: "Continuidad operativa total ante interrupción de la prestadora",
    gridKw: 0.0,
    solarKw: 2.4,
    batteryKw: -1.1,
    batterySocPct: 84,
    loadKw: 3.5,
    autonomyHours: "12.8 hrs",
    efficiencyIndex: 97,
    monthlySavingsPct: 41,
    gridActive: false,
    solarActive: true,
    radarScores: [
      { axis: "Eficiencia Térmica", baseline: 45, optimized: 89 },
      { axis: "Control de Tramo", baseline: 40, optimized: 92 },
      { axis: "Captación Solar", baseline: 15, optimized: 90 },
      { axis: "Autonomía Crítica", baseline: 35, optimized: 99 },
      { axis: "Factor de Potencia", baseline: 52, optimized: 95 },
      { axis: "Retorno ROI", baseline: 40, optimized: 92 },
    ],
    engineeringSummary:
      "Al caer la red externa, el inversor híbrido aísla la propiedad en 8 milisegundos y sostiene refrigeración, telecomunicaciones y climatización esencial sin interrupciones.",
  },
  optimized_360: {
    id: "optimized_360",
    badge: "ESCENARIO 04 · BALANCE ANUAL",
    title: "ECOSISTEMA ENERGIA360 EN EQUILIBRIO TOTAL",
    subtitle: "Sinergia completa entre telemetría, equipos eficientes y generación",
    gridKw: 0.65,
    solarKw: 3.9,
    batteryKw: 0.75,
    batterySocPct: 92,
    loadKw: 3.8,
    autonomyHours: "15.0 hrs",
    efficiencyIndex: 98,
    monthlySavingsPct: 48,
    gridActive: true,
    solarActive: true,
    radarScores: [
      { axis: "Eficiencia Térmica", baseline: 46, optimized: 96 },
      { axis: "Control de Tramo", baseline: 40, optimized: 98 },
      { axis: "Captación Solar", baseline: 15, optimized: 96 },
      { axis: "Autonomía Crítica", baseline: 45, optimized: 97 },
      { axis: "Factor de Potencia", baseline: 60, optimized: 96 },
      { axis: "Retorno ROI", baseline: 42, optimized: 98 },
    ],
    engineeringSummary:
      "Balance óptimo auditado por ENERGIA360: eliminación de consumo fantasma en inversores antiguos, curva de carga dentro del tramo económico y retorno de inversión acelerado.",
  },
};

type SelectedNodeId = "grid" | "solar" | "inverter" | "battery" | "loads";

const NODE_DETAILS: Record<
  SelectedNodeId,
  {
    code: string;
    title: string;
    metricLabel: string;
    description: string;
  }
> = {
  grid: {
    code: "NODO 01 · SUMINISTRO EXTERNO",
    title: "RED DE LA PRESTADORA DE SERVICIO",
    metricLabel: "Monitoreo de Escalones de Consumo",
    description:
      "Supervisa cada kilovatio-hora suministrado por tu prestadora zonal para mantener tu curva de consumo dentro de los tramos más competitivos del pliego vigente.",
  },
  solar: {
    code: "NODO 02 · CAPTACIÓN EN CUBIERTA",
    title: "MATRIZ SOLAR FOTOVOLTAICA",
    metricLabel: "Módulos Monocristalinos N-Type 580W",
    description:
      "Aprovecha las 5.45 a 5.65 Horas Solares Pico (HSP) del Caribe para abatir directamente el consumo diurno de climatización y bombeo.",
  },
  inverter: {
    code: "NODO 03 · NÚCLEO DE CONVERSIÓN",
    title: "INVERSOR HÍBRIDO INTELIGENTE",
    metricLabel: "Eficiencia de Conversión 97.6% · MPPT Dual",
    description:
      "Coordina automáticamente la prioridad entre energía solar, banco de baterías y red externa, eliminando el consumo parásito de los inversores tradicionales.",
  },
  battery: {
    code: "NODO 04 · RESERVA ENERGÉTICA",
    title: "BANCO DE LITIO LiFePO4 48V",
    metricLabel: "+6,000 Ciclos · Profundidad de Descarga 90%",
    description:
      "Almacena excedentes diurnos para asistir en horas pico nocturnas y garantiza autonomía silenciosa ante cualquier interrupción del suministro.",
  },
  loads: {
    code: "NODO 05 · DEMANDA INTERNA",
    title: "CENTRO DE CARGAS Y CLIMATIZACIÓN",
    metricLabel: "Auditoría de Equipos por Costo Marginal",
    description:
      "Clasifica tus cargas críticas y no críticas, cuantificando el peso exacto de cada aire acondicionado, cámara de frío o equipo en tu estado energético mensual.",
  },
};

export function InteractiveElectricalRadarScheme({
  onLaunchSimulator,
}: {
  onLaunchSimulator: () => void;
}) {
  const [scenarioId, setScenarioId] = useState<SystemScenarioId>("solar_day");
  const [selectedNode, setSelectedNode] = useState<SelectedNodeId>("inverter");

  const current = SCENARIOS[scenarioId];
  const activeNodeInfo = NODE_DETAILS[selectedNode];

  // Cálculo geométrico del polígono de radar de 6 ejes (hexágono)
  const center = 150;
  const maxRadius = 104;
  const angles = [-90, -30, 30, 90, 150, 210].map(
    (deg) => (deg * Math.PI) / 180
  );

  function buildPolygonPoints(values: number[]): string {
    return values
      .map((val, idx) => {
        const r = (Math.max(10, Math.min(100, val)) / 100) * maxRadius;
        const x = center + r * Math.cos(angles[idx]);
        const y = center + r * Math.sin(angles[idx]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const baselinePoints = buildPolygonPoints(
    current.radarScores.map((s) => s.baseline)
  );
  const optimizedPoints = buildPolygonPoints(
    current.radarScores.map((s) => s.optimized)
  );

  return (
    <section
      id="radar-esquema"
      className="py-16 sm:py-24 px-4 sm:px-8 bg-[#F1F1F1] border-b border-[#D9D9D9]"
    >
      <div className="max-w-[1640px] mx-auto">
        {/* Cabecera Editorial GrupaMar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#091197] text-[#03A9EC] text-xs font-extrabold uppercase tracking-[0.12em] mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              TELEMETRÍA INTERACTIVA EN TIEMPO REAL
            </div>
            <h3 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-[-0.02em] leading-[0.98] text-[#091197]">
              ESQUEMA DINÁMICO DEL SISTEMA ELÉCTRICO &amp; RADAR 360°
            </h3>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[#4B528A] text-sm sm:text-base leading-relaxed">
              Explora cómo interactúan el suministro externo, la generación
              solar, el banco de respaldo y tus equipos internos según la hora
              del día. Selecciona un escenario o toca cualquier nodo del esquema
              para inspeccionar el flujo energético.
            </p>
          </div>
        </div>

        {/* Selector de 4 Escenarios Operativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {(Object.values(SCENARIOS) as ScenarioTelemetry[]).map((sc) => {
            const isActive = sc.id === scenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setScenarioId(sc.id)}
                className={`text-left p-4 sm:p-5 rounded-[12px] border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#091197] text-white border-[#091197] shadow-lg"
                    : "bg-white text-[#091197] border-[#D9D9D9] hover:border-[#03A9EC]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-[0.1em] px-2 py-0.5 rounded ${
                      isActive
                        ? "bg-[#03A9EC] text-white"
                        : "bg-[#F1F1F1] text-[#03A9EC]"
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <span
                    className={`text-xs font-extrabold ${
                      isActive ? "text-[#03A9EC]" : "text-[#091197]"
                    }`}
                  >
                    -{sc.monthlySavingsPct}% Costo
                  </span>
                </div>
                <div className="font-extrabold text-sm uppercase leading-snug">
                  {sc.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Panel Principal: Esquema Dinámico de Flujo (7 cols) + Radar 360° (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* COLUMNA IZQUIERDA (7 COLS): ESQUEMA ELÉCTRICO INTERACTIVO CON FLUJO ANIMADO */}
          <div className="lg:col-span-7 bg-[#091197] text-white rounded-[12px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border border-[#091197]">
            {/* Retícula técnica de fondo */}
            <div
              className="pointer-events-none absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(3,169,236,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(3,169,236,0.3) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/15">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#03A9EC]">
                  DIAGRAMA UNIFILAR INTERACTIVO · FLUJO DE POTENCIA ACTIVO
                </span>
                <h4 className="text-xl sm:text-2xl font-extrabold uppercase text-white mt-0.5">
                  {current.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-[8px] bg-white/10 border border-[#03A9EC]/50 text-xs font-extrabold uppercase text-[#03A9EC]">
                  Índice Eficiencia: {current.efficiencyIndex}%
                </span>
              </div>
            </div>

            {/* ESQUEMA INTERACTIVO DE 5 NODOS CON ANIMACIÓN SVG */}
            <div className="relative z-10 my-6 bg-white/[0.04] rounded-[12px] border border-white/15 p-4 sm:p-6">
              <svg
                viewBox="0 0 700 320"
                className="w-full h-[250px] sm:h-[290px]"
                fill="none"
              >
                <defs>
                  <style>{`
                    @keyframes energyPulseFlow {
                      to { stroke-dashoffset: -48; }
                    }
                    .flow-line-active {
                      stroke-dasharray: 8 8;
                      animation: energyPulseFlow 1.2s linear infinite;
                    }
                  `}</style>
                </defs>

                {/* Línea 1: Red Externa (Izquierda Arriba) -> Inversor Central */}
                <path
                  d="M 155 75 L 280 75 L 320 140"
                  stroke={current.gridActive ? "#03A9EC" : "#4B528A"}
                  strokeWidth={current.gridActive ? "3.5" : "2"}
                  className={current.gridActive ? "flow-line-active" : ""}
                  opacity={current.gridActive ? 1 : 0.35}
                />

                {/* Línea 2: Captación Solar (Izquierda Abajo) -> Inversor Central */}
                <path
                  d="M 155 245 L 280 245 L 320 180"
                  stroke={current.solarActive ? "#F75600" : "#4B528A"}
                  strokeWidth={current.solarActive ? "3.5" : "2"}
                  className={current.solarActive ? "flow-line-active" : ""}
                  opacity={current.solarActive ? 1 : 0.35}
                />

                {/* Línea 3: Inversor Central -> Centro de Cargas (Derecha Arriba) */}
                <path
                  d="M 390 145 L 445 75 L 545 75"
                  stroke="#03A9EC"
                  strokeWidth="4"
                  className="flow-line-active"
                />

                {/* Línea 4: Inversor Central <-> Banco de Baterías LiFePO4 (Derecha Abajo) */}
                <path
                  d="M 390 175 L 445 245 L 545 245"
                  stroke={current.batteryKw >= 0 ? "#03A9EC" : "#F75600"}
                  strokeWidth="3.5"
                  className="flow-line-active"
                />

                {/* NODO 1: PRESTADORA / RED EXTERNA */}
                <g
                  onClick={() => setSelectedNode("grid")}
                  className="cursor-pointer"
                >
                  <rect
                    x="20"
                    y="32"
                    width="135"
                    height="86"
                    rx="10"
                    fill={selectedNode === "grid" ? "#FFFFFF" : "#0B1678"}
                    stroke={current.gridActive ? "#03A9EC" : "#F75600"}
                    strokeWidth="2.5"
                  />
                  <text
                    x="34"
                    y="55"
                    fill={selectedNode === "grid" ? "#03A9EC" : "#03A9EC"}
                    fontSize="10"
                    fontWeight="800"
                  >
                    01 · RED EXTERNA
                  </text>
                  <text
                    x="34"
                    y="76"
                    fill={selectedNode === "grid" ? "#091197" : "#FFFFFF"}
                    fontSize="13"
                    fontWeight="800"
                  >
                    SUMINISTRO
                  </text>
                  <text
                    x="34"
                    y="101"
                    fill={
                      current.gridActive
                        ? selectedNode === "grid"
                          ? "#091197"
                          : "#03A9EC"
                        : "#F75600"
                    }
                    fontSize="15"
                    fontWeight="800"
                  >
                    {current.gridActive
                      ? `${current.gridKw.toFixed(2)} kW`
                      : "DESCONECTADA"}
                  </text>
                </g>

                {/* NODO 2: CAPTACIÓN SOLAR */}
                <g
                  onClick={() => setSelectedNode("solar")}
                  className="cursor-pointer"
                >
                  <rect
                    x="20"
                    y="202"
                    width="135"
                    height="86"
                    rx="10"
                    fill={selectedNode === "solar" ? "#FFFFFF" : "#0B1678"}
                    stroke={current.solarActive ? "#F75600" : "#4B528A"}
                    strokeWidth="2.5"
                  />
                  <text
                    x="34"
                    y="225"
                    fill="#F75600"
                    fontSize="10"
                    fontWeight="800"
                  >
                    02 · FOTOVOLTAICA
                  </text>
                  <text
                    x="34"
                    y="246"
                    fill={selectedNode === "solar" ? "#091197" : "#FFFFFF"}
                    fontSize="13"
                    fontWeight="800"
                  >
                    PANELES 580W
                  </text>
                  <text
                    x="34"
                    y="271"
                    fill={selectedNode === "solar" ? "#091197" : "#03A9EC"}
                    fontSize="15"
                    fontWeight="800"
                  >
                    {current.solarKw.toFixed(2)} kW
                  </text>
                </g>

                {/* NODO 3: CEREBRO CENTRAL / INVERSOR HÍBRIDO */}
                <g
                  onClick={() => setSelectedNode("inverter")}
                  className="cursor-pointer"
                >
                  <rect
                    x="285"
                    y="105"
                    width="130"
                    height="110"
                    rx="12"
                    fill={selectedNode === "inverter" ? "#03A9EC" : "#FFFFFF"}
                    stroke="#03A9EC"
                    strokeWidth="3"
                  />
                  <text
                    x="350"
                    y="132"
                    textAnchor="middle"
                    fill={selectedNode === "inverter" ? "#FFFFFF" : "#03A9EC"}
                    fontSize="10"
                    fontWeight="800"
                  >
                    NÚCLEO 360°
                  </text>
                  <text
                    x="350"
                    y="156"
                    textAnchor="middle"
                    fill={selectedNode === "inverter" ? "#FFFFFF" : "#091197"}
                    fontSize="14"
                    fontWeight="800"
                  >
                    INVERSOR
                  </text>
                  <text
                    x="350"
                    y="174"
                    textAnchor="middle"
                    fill={selectedNode === "inverter" ? "#FFFFFF" : "#091197"}
                    fontSize="12"
                    fontWeight="700"
                  >
                    HÍBRIDO MPPT
                  </text>
                  <text
                    x="350"
                    y="198"
                    textAnchor="middle"
                    fill={selectedNode === "inverter" ? "#091197" : "#F75600"}
                    fontSize="12"
                    fontWeight="800"
                  >
                    Eta 97.6%
                  </text>
                </g>

                {/* NODO 4: CENTRO DE CARGAS INTERNAS */}
                <g
                  onClick={() => setSelectedNode("loads")}
                  className="cursor-pointer"
                >
                  <rect
                    x="545"
                    y="32"
                    width="135"
                    height="86"
                    rx="10"
                    fill={selectedNode === "loads" ? "#FFFFFF" : "#0B1678"}
                    stroke="#03A9EC"
                    strokeWidth="2.5"
                  />
                  <text
                    x="559"
                    y="55"
                    fill="#03A9EC"
                    fontSize="10"
                    fontWeight="800"
                  >
                    04 · CONSUMO ACTIVO
                  </text>
                  <text
                    x="559"
                    y="76"
                    fill={selectedNode === "loads" ? "#091197" : "#FFFFFF"}
                    fontSize="13"
                    fontWeight="800"
                  >
                    EQUIPOS &amp; CLIMA
                  </text>
                  <text
                    x="559"
                    y="101"
                    fill={selectedNode === "loads" ? "#091197" : "#03A9EC"}
                    fontSize="15"
                    fontWeight="800"
                  >
                    {current.loadKw.toFixed(2)} kW
                  </text>
                </g>

                {/* NODO 5: BANCO DE BATERÍAS LiFePO4 */}
                <g
                  onClick={() => setSelectedNode("battery")}
                  className="cursor-pointer"
                >
                  <rect
                    x="545"
                    y="202"
                    width="135"
                    height="86"
                    rx="10"
                    fill={selectedNode === "battery" ? "#FFFFFF" : "#0B1678"}
                    stroke="#03A9EC"
                    strokeWidth="2.5"
                  />
                  <text
                    x="559"
                    y="225"
                    fill="#03A9EC"
                    fontSize="10"
                    fontWeight="800"
                  >
                    05 · RESPALDO 48V
                  </text>
                  <text
                    x="559"
                    y="246"
                    fill={selectedNode === "battery" ? "#091197" : "#FFFFFF"}
                    fontSize="13"
                    fontWeight="800"
                  >
                    LiFePO4 ({current.batterySocPct}%)
                  </text>
                  <text
                    x="559"
                    y="271"
                    fill={selectedNode === "battery" ? "#F75600" : "#03A9EC"}
                    fontSize="14"
                    fontWeight="800"
                  >
                    {current.batteryKw >= 0
                      ? `+${current.batteryKw.toFixed(2)} kW Carga`
                      : `${current.batteryKw.toFixed(2)} kW Apoyo`}
                  </text>
                </g>
              </svg>

              {/* Selector rápido de nodos para móvil y desktop */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/15">
                {(
                  [
                    { id: "grid", label: "01. Red Suministro", icon: Zap },
                    { id: "solar", label: "02. Captación Solar", icon: Sun },
                    { id: "inverter", label: "03. Inversor 360°", icon: Cpu },
                    { id: "loads", label: "04. Equipos Internos", icon: Activity },
                    {
                      id: "battery",
                      label: "05. Banco LiFePO4",
                      icon: BatteryCharging,
                    },
                  ] as const
                ).map((n) => {
                  const Icon = n.icon;
                  const isSel = selectedNode === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNode(n.id)}
                      className={`px-3 py-1.5 rounded-[8px] text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer ${
                        isSel
                          ? "bg-[#03A9EC] text-white"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{n.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalle Técnico del Nodo Seleccionado */}
            <div className="relative z-10 bg-white text-[#091197] rounded-[12px] p-5 border-l-4 border-[#03A9EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    {activeNodeInfo.code}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F1F1F1] text-[10px] font-extrabold uppercase text-[#091197]">
                    {activeNodeInfo.metricLabel}
                  </span>
                </div>
                <h5 className="text-lg font-extrabold uppercase text-[#091197] mt-0.5">
                  {activeNodeInfo.title}
                </h5>
                <p className="text-xs text-[#4B528A] mt-1 leading-relaxed">
                  {activeNodeInfo.description}
                </p>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (5 COLS): RADAR ENERGÉTICO POLIGONAL 360° */}
          <div className="lg:col-span-5 bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D9]">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                    DIAGNÓSTICO MULTIVARIABLE 6 EJES
                  </span>
                  <h4 className="text-xl sm:text-2xl font-extrabold uppercase text-[#091197]">
                    RADAR DE DESEMPEÑO 360°
                  </h4>
                </div>
                <span className="px-3 py-1 rounded-[8px] bg-[#F1F1F1] text-[#091197] text-xs font-extrabold uppercase">
                  Autonomía {current.autonomyHours}
                </span>
              </div>

              {/* Leyenda comparativa */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-extrabold uppercase">
                <span className="inline-flex items-center gap-2 text-[#091197]">
                  <span className="w-3.5 h-3.5 rounded-[4px] bg-[#03A9EC] inline-block" />
                  Sistema Optimizado ENERGIA360
                </span>
                <span className="inline-flex items-center gap-2 text-[#4B528A]">
                  <span className="w-3.5 h-3.5 rounded-[4px] bg-[#F75600] inline-block" />
                  Instalación Tradicional Sin Auditar
                </span>
              </div>

              {/* Gráfico de Radar Hexagonal SVG */}
              <div className="my-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 300 300"
                  className="w-full max-w-[290px] h-auto"
                >
                  {/* Anillos concéntricos del radar */}
                  {[0.25, 0.5, 0.75, 1].map((scale) => (
                    <polygon
                      key={scale}
                      points={buildPolygonPoints(
                        [100, 100, 100, 100, 100, 100].map((v) => v * scale)
                      )}
                      fill="none"
                      stroke="#D9D9D9"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Ejes radiales */}
                  {angles.map((ang, idx) => (
                    <line
                      key={idx}
                      x1={center}
                      y1={center}
                      x2={center + maxRadius * Math.cos(ang)}
                      y2={center + maxRadius * Math.sin(ang)}
                      stroke="#D9D9D9"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Polígono Base (Sin Auditar - Naranja #F75600) */}
                  <polygon
                    points={baselinePoints}
                    fill="rgba(247, 86, 0, 0.16)"
                    stroke="#F75600"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />

                  {/* Polígono Optimizado ENERGIA360 (Azul Cian #03A9EC + #091197) */}
                  <polygon
                    points={optimizedPoints}
                    fill="rgba(3, 169, 236, 0.28)"
                    stroke="#091197"
                    strokeWidth="2.5"
                  />

                  {/* Etiquetas de los 6 Ejes */}
                  {current.radarScores.map((item, idx) => {
                    const labelRadius = maxRadius + 26;
                    const x = center + labelRadius * Math.cos(angles[idx]);
                    const y = center + labelRadius * Math.sin(angles[idx]);
                    return (
                      <text
                        key={item.axis}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#091197"
                        fontSize="8.5"
                        fontWeight="800"
                      >
                        {item.axis.toUpperCase()}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* Dictamen del escenario */}
              <div className="p-4 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs text-[#4B528A] leading-relaxed">
                <strong className="text-[#091197] uppercase font-extrabold block mb-1">
                  Dictamen de Ingeniería del Escenario:
                </strong>
                {current.engineeringSummary}
              </div>
            </div>

            <button
              onClick={onLaunchSimulator}
              className="grupamar-cta w-full mt-5"
            >
              <span>SIMULAR MI PROPIO SISTEMA EN PLATAFORMA</span>
              <span className="grupamar-cta-arrow">
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

