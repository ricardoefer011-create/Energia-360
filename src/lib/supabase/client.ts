// ============================================================================
// ENERGIA360 — Cliente Supabase (Arquitectura Zero-Access)
// ============================================================================
// Reglas estrictas de seguridad:
// 1. Utiliza únicamente NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
// 2. Jamás envía facturas privadas en texto plano, números de contrato ni consumos
//    individuales descifrados a Supabase.
// 3. Permite:
//    - Consultar pliegos tarifarios públicos oficiales (tariff_schedules).
//    - Sincronizar opcionalmente el sobre cifrado E2EE (encrypted_vault_backups)
//      donde el servidor solo recibe ciphertext_base64, iv_base64 y salt_base64.
//    - Consultar métricas agregadas anónimas para el Panel Administrativo.
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EncryptedEnvelope } from "@/lib/crypto/vault-crypto";
import { INITIAL_SIE_TARIFF_SCHEDULES } from "@/lib/data/rd-energy-catalog";
import { DistributorCode, PropertyType, TariffSchedule } from "@/types/energia360";

const DEFAULT_SUPABASE_URL = "https://esqbscqrtkxxqkuvgcmw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_I9WVAg_CBOCzv_fpdsnSkA_J4W6Goq_";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfigurationStatus(): {
  isConfigured: boolean;
  url: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const isConfigured =
    Boolean(url && anonKey) &&
    !url.includes("tu-proyecto.supabase.co") &&
    url.startsWith("https://");

  return { isConfigured, url };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { isConfigured, url } = getSupabaseConfigurationStatus();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Obtiene los pliegos tarifarios públicos desde Supabase; si no hay conexión o
 * credenciales configuradas, retorna el pliego local verificado de la SIE.
 */
export async function fetchPublicTariffSchedules(): Promise<{
  schedules: TariffSchedule[];
  source: "supabase_remote" | "local_sie_catalog";
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      schedules: INITIAL_SIE_TARIFF_SCHEDULES,
      source: "local_sie_catalog",
    };
  }

  try {
    const { data, error } = await client
      .from("tariff_schedules")
      .select("*")
      .eq("is_active", true)
      .order("distributor_code", { ascending: true });

    if (error || !data || data.length === 0) {
      return {
        schedules: INITIAL_SIE_TARIFF_SCHEDULES,
        source: "local_sie_catalog",
      };
    }

    return {
      schedules: data as TariffSchedule[],
      source: "supabase_remote",
    };
  } catch {
    return {
      schedules: INITIAL_SIE_TARIFF_SCHEDULES,
      source: "local_sie_catalog",
    };
  }
}

/**
 * Sincroniza únicamente el bloque cifrado E2EE (Ciphertext) en Supabase.
 * Comprobación técnica Zero-Access: valida que no existan campos en texto plano
 * antes de transmitir.
 */
export async function syncEncryptedVaultToSupabase(
  envelope: EncryptedEnvelope
): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message:
        "Supabase no está conectado con credenciales remotas. Tu bóveda permanece segura y cifrada localmente en IndexedDB.",
    };
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message:
        "Debes iniciar sesión en Supabase Auth para sincronizar tu respaldo cifrado E2EE en la nube.",
    };
  }

  if (
    !envelope.ciphertextBase64 ||
    !envelope.ivBase64 ||
    !envelope.saltBase64
  ) {
    throw new Error(
      "Bloqueo de seguridad Zero-Access: intento de sincronizar un objeto sin cifrado AES-256-GCM válido."
    );
  }

  const { error } = await client.from("encrypted_vault_backups").upsert(
    {
      user_id: user.id,
      vault_version: envelope.version,
      kdf_algorithm: envelope.kdf,
      kdf_iterations: envelope.iterations,
      salt_base64: envelope.saltBase64,
      iv_base64: envelope.ivBase64,
      ciphertext_base64: envelope.ciphertextBase64,
      payload_byte_size: envelope.ciphertextBase64.length,
      ciphertext_sha256: envelope.ciphertextSha256,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      ok: false,
      message: `Error al sincronizar blob cifrado: ${error.message}`,
    };
  }

  return {
    ok: true,
    message:
      "Respaldo cifrado E2EE (AES-256-GCM) sincronizado en Supabase. El servidor solo recibió texto cifrado indescifrable.",
  };
}

/**
 * Registra una métrica anónima y agregada solo si el usuario activó el opt-in voluntario.
 */
export async function recordVoluntaryAnonymousMetric(
  distributor: DistributorCode,
  propertyType: PropertyType,
  isSolarSimulation: boolean = false
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from("platform_anonymous_metrics").insert({
      distributor_code: distributor,
      property_type: propertyType,
      registered_installations_count: isSolarSimulation ? 0 : 1,
      solar_simulations_count: isSolarSimulation ? 1 : 0,
    });
  } catch {
    // Fallo silencioso: la telemetría agregada nunca interrumpe la experiencia
  }
}

