// ============================================================================
// ENERGIA360 — Sistema de Cuentas, Login y Gobernanza Super Admin
// ============================================================================
// Gestiona:
// 1. Registro de nuevas cuentas de clientes (quedan en estado "pending" hasta
//    que el Super Admin las aprueba).
// 2. Inicio de sesión (valida credenciales y verifica que la cuenta esté
//    aprobada por el Super Admin).
// 3. Cuenta Maestra de Super Administrador (admin@energia360.do / Admin360RD!).
// 4. Consola de Aprobación, Rechazo, Suspensión y Asignación de Planes/Roles.
// ============================================================================

import { TestAccountPresetId } from "@/lib/data/rd-energy-catalog";

export type AccountApprovalStatus = "pending" | "approved" | "rejected";
export type PlatformUserRole = "super_admin" | "client_enterprise" | "client_residential";

export interface PlatformUserAccount {
  id: string;
  fullName: string;
  organizationOrUnit: string;
  email: string;
  password: string;
  phone: string;
  serviceZone:
    | "Prestadora Zona Metropolitana / Sur"
    | "Prestadora Zona Norte / Cibao"
    | "Prestadora Zona Oriental"
    | "Concesión Turística Este";
  supplyType: "Residencial" | "Comercial / PyME" | "Industrial / Multipunto";
  estimatedMonthlyKwh: number;
  role: PlatformUserRole;
  status: AccountApprovalStatus;
  linkedPresetId: TestAccountPresetId;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

const STORAGE_KEY = "energia360_platform_accounts_v2";

export const SUPER_ADMIN_CREDENTIALS = {
  email: "admin@energia360.do",
  password: "Admin360RD!",
  fullName: "Dirección General · Super Admin",
  role: "super_admin" as PlatformUserRole,
};

export const INITIAL_PLATFORM_ACCOUNTS: PlatformUserAccount[] = [
  {
    id: "usr-super-admin",
    fullName: "Dirección General · Super Admin",
    organizationOrUnit: "ENERGIA360 Gobernanza Central",
    email: "admin@energia360.do",
    password: "Admin360RD!",
    phone: "+1 (809) 555-0360",
    serviceZone: "Prestadora Zona Metropolitana / Sur",
    supplyType: "Industrial / Multipunto",
    estimatedMonthlyKwh: 1450,
    role: "super_admin",
    status: "approved",
    linkedPresetId: "hogar_santo_domingo",
    createdAt: "2026-10-01T09:00:00Z",
    approvedAt: "2026-10-01T09:00:00Z",
    approvedBy: "Sistema Raíz",
    notes: "Cuenta maestra con privilegios totales de aprobación de usuarios y auditoría.",
  },
  {
    id: "usr-pending-01",
    fullName: "Ing. Carlos Manuel Despradel",
    organizationOrUnit: "Torre Corporativa Piantini · Nivel 8",
    email: "cdespradel@grupocibao.do",
    password: "Cliente2026!",
    phone: "+1 (809) 541-8820",
    serviceZone: "Prestadora Zona Metropolitana / Sur",
    supplyType: "Comercial / PyME",
    estimatedMonthlyKwh: 1840,
    role: "client_enterprise",
    status: "pending",
    linkedPresetId: "negocio_punta_cana",
    createdAt: "2026-11-07T18:20:00Z",
    notes: "Solicita acceso para auditoría de climatización central y banco de respaldo.",
  },
  {
    id: "usr-pending-02",
    fullName: "Dra. Laura Patricia Mencía",
    organizationOrUnit: "Residencia Cerros de Gurabo",
    email: "lmencia@clinicanorte.do",
    password: "Cliente2026!",
    phone: "+1 (809) 582-4419",
    serviceZone: "Prestadora Zona Norte / Cibao",
    supplyType: "Residencial",
    estimatedMonthlyKwh: 745,
    role: "client_residential",
    status: "pending",
    linkedPresetId: "apartamento_santiago",
    createdAt: "2026-11-07T21:15:00Z",
    notes: "Requiere optimización de escalón de consumo para retornar bajo el umbral de 700 kWh.",
  },
  {
    id: "usr-pending-03",
    fullName: "Roberto J. Báez · Operaciones",
    organizationOrUnit: "Centro Logístico Higuey-Bávaro",
    email: "rbaez@logisticabavaro.do",
    password: "Cliente2026!",
    phone: "+1 (809) 466-9102",
    serviceZone: "Concesión Turística Este",
    supplyType: "Industrial / Multipunto",
    estimatedMonthlyKwh: 3420,
    role: "client_enterprise",
    status: "pending",
    linkedPresetId: "negocio_punta_cana",
    createdAt: "2026-11-07T23:05:00Z",
    notes: "Evaluación de factibilidad solar fotovoltaica de 18 kWp en cubierta.",
  },
  {
    id: "usr-approved-01",
    fullName: "Familia Rodríguez · Unidad Naco",
    organizationOrUnit: "Residencia Metropolitana Sur",
    email: "demo.hogar@energia360.do",
    password: "DemoRD2026!",
    phone: "+1 (809) 567-1120",
    serviceZone: "Prestadora Zona Metropolitana / Sur",
    supplyType: "Residencial",
    estimatedMonthlyKwh: 682,
    role: "client_residential",
    status: "approved",
    linkedPresetId: "hogar_santo_domingo",
    createdAt: "2026-10-15T14:00:00Z",
    approvedAt: "2026-10-15T14:10:00Z",
    approvedBy: "admin@energia360.do",
  },
  {
    id: "usr-approved-02",
    fullName: "Apartamento Ejecutivo Cibao",
    organizationOrUnit: "Unidad Residencial Zona Norte",
    email: "demo.santiago@energia360.do",
    password: "DemoRD2026!",
    phone: "+1 (809) 241-3309",
    serviceZone: "Prestadora Zona Norte / Cibao",
    supplyType: "Residencial",
    estimatedMonthlyKwh: 332,
    role: "client_residential",
    status: "approved",
    linkedPresetId: "apartamento_santiago",
    createdAt: "2026-10-18T11:30:00Z",
    approvedAt: "2026-10-18T11:45:00Z",
    approvedBy: "admin@energia360.do",
  },
  {
    id: "usr-approved-03",
    fullName: "Comercio & Deli El Coral",
    organizationOrUnit: "Unidad Comercial Zona Este",
    email: "demo.negocio@energia360.do",
    password: "DemoRD2026!",
    phone: "+1 (809) 552-7781",
    serviceZone: "Concesión Turística Este",
    supplyType: "Comercial / PyME",
    estimatedMonthlyKwh: 1185,
    role: "client_enterprise",
    status: "approved",
    linkedPresetId: "negocio_punta_cana",
    createdAt: "2026-10-20T16:00:00Z",
    approvedAt: "2026-10-20T16:20:00Z",
    approvedBy: "admin@energia360.do",
  },
];

export function loadPlatformAccounts(): PlatformUserAccount[] {
  if (typeof window === "undefined") return INITIAL_PLATFORM_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(INITIAL_PLATFORM_ACCOUNTS)
      );
      return INITIAL_PLATFORM_ACCOUNTS;
    }
    const parsed = JSON.parse(raw) as PlatformUserAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_PLATFORM_ACCOUNTS;
    }
    return parsed;
  } catch {
    return INITIAL_PLATFORM_ACCOUNTS;
  }
}

export function savePlatformAccounts(accounts: PlatformUserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

export function registerNewClientAccount(input: {
  fullName: string;
  organizationOrUnit: string;
  email: string;
  password: string;
  phone: string;
  serviceZone: PlatformUserAccount["serviceZone"];
  supplyType: PlatformUserAccount["supplyType"];
  estimatedMonthlyKwh: number;
  notes?: string;
}): { account: PlatformUserAccount; allAccounts: PlatformUserAccount[] } {
  const existing = loadPlatformAccounts();
  const normalizedEmail = input.email.trim().toLowerCase();

  const dup = existing.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (dup) {
    throw new Error(
      "Ya existe una solicitud o cuenta registrada con este correo electrónico."
    );
  }

  let linkedPresetId: TestAccountPresetId = "hogar_santo_domingo";
  if (input.serviceZone === "Prestadora Zona Norte / Cibao") {
    linkedPresetId = "apartamento_santiago";
  } else if (
    input.supplyType !== "Residencial" ||
    input.serviceZone === "Concesión Turística Este"
  ) {
    linkedPresetId = "negocio_punta_cana";
  }

  const newAccount: PlatformUserAccount = {
    id: `usr-${Date.now()}`,
    fullName: input.fullName.trim(),
    organizationOrUnit:
      input.organizationOrUnit.trim() || "Unidad Energética Registrada",
    email: normalizedEmail,
    password: input.password,
    phone: input.phone.trim() || "+1 (809) 000-0000",
    serviceZone: input.serviceZone,
    supplyType: input.supplyType,
    estimatedMonthlyKwh: Number(input.estimatedMonthlyKwh) || 480,
    role:
      input.supplyType === "Residencial"
        ? "client_residential"
        : "client_enterprise",
    status: "pending",
    linkedPresetId,
    createdAt: new Date().toISOString(),
    notes:
      input.notes?.trim() ||
      "Solicitud de alta creada desde el portal público. Pendiente de validación por Super Admin.",
  };

  const updated = [newAccount, ...existing];
  savePlatformAccounts(updated);
  return { account: newAccount, allAccounts: updated };
}

export function authenticatePlatformUser(
  email: string,
  password: string
):
  | { ok: true; account: PlatformUserAccount }
  | {
      ok: false;
      reason: "not_found" | "wrong_password" | "pending_approval" | "rejected";
      message: string;
      account?: PlatformUserAccount;
    } {
  const accounts = loadPlatformAccounts();
  const normalized = email.trim().toLowerCase();
  const found = accounts.find((a) => a.email.toLowerCase() === normalized);

  if (!found) {
    return {
      ok: false,
      reason: "not_found",
      message:
        "No encontramos una cuenta con ese correo. Puedes crear tu solicitud en la pestaña 'Crear Cuenta'.",
    };
  }

  if (found.password !== password) {
    return {
      ok: false,
      reason: "wrong_password",
      message: "La contraseña introducida no coincide con este expediente.",
    };
  }

  if (found.status === "pending") {
    return {
      ok: false,
      reason: "pending_approval",
      account: found,
      message:
        "Tu cuenta fue creada correctamente pero se encuentra PENDIENTE DE APROBACIÓN por el Super Administrador de la plataforma.",
    };
  }

  if (found.status === "rejected") {
    return {
      ok: false,
      reason: "rejected",
      account: found,
      message:
        "El acceso de esta cuenta ha sido suspendido o rechazado por el Super Administrador.",
    };
  }

  return { ok: true, account: found };
}

export function updateAccountStatusBySuperAdmin(
  accountId: string,
  newStatus: AccountApprovalStatus,
  newRole?: PlatformUserRole
): PlatformUserAccount[] {
  const accounts = loadPlatformAccounts();
  const updated = accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    return {
      ...acc,
      status: newStatus,
      role: newRole || acc.role,
      approvedAt:
        newStatus === "approved" ? new Date().toISOString() : acc.approvedAt,
      approvedBy:
        newStatus === "approved" ? SUPER_ADMIN_CREDENTIALS.email : acc.approvedBy,
    };
  });
  savePlatformAccounts(updated);
  return updated;
}

export function deleteAccountBySuperAdmin(
  accountId: string
): PlatformUserAccount[] {
  const accounts = loadPlatformAccounts().filter(
    (a) => a.id !== accountId || a.role === "super_admin"
  );
  savePlatformAccounts(accounts);
  return accounts;
}

