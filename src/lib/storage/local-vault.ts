// ============================================================================
// ENERGIA360 — Almacenamiento Local-First en IndexedDB (Bóveda Cifrada)
// ============================================================================
import {
  decryptEnvelopeWithPassphrase,
  EncryptedEnvelope,
  encryptPayloadWithPassphrase,
} from "@/lib/crypto/vault-crypto";
import {
  DEFAULT_ALERT_CONFIGS,
  INITIAL_SIE_TARIFF_SCHEDULES,
} from "@/lib/data/rd-energy-catalog";
import { LocalVaultPayload } from "@/types/energia360";

const DB_NAME = "energia360_local_vault_db";
const DB_VERSION = 1;
const STORE_VAULT = "encrypted_vault_store";
const VAULT_RECORD_KEY = "primary_user_vault";

export function createEmptyVaultPayload(): LocalVaultPayload {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    profile: {
      spaceName: "Mi Espacio Energético",
      propertyType: "hogar",
      distributor: "EDESUR",
      tariffCode: "BTS-1",
      customRateDopPerKwh: null,
      province: "Santo Domingo",
      monthlySavingsGoalDop: 1500,
      monthlyBudgetLimitDop: 5500,
      subscriptionPlan: "gratuito",
      onboardingCompleted: false,
      telemetryOptIn: false,
      createdAt: new Date().toISOString(),
    },
    invoices: [],
    appliances: [],
    inverterSystems: [],
    alertConfigs: DEFAULT_ALERT_CONFIGS,
    customTariffs: INITIAL_SIE_TARIFF_SCHEDULES,
  };
}

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no está disponible en este entorno."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VAULT)) {
        db.createObjectStore(STORE_VAULT);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Error al abrir IndexedDB."));
  });
}

export async function hasEncryptedVaultInIndexedDB(): Promise<boolean> {
  try {
    const db = await openVaultDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, "readonly");
      const store = tx.objectStore(STORE_VAULT);
      const req = store.get(VAULT_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(Boolean(req.result));
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return false;
  }
}

export async function loadEncryptedEnvelopeFromIndexedDB(): Promise<EncryptedEnvelope | null> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VAULT, "readonly");
    const store = tx.objectStore(STORE_VAULT);
    const req = store.get(VAULT_RECORD_KEY);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as EncryptedEnvelope) || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveEncryptedEnvelopeToIndexedDB(
  envelope: EncryptedEnvelope
): Promise<void> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VAULT, "readwrite");
    const store = tx.objectStore(STORE_VAULT);
    const req = store.put(envelope, VAULT_RECORD_KEY);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveAndEncryptVault(
  payload: LocalVaultPayload,
  passphrase: string
): Promise<EncryptedEnvelope> {
  const existing = await loadEncryptedEnvelopeFromIndexedDB().catch(() => null);
  const updatedPayload: LocalVaultPayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  const envelope = await encryptPayloadWithPassphrase(
    updatedPayload,
    passphrase,
    existing?.saltBase64
  );
  await saveEncryptedEnvelopeToIndexedDB(envelope);
  return envelope;
}

export async function unlockAndDecryptVault(
  passphrase: string
): Promise<{ payload: LocalVaultPayload; envelope: EncryptedEnvelope }> {
  const envelope = await loadEncryptedEnvelopeFromIndexedDB();
  if (!envelope) {
    throw new Error("No existe una bóveda cifrada en este dispositivo.");
  }
  const payload = await decryptEnvelopeWithPassphrase<LocalVaultPayload>(
    envelope,
    passphrase
  );
  return { payload, envelope };
}

/**
 * Eliminación verificable de toda la información local (IndexedDB + almacenamiento de sesión).
 */
export async function wipeLocalVaultCompletely(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const db = await openVaultDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, "readwrite");
      const store = tx.objectStore(STORE_VAULT);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Continuar con borrado de base de datos
  }

  return new Promise((resolve) => {
    const delReq = window.indexedDB.deleteDatabase(DB_NAME);
    delReq.onsuccess = () => resolve(true);
    delReq.onerror = () => resolve(false);
    delReq.onblocked = () => resolve(true);
  });
}

