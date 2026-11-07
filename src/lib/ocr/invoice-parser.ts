// ============================================================================
// ENERGIA360 — Analizador Local de Facturas Eléctricas (OCR + Parser RD)
// ============================================================================
// Procesa archivos PDF, JPG, JPEG y PNG 100% en el navegador del usuario.
// Identifica formatos de EDESUR, EDENORTE, EDEESTE y CEPM sin enviar el
// documento a ningún servidor externo.
// ============================================================================

import {
  DataProvenanceStatus,
  DistributorCode,
  ElectricityInvoice,
  FieldWithProvenance,
} from "@/types/energia360";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB límite de seguridad

export interface LocalInvoiceExtractionResult {
  rawTextSnippet: string;
  draftInvoice: ElectricityInvoice;
  detectedFormat: string;
  warnings: string[];
}

export function validateInvoiceFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No se seleccionó ningún archivo." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExt = ["pdf", "jpg", "jpeg", "png"].includes(ext);
  if (!ALLOWED_MIME_TYPES.includes(file.type) && !validExt) {
    return {
      valid: false,
      error:
        "Tipo de archivo no permitido. Solo se admiten facturas en PDF, JPG, JPEG o PNG.",
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "El archivo supera el límite de seguridad de 12 MB.",
    };
  }
  return { valid: true };
}

/**
 * Extrae texto localmente de un archivo PDF o imagen (JPG/PNG) sin subirlo a servidores.
 */
export async function extractTextFromLocalFile(
  file: File,
  onProgress?: (stage: string, pct: number) => void
): Promise<string> {
  const validation = validateInvoiceFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    onProgress?.("Leyendo estructura del PDF en memoria local...", 25);
    const buffer = await file.arrayBuffer();
    const extractedPdfText = extractReadableTextFromPdfBuffer(buffer);
    onProgress?.("Texto extraído localmente y archivo descartado de RAM.", 100);
    return extractedPdfText;
  }

  // Imagen JPG / PNG -> OCR Local en el navegador mediante Tesseract.js WebWorker
  onProgress?.("Iniciando motor OCR local en tu navegador (Tesseract.js)...", 15);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa");
  onProgress?.("Analizando caracteres de la factura localmente...", 55);
  const ret = await worker.recognize(file);
  await worker.terminate();
  onProgress?.("Reconocimiento óptico finalizado localmente.", 100);
  return ret.data.text || "";
}

/**
 * Extractor ligero de cadenas de texto desde flujos PDF en memoria del cliente.
 */
function extractReadableTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);

  const chunks: string[] = [];
  // Extraer bloques entre paréntesis de operadores PDF Tj / TJ
  const regexParens = /\(([^()\\]{2,200})\)/g;
  let match: RegExpExecArray | null;
  while ((match = regexParens.exec(raw)) !== null) {
    const cleaned = match[1].replace(/[^\x20-\x7EÁÉÍÓÚáéíóúÑñ$.,:/-]/g, " ").trim();
    if (cleaned.length >= 2) {
      chunks.push(cleaned);
    }
  }

  if (chunks.length > 5) {
    return chunks.join(" ");
  }

  // Fallback a secuencias legibles ASCII/Latin1 dentro del binario
  const fallbackMatches = raw.match(/[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ$.,:/\s-]{4,}/g) || [];
  return fallbackMatches.slice(0, 800).join(" ");
}

function makeField<T>(
  value: T,
  status: DataProvenanceStatus
): FieldWithProvenance<T> {
  return { value, status };
}

/**
 * Parsea texto crudo de una factura dominicana (EDESUR, EDENORTE, EDEESTE, CEPM)
 * y etiqueta el origen de cada campo para revisión manual obligatoria del usuario.
 */
export function parseDominicanInvoiceText(
  rawText: string,
  fileName: string = ""
): LocalInvoiceExtractionResult {
  const normalized = `${fileName} ${rawText}`.replace(/\s+/g, " ").trim();
  const upper = normalized.toUpperCase();
  const warnings: string[] = [];

  // 1. Identificar Distribuidora
  let distributor: DistributorCode = "EDESUR";
  let distributorStatus: DataProvenanceStatus = "estimado";
  if (upper.includes("EDENORTE")) {
    distributor = "EDENORTE";
    distributorStatus = "extraido_automatico";
  } else if (upper.includes("EDEESTE") || upper.includes("EDE ESTE")) {
    distributor = "EDEESTE";
    distributorStatus = "extraido_automatico";
  } else if (upper.includes("CEPM") || upper.includes("CONSORCIO ENERGETICO")) {
    distributor = "CEPM";
    distributorStatus = "extraido_automatico";
  } else if (upper.includes("EDESUR")) {
    distributor = "EDESUR";
    distributorStatus = "extraido_automatico";
  } else {
    warnings.push(
      "No se detectó explícitamente el nombre de la distribuidora; se preseleccionó EDESUR como valor editable."
    );
  }

  // 2. Identificar NIC / NIS / Contrato
  const nicMatch = normalized.match(
    /(?:NIC|NIS|CONTRATO|CUENTA|SUMINISTRO)[:\s#-]*([0-9]{6,12})/i
  );
  const contractNumber = nicMatch ? nicMatch[1] : "";
  const contractStatus: DataProvenanceStatus = nicMatch
    ? "extraido_automatico"
    : "no_disponible";

  // 3. Identificar Tarifa (BTS-1, BTS-2, etc.)
  const tariffMatch = upper.match(/\b(BTS\s*-?\s*1|BTS\s*-?\s*2|BTD|MTD)\b/);
  const tariffCode = tariffMatch
    ? tariffMatch[1].replace(/\s+/g, "").replace("BTS1", "BTS-1").replace("BTS2", "BTS-2")
    : distributor === "CEPM"
    ? "RES-CEPM"
    : "BTS-1";
  const tariffStatus: DataProvenanceStatus = tariffMatch
    ? "extraido_automatico"
    : "estimado";

  // 4. Identificar Consumo en kWh
  const kwhMatch =
    normalized.match(/(?:CONSUMO|ENERGIA|FACTURADO|LECTURA)[^0-9]{0,25}([0-9]{2,5}(?:\.[0-9]{1,2})?)\s*KWH/i) ||
    normalized.match(/([0-9]{2,5}(?:\.[0-9]{1,2})?)\s*KWH/i);
  const parsedKwh = kwhMatch ? parseFloat(kwhMatch[1]) : 0;
  const kwhStatus: DataProvenanceStatus =
    parsedKwh > 0 ? "extraido_automatico" : "no_disponible";

  if (parsedKwh <= 0) {
    warnings.push(
      "No se pudo extraer con certeza el consumo en kWh; por favor introdúcelo o verifícalo en el formulario de revisión."
    );
  }

  // 5. Identificar Total a Pagar (RD$)
  const totalMatch =
    normalized.match(
      /(?:TOTAL\s+A\s+PAGAR|TOTAL\s+FACTURA|MONTO\s+TOTAL|IMPORTE\s+TOTAL)[^0-9]{0,20}(?:RD\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]{3,6}(?:\.[0-9]{2})?)/i
    ) ||
    normalized.match(
      /RD\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{3,6}\.[0-9]{2})/i
    );

  const parsedTotalDop = totalMatch
    ? parseFloat(totalMatch[1].replace(/,/g, ""))
    : 0;
  const totalStatus: DataProvenanceStatus =
    parsedTotalDop > 0 ? "extraido_automatico" : "no_disponible";

  // 6. Cargo fijo e importe de energía
  const fixedChargeDop = parsedKwh > 100 ? 128.59 : parsedKwh > 0 ? 40.84 : 0;
  const energyChargeDop =
    parsedTotalDop > fixedChargeDop
      ? Math.round((parsedTotalDop - fixedChargeDop) * 100) / 100
      : 0;

  // Fechas por defecto (último ciclo de 30 días)
  const today = new Date();
  const endStr = today.toISOString().slice(0, 10);
  const startObj = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const startStr = startObj.toISOString().slice(0, 10);
  const dueObj = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
  const dueStr = dueObj.toISOString().slice(0, 10);

  const draftInvoice: ElectricityInvoice = {
    id: `inv-${Date.now()}`,
    distributor: makeField(distributor, distributorStatus),
    contractNumber: makeField(contractNumber, contractStatus),
    billingPeriodStart: makeField(startStr, "estimado"),
    billingPeriodEnd: makeField(endStr, "estimado"),
    billingDays: makeField(30, "estimado"),
    issueDate: makeField(endStr, "estimado"),
    dueDate: makeField(dueStr, "estimado"),
    billedKwh: makeField(parsedKwh, kwhStatus),
    energyChargeDop: makeField(
      energyChargeDop,
      energyChargeDop > 0 ? "estimado" : "no_disponible"
    ),
    fixedChargeDop: makeField(
      fixedChargeDop,
      fixedChargeDop > 0 ? "estimado" : "no_disponible"
    ),
    additionalChargesDop: makeField(0, "no_disponible"),
    taxesDop: makeField(0, "no_disponible"),
    pendingBalanceDop: makeField(0, "no_disponible"),
    totalAmountDop: makeField(parsedTotalDop, totalStatus),
    tariffCode: makeField(tariffCode, tariffStatus),
    confirmedByUserAt: "",
    notes: `Analizada localmente desde archivo (${fileName || "texto manual"}). Documento original descartado tras el análisis.`,
  };

  return {
    rawTextSnippet: normalized.slice(0, 350),
    draftInvoice,
    detectedFormat: `${distributor} (${tariffCode})`,
    warnings,
  };
}

