// ============================================================================
// ENERGIA360 — Módulo Criptográfico Zero-Access (Web Crypto API)
// ============================================================================
// Implementa:
// - Derivación de clave maestra mediante PBKDF2-HMAC-SHA256 (310,000 iteraciones OWASP).
// - Cifrado autenticado AES-256-GCM con IV aleatorio de 96 bits (12 bytes) por operación.
// - Verificación de integridad SHA-256 del bloque cifrado.
// - Las claves privadas NUNCA se exportan en texto plano ni se envían a servidores.
// ============================================================================

export const PBKDF2_ITERATIONS = 310000;

export interface EncryptedEnvelope {
  version: 1;
  cipher: "AES-256-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  ciphertextSha256: string;
  encryptedAt: string;
}

function getCryptoSubtle(): SubtleCrypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error(
    "Web Crypto API no está disponible en este entorno. Asegúrate de usar un contexto seguro (HTTPS o localhost)."
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateRandomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const subtle = getCryptoSubtle();
  const hashBuffer = await subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deriva una llave AES-256-GCM no extraíble a partir de la contraseña maestra del usuario.
 */
export async function deriveMasterKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error(
      "La contraseña maestra debe tener al menos 8 caracteres para garantizar entropía criptográfica."
    );
  }
  const subtle = getCryptoSubtle();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer.slice(
        salt.byteOffset,
        salt.byteOffset + salt.byteLength
      ) as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // extractable = false: impide exportar la clave de la memoria WebCrypto
    ["encrypt", "decrypt"]
  );
}

/**
 * Cifra cualquier objeto serializable con AES-256-GCM y devuelve un sobre autenticado.
 */
export async function encryptPayloadWithPassphrase<T>(
  payload: T,
  passphrase: string,
  existingSaltBase64?: string
): Promise<EncryptedEnvelope> {
  const subtle = getCryptoSubtle();
  const salt = existingSaltBase64
    ? base64ToBytes(existingSaltBase64)
    : generateRandomBytes(16);
  const iv = generateRandomBytes(12); // 96-bit IV recomendado por NIST para AES-GCM

  const key = await deriveMasterKey(passphrase, salt, PBKDF2_ITERATIONS);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(payload));

  const ciphertextBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv.buffer.slice(
        iv.byteOffset,
        iv.byteOffset + iv.byteLength
      ) as ArrayBuffer,
    },
    key,
    plaintextBytes
  );

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const digestHex = await sha256Hex(ciphertextBytes);

  return {
    version: 1,
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    saltBase64: bytesToBase64(salt),
    ivBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(ciphertextBytes),
    ciphertextSha256: digestHex,
    encryptedAt: new Date().toISOString(),
  };
}

/**
 * Descifra y verifica la autenticidad (GCM Auth Tag + SHA-256) de un sobre cifrado.
 */
export async function decryptEnvelopeWithPassphrase<T>(
  envelope: EncryptedEnvelope,
  passphrase: string
): Promise<T> {
  const subtle = getCryptoSubtle();
  const salt = base64ToBytes(envelope.saltBase64);
  const iv = base64ToBytes(envelope.ivBase64);
  const ciphertextBytes = base64ToBytes(envelope.ciphertextBase64);

  const computedHash = await sha256Hex(ciphertextBytes);
  if (computedHash !== envelope.ciphertextSha256) {
    throw new Error(
      "Alerta de integridad: la huella SHA-256 del bloque cifrado no coincide."
    );
  }

  const key = await deriveMasterKey(
    passphrase,
    salt,
    envelope.iterations || PBKDF2_ITERATIONS
  );

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv.buffer.slice(
          iv.byteOffset,
          iv.byteOffset + iv.byteLength
        ) as ArrayBuffer,
      },
      key,
      ciphertextBytes.buffer.slice(
        ciphertextBytes.byteOffset,
        ciphertextBytes.byteOffset + ciphertextBytes.byteLength
      ) as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  } catch {
    throw new Error(
      "Contraseña maestra incorrecta o datos cifrados alterados (falló la verificación AES-256-GCM)."
    );
  }
}

