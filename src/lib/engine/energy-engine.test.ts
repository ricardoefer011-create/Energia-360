// ============================================================================
// ENERGIA360 — Suite de Pruebas Automatizadas (Matemáticas, Tarifas RD y Seguridad)
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  calculateApplianceConsumption,
  calculateDominicanTariffBill,
  calculateInverterAutonomy,
  generateEnergyRecommendations,
  resolveTariffSchedule,
  simulateDominicanSolarSystem,
} from "@/lib/engine/energy-engine";
import {
  decryptEnvelopeWithPassphrase,
  encryptPayloadWithPassphrase,
} from "@/lib/crypto/vault-crypto";
import { parseDominicanInvoiceText } from "@/lib/ocr/invoice-parser";
import { createSyntheticDemoData } from "@/lib/data/rd-energy-catalog";

describe("Motor Matemático y Tarifario Dominicano (SIE)", () => {
  it("calcula correctamente los bloques escalonados de EDESUR BTS-1 por debajo de 700 kWh", () => {
    const schedule = resolveTariffSchedule("EDESUR", "BTS-1");
    // 250 kWh: 200 kWh * 6.05 (1210) + 50 kWh * 8.59 (429.50) = 1639.50 + cargo fijo 128.59 = 1768.09
    const res = calculateDominicanTariffBill(250, schedule);
    expect(res.lostStepSubsidy701).toBe(false);
    expect(res.energyChargeDop).toBeCloseTo(1639.5, 2);
    expect(res.fixedChargeDop).toBeCloseTo(128.59, 2);
    expect(res.totalEstimatedBillDop).toBeCloseTo(1768.09, 2);
  });

  it("aplica la pérdida del subsidio escalonado al alcanzar >= 701 kWh en BTS-1", () => {
    const schedule = resolveTariffSchedule("EDESUR", "BTS-1");
    const bill700 = calculateDominicanTariffBill(700, schedule);
    const bill701 = calculateDominicanTariffBill(701, schedule);

    expect(bill700.lostStepSubsidy701).toBe(false);
    expect(bill701.lostStepSubsidy701).toBe(true);
    // En 701 kWh todos los kWh se cobran a 13.09: 701 * 13.09 = 9176.09 + 128.59 = 9304.68
    expect(bill701.energyChargeDop).toBeCloseTo(701 * 13.09, 2);
    expect(bill701.subsidyLossPenaltyDop).toBeGreaterThan(1500);
  });

  it("reproduce al centavo la liquidación real de 735 kWh (NIC 2032762: RD$ 9,749.74 y Subsidio RD$ 1,428.69)", () => {
    const schedule = resolveTariffSchedule("EDESUR", "BTS-1");
    const bill735 = calculateDominicanTariffBill(735, schedule, null, 3.816);

    expect(bill735.fixedChargeDop).toBeCloseTo(128.59, 2);
    expect(bill735.energyChargeDop).toBeCloseTo(9621.15, 2);
    expect(bill735.totalEstimatedBillDop).toBeCloseTo(9749.74, 2);
    expect(bill735.unsubsidizedTotalDop).toBeCloseTo(11178.43, 1);
    expect(bill735.governmentSubsidyDop).toBeCloseTo(1428.69, 1);
  });

  it("calcula el consumo diario y mensual de equipos eléctricos con factor de ciclo", () => {
    const res = calculateApplianceConsumption(
      {
        nominalWatts: 1000,
        dutyCycleFactor: 0.65,
        quantity: 2,
        dailyHours: 8,
        monthlyDays: 30,
      },
      12.89
    );
    // Effective watts = 1000 * 2 * 0.65 = 1300 W -> 1.3 kW * 8h = 10.4 kWh/día -> 312 kWh/mes
    expect(res.effectiveWatts).toBe(1300);
    expect(res.dailyKwh).toBeCloseTo(10.4, 2);
    expect(res.monthlyKwh).toBeCloseTo(312, 2);
    expect(res.estimatedMonthlyCostDop).toBeCloseTo(312 * 12.89, 1);
  });

  it("calcula la autonomía real de un inversor con baterías considerando DoD, SoC y eficiencia", () => {
    const autonomy = calculateInverterAutonomy(
      {
        id: "inv-test",
        name: "Inversor Prueba",
        inverterBrand: "Trace",
        inverterModel: "3.6kW",
        inverterPowerW: 3600,
        inverterEfficiency: 0.88,
        batteryBrand: "Trojan",
        batteryType: "lead_acid_flooded",
        batteryVoltageV: 24,
        batteryCapacityAh: 225,
        batteryCount: 4,
        totalBatteryCapacityWh: 5400,
        usableDodFraction: 0.5,
        currentStateOfChargePercent: 100,
        installedPanelsCount: 0,
        installedSolarKw: 0,
        installationDate: "2025-01-01",
      },
      475.2
    );

    // Energía útil = 5400 * 0.50 * 1.0 * 0.88 = 2376 Wh / 475.2 W = 5.0 horas
    expect(autonomy.usableCapacityWh).toBeCloseTo(2376, 1);
    expect(autonomy.estimatedAutonomyHours).toBeCloseTo(5.0, 2);
    expect(autonomy.isOverloaded).toBe(false);
  });

  it("dimensiona un sistema solar fotovoltaico en República Dominicana con 3 escenarios", () => {
    const report = simulateDominicanSolarSystem({
      monthlyKwh: 650,
      averageMonthlyBillDop: 7200,
      province: "Santiago",
      propertyType: "hogar",
      availableRoofAreaM2: 45,
      roofOrientation: "Sur",
      installationType: "on_grid_net_metering",
      availableBudgetDop: 350000,
      targetCoveragePercent: 95,
      desiredAutonomyHours: 0,
      systemLossFactor: 0.22,
    });

    expect(report.provinceHsp).toBeCloseTo(5.45, 2);
    expect(report.scenarios).toHaveLength(3);
    const intermedio = report.scenarios.find(
      (s) => s.scenarioLabel === "Intermedio"
    )!;
    expect(intermedio.recommendedKwPeak).toBeGreaterThan(3.5);
    expect(intermedio.estimatedPanelsCount).toBeGreaterThanOrEqual(6);
    expect(intermedio.paybackYears).toBeGreaterThan(1.5);
    expect(intermedio.paybackYears).toBeLessThan(8);
  });

  it("genera recomendaciones inteligentes basadas en facturas y equipos", () => {
    const demo = createSyntheticDemoData();
    const schedule = resolveTariffSchedule("EDESUR", "BTS-1");
    const recs = generateEnergyRecommendations(
      demo.invoices,
      demo.appliances,
      schedule
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].calculationMethod.length).toBeGreaterThan(10);
  });
});

describe("Seguridad y Privacidad Zero-Access (Web Crypto API AES-256-GCM)", () => {
  it("cifra y descifra la bóveda local sin exponer datos en texto plano", async () => {
    const secretPayload = {
      contractNumber: "NIC-9988776",
      billedKwh: 685,
      note: "Factura confidencial del usuario",
    };
    const passphrase = "MiClaveMaestraSeguraRD2026!";

    const envelope = await encryptPayloadWithPassphrase(
      secretPayload,
      passphrase
    );

    expect(envelope.cipher).toBe("AES-256-GCM");
    expect(envelope.ciphertextBase64).not.toContain("NIC-9988776");
    expect(envelope.ciphertextBase64).not.toContain("Factura confidencial");

    const decrypted = await decryptEnvelopeWithPassphrase<typeof secretPayload>(
      envelope,
      passphrase
    );
    expect(decrypted.contractNumber).toBe("NIC-9988776");
    expect(decrypted.billedKwh).toBe(685);
  });

  it("rechaza el descifrado si la contraseña maestra es incorrecta o el ciphertext fue alterado", async () => {
    const envelope = await encryptPayloadWithPassphrase(
      { test: "privado" },
      "ClaveCorrecta12345!"
    );

    await expect(
      decryptEnvelopeWithPassphrase(envelope, "ClaveIncorrecta99999!")
    ).rejects.toThrow();

    const tamperedEnvelope = {
      ...envelope,
      ciphertextSha256: "0000000000000000000000000000000000000000000000000000000000000000",
    };
    await expect(
      decryptEnvelopeWithPassphrase(tamperedEnvelope, "ClaveCorrecta12345!")
    ).rejects.toThrow(/integridad/i);
  });

  it("extrae campos de texto de facturas dominicanas etiquetando su procedencia", () => {
    const sampleText =
      "EDESUR DOMINICANA S.A. NIC: 1029384 Tarifa: BTS-1 Consumo Facturado: 540 kWh Total a Pagar: RD$ 5,295.40";
    const parsed = parseDominicanInvoiceText(sampleText, "factura_edesur.pdf");

    expect(parsed.draftInvoice.distributor.value).toBe("EDESUR");
    expect(parsed.draftInvoice.distributor.status).toBe("extraido_automatico");
    expect(parsed.draftInvoice.contractNumber.value).toBe("1029384");
    expect(parsed.draftInvoice.billedKwh.value).toBe(540);
    expect(parsed.draftInvoice.totalAmountDop.value).toBeCloseTo(5295.4, 2);
  });
});

