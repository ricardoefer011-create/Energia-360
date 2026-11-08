"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import {
  AccountApprovalStatus,
  PlatformUserAccount,
  PlatformUserRole,
  SUPER_ADMIN_CREDENTIALS,
} from "@/lib/auth/platform-accounts";
import { TestAccountPresetId } from "@/lib/data/rd-energy-catalog";

interface SuperAdminGovernanceModuleProps {
  accounts: PlatformUserAccount[];
  currentAccount: PlatformUserAccount | null;
  onApproveOrChangeStatus: (
    accountId: string,
    newStatus: AccountApprovalStatus,
    newRole?: PlatformUserRole
  ) => void;
  onDeleteAccount: (accountId: string) => void;
  onCreatePreApprovedUser: (input: {
    fullName: string;
    organizationOrUnit: string;
    email: string;
    password: string;
    phone: string;
    serviceZone: PlatformUserAccount["serviceZone"];
    supplyType: PlatformUserAccount["supplyType"];
    estimatedMonthlyKwh: number;
  }) => void;
  onInspectUserPreset: (presetId: TestAccountPresetId, userName: string) => void;
}

export function SuperAdminGovernanceModule({
  accounts,
  currentAccount,
  onApproveOrChangeStatus,
  onDeleteAccount,
  onCreatePreApprovedUser,
  onInspectUserPreset,
}: SuperAdminGovernanceModuleProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Estado para alta directa por Super Admin
  const [fullName, setFullName] = useState("");
  const [organizationOrUnit, setOrganizationOrUnit] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Acceso360!");
  const [phone, setPhone] = useState("+1 (809) ");
  const [serviceZone, setServiceZone] = useState<
    PlatformUserAccount["serviceZone"]
  >("Prestadora Zona Metropolitana / Sur");
  const [supplyType, setSupplyType] =
    useState<PlatformUserAccount["supplyType"]>("Comercial / PyME");
  const [estimatedMonthlyKwh, setEstimatedMonthlyKwh] = useState<number>(950);
  const [formError, setFormError] = useState<string | null>(null);

  const pendingCount = accounts.filter((a) => a.status === "pending").length;
  const approvedCount = accounts.filter((a) => a.status === "approved").length;
  const rejectedCount = accounts.filter((a) => a.status === "rejected").length;
  const totalManagedKwh = accounts
    .filter((a) => a.status === "approved")
    .reduce((sum, a) => sum + (a.estimatedMonthlyKwh || 0), 0);

  const filteredAccounts = accounts.filter((acc) => {
    if (statusFilter !== "all" && acc.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.fullName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.organizationOrUnit.toLowerCase().includes(q) ||
      acc.serviceZone.toLowerCase().includes(q)
    );
  });

  function handleDirectCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError("Completa el nombre, correo y contraseña.");
      return;
    }
    try {
      onCreatePreApprovedUser({
        fullName,
        organizationOrUnit,
        email,
        password,
        phone,
        serviceZone,
        supplyType,
        estimatedMonthlyKwh,
      });
      setFullName("");
      setOrganizationOrUnit("");
      setEmail("");
      setShowNewUserForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo crear la cuenta."
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* BANNER EJECUTIVO DE SUPER ADMIN (#091197) */}
      <div className="rounded-[12px] bg-[#091197] text-white p-6 sm:p-8 border border-[#091197] relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(3,169,236,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(3,169,236,0.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#03A9EC] text-white text-[11px] font-extrabold uppercase tracking-[0.12em] mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              CONSOLA MAESTRA DE GOBERNANZA · SUPER ADMINISTRADOR
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
              CONTROL DE ACCESOS, APROBACIONES Y TELEMETRÍA GLOBAL
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
              Sesión activa:{" "}
              <strong className="text-[#03A9EC]">
                {currentAccount?.email || SUPER_ADMIN_CREDENTIALS.email}
              </strong>
              . Ningún usuario registrado en el portal público puede ingresar al
              sistema sin tu aprobación expresa.
            </p>
          </div>

          <button
            onClick={() => setShowNewUserForm((prev) => !prev)}
            className="inline-flex items-center gap-2.5 h-[48px] px-5 rounded-[10px] bg-white hover:bg-[#03A9EC] text-[#091197] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {showNewUserForm
                ? "Cerrar Formulario"
                : "+ Alta Directa de Cliente Aprobado"}
            </span>
          </button>
        </div>
      </div>

      {/* 4 TARJETAS DE CIFRAS DE GOBERNANZA (.citemicon style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer rounded-[12px] p-6 border transition-all flex flex-col justify-between ${
            pendingCount > 0
              ? "bg-white border-2 border-[#F75600] shadow-md"
              : "bg-white border-[#D9D9D9]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              PENDIENTES DE APROBACIÓN
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F75600]/15 text-[#F75600] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-[#F75600] tabular-nums">
              {pendingCount}
            </div>
            <p className="text-xs text-[#4B528A] mt-1 font-semibold">
              Solicitudes esperando validación del Super Admin
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className="cursor-pointer bg-white rounded-[12px] p-6 border border-[#D9D9D9] hover:border-[#03A9EC] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              CUENTAS APROBADAS ACTIVAS
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-[#091197] tabular-nums">
              {approvedCount}
            </div>
            <p className="text-xs text-[#4B528A] mt-1 font-semibold">
              Usuarios con credenciales habilitadas
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("all")}
          className="cursor-pointer bg-white rounded-[12px] p-6 border border-[#D9D9D9] hover:border-[#03A9EC] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              ENERGÍA BAJO AUDITORÍA
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#091197] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#03A9EC]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#03A9EC] tabular-nums">
              {totalManagedKwh.toLocaleString("es-DO")}{" "}
              <span className="text-sm font-bold text-[#091197]">kWh/mes</span>
            </div>
            <p className="text-xs text-[#4B528A] mt-1 font-semibold">
              Volumen energético agregado de cuentas activas
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className="cursor-pointer bg-white rounded-[12px] p-6 border border-[#D9D9D9] hover:border-[#03A9EC] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4B528A]">
              ACCESOS REVOCADOS
            </span>
            <div className="w-10 h-10 rounded-[10px] bg-[#F1F1F1] text-[#4B528A] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-[#091197] tabular-nums">
              {rejectedCount}
            </div>
            <p className="text-xs text-[#4B528A] mt-1 font-semibold">
              Solicitudes rechazadas o suspendidas
            </p>
          </div>
        </div>
      </div>

      {/* FORMULARIO DESPLEGABLE DE ALTA DIRECTA POR SUPER ADMIN */}
      {showNewUserForm && (
        <form
          onSubmit={handleDirectCreate}
          className="bg-white rounded-[12px] border-2 border-[#03A9EC] p-6 sm:p-8 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D9]">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
                CREACIÓN INMEDIATA CON ESTADO PRE-APROBADO
              </span>
              <h3 className="text-xl font-extrabold uppercase text-[#091197]">
                REGISTRAR Y HABILITAR NUEVO CLIENTE EN LA PLATAFORMA
              </h3>
            </div>
          </div>

          {formError && (
            <div className="p-3.5 rounded-[10px] bg-[#F75600]/10 border border-[#F75600] text-xs font-bold text-[#F75600] flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Nombre Completo / Titular
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Ing. Héctor Méndez"
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Empresa o Unidad Residencial
              </label>
              <input
                type="text"
                required
                value={organizationOrUnit}
                onChange={(e) => setOrganizationOrUnit(e.target.value)}
                placeholder="Ej. Grupo Industrial del Caribe"
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Correo Electrónico (Login)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hmendez@empresa.do"
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Contraseña Asignada
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-mono font-bold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Prestadora de Servicio / Demarcación
              </label>
              <select
                value={serviceZone}
                onChange={(e) =>
                  setServiceZone(
                    e.target.value as PlatformUserAccount["serviceZone"]
                  )
                }
                className="w-full h-11 px-3 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              >
                <option value="Prestadora Zona Metropolitana / Sur">
                  Prestadora Zona Metropolitana / Sur
                </option>
                <option value="Prestadora Zona Norte / Cibao">
                  Prestadora Zona Norte / Cibao
                </option>
                <option value="Prestadora Zona Oriental">
                  Prestadora Zona Oriental
                </option>
                <option value="Concesión Turística Este">
                  Concesión Turística Este
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Categoría de Suministro
              </label>
              <select
                value={supplyType}
                onChange={(e) =>
                  setSupplyType(
                    e.target.value as PlatformUserAccount["supplyType"]
                  )
                }
                className="w-full h-11 px-3 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial / PyME">Comercial / PyME</option>
                <option value="Industrial / Multipunto">
                  Industrial / Multipunto
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Consumo Mensual Estimado (kWh)
              </label>
              <input
                type="number"
                min={50}
                value={estimatedMonthlyKwh}
                onChange={(e) =>
                  setEstimatedMonthlyKwh(Number(e.target.value) || 400)
                }
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-extrabold text-[#091197]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-[#091197] mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-bold text-[#091197]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowNewUserForm(false)}
              className="px-5 py-2.5 rounded-[10px] bg-[#F1F1F1] text-xs font-extrabold uppercase text-[#4B528A]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-[10px] bg-[#091197] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase inline-flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear y Aprobar Cuenta Ahora
            </button>
          </div>
        </form>
      )}

      {/* BANDEJA DE SOLICITUDES Y CUENTAS DE USUARIOS */}
      <div className="bg-white rounded-[12px] border border-[#D9D9D9] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-[#D9D9D9]">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#03A9EC]">
              DIRECTORIO DE CUENTAS Y CONTROL DE ACCESO
            </span>
            <h3 className="font-extrabold text-xl uppercase text-[#091197] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#03A9EC]" />
              SOLICITUDES DE ALTA Y EXPEDIENTES ({filteredAccounts.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o empresa..."
              className="h-10 px-3.5 rounded-[8px] bg-[#F1F1F1] border border-[#D9D9D9] text-xs font-semibold text-[#091197] focus:outline-none focus:border-[#03A9EC]"
            />

            <div className="inline-flex rounded-[10px] bg-[#F1F1F1] p-1 border border-[#D9D9D9] text-xs font-extrabold uppercase">
              {(
                [
                  { id: "all", label: `Todas (${accounts.length})` },
                  { id: "pending", label: `Pendientes (${pendingCount})` },
                  { id: "approved", label: `Aprobadas (${approvedCount})` },
                  { id: "rejected", label: `Suspendidas (${rejectedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-[7px] transition cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-[#091197] text-white"
                      : "text-[#091197] hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAccounts.map((acc) => {
            const isPending = acc.status === "pending";
            const isApproved = acc.status === "approved";
            const isSuperAdmin = acc.role === "super_admin";

            return (
              <div
                key={acc.id}
                className={`rounded-[12px] p-5 sm:p-6 border transition-all ${
                  isPending
                    ? "bg-[#F75600]/[0.04] border-2 border-[#F75600]"
                    : "bg-[#F1F1F1]/60 border-[#D9D9D9] hover:border-[#03A9EC] hover:bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-[6px] bg-[#F75600] text-white text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDIENTE DE APROBACIÓN
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-[6px] bg-[#008A5E] text-white text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ACCESO APROBADO
                        </span>
                      )}
                      {acc.status === "rejected" && (
                        <span className="px-2.5 py-1 rounded-[6px] bg-[#4B528A] text-white text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" /> ACCESO SUSPENDIDO
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-[6px] bg-[#091197] text-white text-[10px] font-extrabold uppercase tracking-wider">
                        {isSuperAdmin
                          ? "ROL: SUPER ADMIN"
                          : acc.supplyType.toUpperCase()}
                      </span>

                      <span className="px-2.5 py-1 rounded-[6px] bg-white border border-[#D9D9D9] text-[#091197] text-[10px] font-extrabold uppercase">
                        {acc.serviceZone}
                      </span>
                    </div>

                    <h4 className="text-lg sm:text-xl font-extrabold uppercase text-[#091197]">
                      {acc.fullName}{" "}
                      <span className="text-[#03A9EC] font-bold">
                        · {acc.organizationOrUnit}
                      </span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#4B528A] font-semibold">
                      <span>
                        Correo:{" "}
                        <strong className="text-[#091197] font-mono">
                          {acc.email}
                        </strong>
                      </span>
                      <span>
                        Clave:{" "}
                        <strong className="text-[#091197] font-mono">
                          {acc.password}
                        </strong>
                      </span>
                      <span>Tel: {acc.phone}</span>
                      <span>
                        Volumen estimado:{" "}
                        <strong className="text-[#03A9EC]">
                          {acc.estimatedMonthlyKwh.toLocaleString("es-DO")} kWh/mes
                        </strong>
                      </span>
                    </div>

                    {acc.notes && (
                      <p className="text-xs text-[#4B528A] italic pt-1">
                        “{acc.notes}”
                      </p>
                    )}
                  </div>

                  {/* BOTONES DE ACCIÓN DEL SUPER ADMIN */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isSuperAdmin && isPending && (
                      <>
                        <button
                          onClick={() =>
                            onApproveOrChangeStatus(acc.id, "approved")
                          }
                          className="h-10 px-4 rounded-[8px] bg-[#008A5E] hover:bg-[#091197] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Aprobar Cuenta
                        </button>
                        <button
                          onClick={() =>
                            onApproveOrChangeStatus(acc.id, "rejected")
                          }
                          className="h-10 px-3.5 rounded-[8px] bg-white border border-[#F75600] text-[#F75600] hover:bg-[#F75600] hover:text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {!isSuperAdmin && isApproved && (
                      <button
                        onClick={() =>
                          onApproveOrChangeStatus(acc.id, "rejected")
                        }
                        className="h-10 px-3.5 rounded-[8px] bg-white border border-[#D9D9D9] hover:border-[#F75600] text-[#4B528A] hover:text-[#F75600] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Suspender Acceso
                      </button>
                    )}

                    {!isSuperAdmin && acc.status === "rejected" && (
                      <button
                        onClick={() =>
                          onApproveOrChangeStatus(acc.id, "approved")
                        }
                        className="h-10 px-4 rounded-[8px] bg-[#03A9EC] hover:bg-[#091197] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Reactivar y Aprobar
                      </button>
                    )}

                    <button
                      onClick={() =>
                        onInspectUserPreset(acc.linkedPresetId, acc.fullName)
                      }
                      className="h-10 px-3.5 rounded-[8px] bg-[#091197] hover:bg-[#03A9EC] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Auditar Datos</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {!isSuperAdmin && (
                      <button
                        onClick={() => onDeleteAccount(acc.id)}
                        title="Eliminar registro"
                        className="h-10 w-10 rounded-[8px] bg-white border border-[#D9D9D9] hover:border-[#F75600] text-[#4B528A] hover:text-[#F75600] flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

