// ============================================================================
// ENERGIA360 — Contratos y Tipos de Dominio (TypeScript Strict)
// ============================================================================

export type DistributorCode = "EDESUR" | "EDENORTE" | "EDEESTE" | "CEPM";

export type PropertyType =
  | "hogar"
  | "apartamento"
  | "pequeno_negocio"
  | "empresa"
  | "instalacion_solar";

export type SubscriptionPlan = "gratuito" | "hogar" | "negocios" | "empresarial";

export type DataProvenanceStatus =
  | "confirmado_usuario"
  | "extraido_automatico"
  | "estimado"
  | "no_disponible";

export type ApplianceCategory =
  | "Aires acondicionados"
  | "Neveras"
  | "Congeladores"
  | "Televisores"
  | "Lavadoras"
  | "Secadoras"
  | "Bombas de agua"
  | "Microondas"
  | "Estufas eléctricas"
  | "Computadoras"
  | "Iluminación"
  | "Ventiladores"
  | "Calentadores"
  | "Equipos comerciales"
  | "Otros";

export interface TariffFixedChargeTier {
  min_kwh: number;
  max_kwh: number | null;
  charge_dop: number;
}

export interface TariffEnergyBlock {
  min_kwh: number;
  max_kwh: number | null;
  rate_dop: number;
}

export interface TariffSchedule {
  id: string;
  distributor_code: DistributorCode;
  tariff_code: string; // Ej. BTS-1, BTS-2, RES-CEPM
  category_name: string;
  customer_segment: "residencial" | "comercial" | "industrial" | "solar_net_metering";
  currency: "DOP";
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  is_official_sie: boolean;
  source_reference: string;
  billing_mode: "tiered_with_threshold_reset" | "tiered_progressive" | "flat";
  full_reset_threshold_kwh: number | null;
  full_reset_rate_dop: number | null;
  fixed_charges: TariffFixedChargeTier[];
  energy_blocks: TariffEnergyBlock[];
  notes: string;
}

export interface FieldWithProvenance<T> {
  value: T;
  status: DataProvenanceStatus;
}

export interface ElectricityInvoice {
  id: string;
  distributor: FieldWithProvenance<DistributorCode>;
  contractNumber: FieldWithProvenance<string>; // NIC / NIS (Solo local, cifrado)
  billingPeriodStart: FieldWithProvenance<string>; // YYYY-MM-DD
  billingPeriodEnd: FieldWithProvenance<string>; // YYYY-MM-DD
  billingDays: FieldWithProvenance<number>;
  issueDate: FieldWithProvenance<string>;
  dueDate: FieldWithProvenance<string>;
  billedKwh: FieldWithProvenance<number>;
  energyChargeDop: FieldWithProvenance<number>;
  fixedChargeDop: FieldWithProvenance<number>;
  additionalChargesDop: FieldWithProvenance<number>;
  taxesDop: FieldWithProvenance<number>;
  pendingBalanceDop: FieldWithProvenance<number>;
  totalAmountDop: FieldWithProvenance<number>;
  tariffCode: FieldWithProvenance<string>;
  confirmedByUserAt: string;
  notes?: string;
}

export interface UserAppliance {
  id: string;
  name: string;
  category: ApplianceCategory;
  brand: string;
  model: string;
  nominalWatts: number;
  dutyCycleFactor: number; // 0.1 - 1.0 (ej. compresor nevera/aire inverter vs resistencia)
  quantity: number;
  dailyHours: number;
  monthlyDays: number;
  efficiencyRating: string;
  isCriticalBackupLoad: boolean; // Si se conecta al inversor en apagones
  isNighttimeHeavy: boolean;
  provenance: "introducido_usuario" | "biblioteca_orientativa";
  observations?: string;
}

export interface InverterBatterySystem {
  id: string;
  name: string;
  inverterBrand: string;
  inverterModel: string;
  inverterPowerW: number;
  inverterEfficiency: number; // 0.80 - 0.96
  batteryBrand: string;
  batteryType: "lead_acid_flooded" | "agm_gel" | "lifepo4";
  batteryVoltageV: number; // 12V, 24V, 48V
  batteryCapacityAh: number;
  batteryCount: number;
  totalBatteryCapacityWh: number;
  usableDodFraction: number; // Ej. 0.50 para plomo-ácido, 0.85 para LiFePO4
  currentStateOfChargePercent: number; // 10 - 100%
  installedPanelsCount: number;
  installedSolarKw: number;
  installationDate: string;
  observations?: string;
}

export interface EnergyRecommendation {
  id: string;
  title: string;
  severity: "alta" | "media" | "oportunidad";
  problemIdentified: string;
  availableEvidence: string;
  suggestedAction: string;
  potentialMonthlySavingsDop: number;
  potentialMonthlySavingsKwh: number;
  confidenceLevel: "Alto" | "Medio" | "Orientativo";
  calculationMethod: string;
  dataBasis: "datos_medidos_factura" | "datos_usuario_equipos" | "estimacion_combinada";
}

export interface SavingsScenario {
  id: string;
  name: string;
  type:
    | "reducir_horas_ac"
    | "cambiar_inverter"
    | "iluminacion_led"
    | "reemplazar_nevera"
    | "optimizar_bomba_agua"
    | "instalar_paneles_solares"
    | "personalizado";
  description: string;
  kwhReductionMonthly: number;
  estimatedInvestmentDop: number;
}

export interface SolarSimulationInput {
  monthlyKwh: number;
  averageMonthlyBillDop: number;
  province: string;
  propertyType: PropertyType;
  availableRoofAreaM2: number;
  roofOrientation: "Sur" | "Sureste/Suroeste" | "Este/Oeste" | "Techo Plano" | "No conocida";
  installationType: "on_grid_net_metering" | "hibrido_con_baterias" | "off_grid_aislado";
  availableBudgetDop: number;
  targetCoveragePercent: number; // 50 - 100%
  desiredAutonomyHours: number; // 0 - 24h
  systemLossFactor: number; // Default 0.22 (78% performance ratio)
}

export interface SolarScenarioResult {
  scenarioLabel: "Conservador" | "Intermedio" | "Optimista";
  performanceRatio: number;
  recommendedKwPeak: number;
  estimatedPanelsCount: number;
  panelWattsEach: number;
  requiredRoofAreaM2: number;
  roofSpaceSufficient: boolean;
  recommendedBatteryKwh: number;
  monthlyGenerationKwh: number;
  coveragePercent: number;
  estimatedInvestmentDop: number;
  monthlySavingsDop: number;
  annualSavingsDop: number;
  paybackYears: number;
  roi10YearsPercent: number;
}

export interface AlertConfig {
  id: string;
  type:
    | "aumento_consumo"
    | "proyeccion_factura_elevada"
    | "equipo_consumo_anormal"
    | "objetivo_ahorro_incumplido"
    | "inconsistencia_factura_equipos"
    | "baja_autonomia_inversor"
    | "mantenimiento_sistema";
  label: string;
  enabled: boolean;
  thresholdValue: number;
  unit: string;
}

export interface TriggeredAlert {
  id: string;
  type: AlertConfig["type"];
  severity: "critica" | "advertencia" | "informativa";
  title: string;
  message: string;
  metricValue: string;
  recommendedAction: string;
}

export interface UserWorkspaceProfile {
  spaceName: string;
  propertyType: PropertyType;
  distributor: DistributorCode;
  tariffCode: string;
  customRateDopPerKwh: number | null;
  province: string;
  monthlySavingsGoalDop: number;
  monthlyBudgetLimitDop: number;
  subscriptionPlan: SubscriptionPlan;
  onboardingCompleted: boolean;
  telemetryOptIn: boolean;
  createdAt: string;
}

export interface LocalVaultPayload {
  schemaVersion: number;
  updatedAt: string;
  profile: UserWorkspaceProfile;
  invoices: ElectricityInvoice[];
  appliances: UserAppliance[];
  inverterSystems: InverterBatterySystem[];
  alertConfigs: AlertConfig[];
  customTariffs: TariffSchedule[];
}

