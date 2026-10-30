import { describe, it, expect } from "vitest";
import {
  generateThermalCashClosingHtml,
  ThermalCashClosingData,
} from "@/lib/pos/thermal-receipt";

describe("Módulo de Impresión Térmica de Cierre Z y Arqueo (Sprint 5)", () => {
  const sampleClosingData: ThermalCashClosingData = {
    cajeroNombre: "Rosa Flores",
    supervisorNombre: "Admin General",
    periodoLabel: "Turno Mañana (Hoy)",
    montoApertura: 150.0,
    ventasEfectivo: 450.0,
    ventasYape: 120.0,
    ventasPlin: 0.0,
    ventasTarjeta: 85.0,
    ventasTransferencia: 0.0,
    totalVentas: 655.0,
    efectivoEsperado: 600.0,
    efectivoReal: 600.0,
    diferencia: 0.0,
    estadoCuadre: "CUADRADO",
    ticketsEmitidos: 14,
    ticketsAnulados: 1,
  };

  it("debe generar el HTML del Cierre Z con encabezado institucional y RUC", () => {
    const html = generateThermalCashClosingHtml(sampleClosingData, "80mm");

    expect(html).toContain("LUMINA WHOLESALE");
    expect(html).toContain("20608945123");
    expect(html).toContain("*** REPORTE DE CIERRE Z ***");
    expect(html).toContain("Rosa Flores");
  });

  it("debe incluir el desglose por pasarelas (Efectivo, Yape, Tarjeta)", () => {
    const html = generateThermalCashClosingHtml(sampleClosingData, "80mm");

    expect(html).toContain("450.00");
    expect(html).toContain("120.00");
    expect(html).toContain("85.00");
    expect(html).toContain("655.00");
  });

  it("debe reflejar el estado de arqueo (CUADRADO / FALTANTE / SOBRANTE) y firmas", () => {
    const html = generateThermalCashClosingHtml(sampleClosingData, "80mm");

    expect(html).toContain("CUADRADO");
    expect(html).toContain("FIRMA CAJERO");
    expect(html).toContain("FIRMA SUPERVISOR");
  });

  it("debe soportar ancho de papel de 58mm", () => {
    const html = generateThermalCashClosingHtml(sampleClosingData, "58mm");
    expect(html).toContain("size: 58mm auto");
    expect(html).toContain("width: 58mm");
  });
});
