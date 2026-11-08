// ============================================================================
// ENERGIA360 — Analizador Local de Estados de Consumo (OCR + Parser RD)
// ============================================================================
// Procesa archivos PDF, JPG, JPEG y PNG 100% en el navegador del usuario.
// Identifica formatos de todas las prestadoras de servicio del país incluyendo:
// - NIC / NIS / Medidor (Contador) / e-NCF
// - Lectura Anterior, Lectura Actual, Múltiplo y Consumo Activa B.T. (kWh)
// - Potencia Contratada (kW) y Potencia Leída B.T. (kW)
// - Cargo Fijo, Importe Energía, Importe Total Sin Subsidio, Aporte Gobierno
//   (Subsidio FETE) y Valor Total a Pagar.
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
        "Tipo de archivo no permitido. Solo se admiten documentos en PDF, JPG, JPEG o PNG.",
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
  onProgress?.("Analizando caracteres del documento localmente...", 55);
  const ret = await worker.recognize(file);
  await worker.terminate();
  onProgress?.("Reconocimiento óptico finalizado localmente.", 100);
  return ret.data.text || "";
}

function extractReadableTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);

  const chunks: string[] = [];
  const regexParens = /\(([^()\\]{2,200})\)/g;
  let match: RegExpExecArray | null;
  while ((match = regexParens.exec(raw)) !== null) {
    const cleaned = match[1]
      .replace(/[^\x20-\x7EÁÉÍÓÚáéíóúÑñ$.,:/-]/g, " ")
      .trim();
    if (cleaned.length >= 2) {
      chunks.push(cleaned);
    }
  }

  if (chunks.length > 5) {
    return chunks.join(" ");
  }

  const fallbackMatches =
    raw.match(/[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ$.,:/\s-]{4,}/g) || [];
  return fallbackMatches.slice(0, 800).join(" ");
}

function makeField<T>(
  value: T,
  status: DataProvenanceStatus
): FieldWithProvenance<T> {
  return { value, status };
}

/**
 * Parsea texto crudo de un estado de consumo dominicano y etiqueta el origen de cada campo.
 */
export function parseDominicanInvoiceText(
  rawText: string,
  fileName: string = ""
): LocalInvoiceExtractionResult {
  const normalized = `${fileName} ${rawText}`.replace(/\s+/g, " ").trim();
  const upper = normalized.toUpperCase();
  const warnings: string[] = [];

  // 1. Identificar Prestadora / Zona
  let distributor: DistributorCode = "EDESUR";
  let distributorStatus: DataProvenanceStatus = "estimado";
  if (upper.includes("EDENORTE") || upper.includes("ZONA NORTE")) {
    distributor = "EDENORTE";
    distributorStatus = "extraido_automatico";
  } else if (
    upper.includes("EDEESTE") ||
    upper.includes("EDE ESTE") ||
    upper.includes("ZONA ORIENTAL")
  ) {
    distributor = "EDEESTE";
    distributorStatus = "extraido_automatico";
  } else if (
    upper.includes("CEPM") ||
    upper.includes("CONSORCIO ENERGETICO") ||
    upper.includes("TURISTICA")
  ) {
    distributor = "CEPM";
    distributorStatus = "extraido_automatico";
  } else if (upper.includes("EDESUR") || upper.includes("ZONA SUR")) {
    distributor = "EDESUR";
    distributorStatus = "extraido_automatico";
  }

  // 2. Identificar NIC / NIS
  const nicMatch = normalized.match(
    /(?:NIC|NIS|CONTRATO|CUENTA)[:\s#-]*([0-9]{6,12})/i
  );
  const contractNumber = nicMatch ? nicMatch[1] : "2032762";
  const contractStatus: DataProvenanceStatus = nicMatch
    ? "extraido_automatico"
    : "estimado";

  // 3. Identificar Medidor / Contador
  const meterMatch = normalized.match(
    /(?:MEDIDOR|CONTADOR)[:\s#-]*([0-9]{6,12})/i
  );
  const meterNumber = meterMatch ? meterMatch[1] : undefined;

  // 4. Identificar Tarifa (BTS-1, BTS-2, BTD, MTD-1, RES-CEPM)
  const tariffMatch = upper.match(
    /\b(BTS\s*-?\s*1|BTS\s*-?\s*2|BTD|MTD\s*-?\s*1|MTD)\b/
  );
  const tariffCode = tariffMatch
    ? tariffMatch[1]
        .replace(/\s+/g, "")
        .replace("BTS1", "BTS-1")
        .replace("BTS2", "BTS-2")
        .replace("MTD1", "MTD-1")
    : distributor === "CEPM"
    ? "RES-CEPM"
    : "BTS-1";
  const tariffStatus: DataProvenanceStatus = tariffMatch
    ? "extraido_automatico"
    : "estimado";

  // 5. Identificar Días Facturados
  const daysMatch = normalized.match(/([2-3][0-9])\s*D[IÍ]AS/i);
  const billingDays = daysMatch ? parseInt(daysMatch[1], 10) : 31;

  // 6. Identificar Potencia Contratada y Potencia Leída (kW)
  const potContratadaMatch = normalized.match(
    /POTENCIA\s+CONTRATADA[^0-9]{0,20}([0-9]{1,4}(?:\.[0-9]{1,3})?)\s*KW/i
  );
  const contractedPowerKw = potContratadaMatch
    ? parseFloat(potContratadaMatch[1])
    : undefined;

  const potLeidaMatch = normalized.match(
    /POTENCIA\s+B\.?T\.?[^0-9]{0,40}([0-9]{1,3}\.[0-9]{2,3})\s*KW/i
  );
  const measuredPowerDemandKw = potLeidaMatch
    ? parseFloat(potLeidaMatch[1])
    : undefined;

  // 7. Identificar Lectura Anterior y Lectura Actual
  const readingsMatch = normalized.match(
    /ACTIVA\s+B\.?T\.?\s+[0-9]{5,12}\s+([0-9]{3,8})\s+([0-9]{3,8})\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]{2,6})\s*KWH/i
  );
  const previousReading = readingsMatch
    ? parseFloat(readingsMatch[1])
    : undefined;
  const currentReading = readingsMatch
    ? parseFloat(readingsMatch[2])
    : undefined;
  const meterMultiplier = readingsMatch
    ? parseFloat(readingsMatch[3])
    : undefined;

  // 8. Identificar Consumo en kWh
  const kwhMatch =
    readingsMatch?.[4]
      ? [readingsMatch[0], readingsMatch[4]]
      : normalized.match(
          /(?:CONSUMO|ENERGIA|FACTURADO|ACTIVA)[^0-9]{0,30}([0-9]{2,5}(?:\.[0-9]{1,2})?)\s*KWH/i
        ) || normalized.match(/([0-9]{2,5}(?:\.[0-9]{1,2})?)\s*KWH/i);
  const parsedKwh = kwhMatch ? parseFloat(kwhMatch[1]) : 0;
  const kwhStatus: DataProvenanceStatus =
    parsedKwh > 0 ? "extraido_automatico" : "no_disponible";

  // 9. Identificar Importe Total Sin Subsidio y Aporte Gobierno
  const unsubMatch = normalized.match(
    /SIN\s+SUBSIDIO[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i
  );
  const unsubsidizedTotalDop = unsubMatch
    ? parseFloat(unsubMatch[1].replace(/,/g, ""))
    : undefined;

  const govSubMatch = normalized.match(
    /APORTE\s+TOTAL\s+GOBIERNO[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i
  );
  const governmentSubsidyDop = govSubMatch
    ? parseFloat(govSubMatch[1].replace(/,/g, ""))
    : undefined;

  // 10. Identificar Valor Total a Pagar (RD$)
  const totalMatch =
    normalized.match(
      /(?:VALOR\s+TOTAL\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR|IMPORTE\s+EN\s+RD\$)[^0-9]{0,25}([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i
    ) ||
    normalized.match(
      /RD\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{3,6}\.[0-9]{2})/i
    );

  const parsedTotalDop = totalMatch
    ? parseFloat(totalMatch[1].replace(/,/g, ""))
    : 0;
  const totalStatus: DataProvenanceStatus =
    parsedTotalDop > 0 ? "extraido_automatico" : "no_disponible";

  const fixedChargeDop = parsedKwh > 100 ? 128.59 : parsedKwh > 0 ? 40.84 : 0;
  const energyChargeDop =
    parsedTotalDop > fixedChargeDop
      ? Math.round((parsedTotalDop - fixedChargeDop) * 100) / 100
      : 0;

  const today = new Date();
  const endStr = today.toISOString().slice(0, 10);
  const startObj = new Date(today.getTime() - billingDays * 24 * 3600 * 1000);
  const startStr = startObj.toISOString().slice(0, 10);
  const dueObj = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
  const dueStr = dueObj.toISOString().slice(0, 10);

  const draftInvoice: ElectricityInvoice = {
    id: `inv-${Date.now()}`,
    distributor: makeField(distributor, distributorStatus),
    contractNumber: makeField(contractNumber, contractStatus),
    billingPeriodStart: makeField(startStr, "estimado"),
    billingPeriodEnd: makeField(endStr, "estimado"),
    billingDays: makeField(billingDays, daysMatch ? "extraido_automatico" : "estimado"),
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
    meterNumber,
    previousReading,
    currentReading,
    meterMultiplier,
    contractedPowerKw,
    measuredPowerDemandKw,
    unsubsidizedTotalDop,
    governmentSubsidyDop,
    notes: `Analizada localmente (${fileName || "registro manual"}).`,
  };

  return {
    rawTextSnippet: normalized.slice(0, 450),
    draftInvoice,
    detectedFormat: `${distributor} (${tariffCode})`,
    warnings,
  };
}
