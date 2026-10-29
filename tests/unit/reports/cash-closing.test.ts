import { describe, it, expect } from "vitest";
import {
  calcularArqueoCaja,
  buildCashClosingDocument,
  renderCashClosingHtml,
  LEYENDA_LIQUIDACION_OBLIGATORIA,
} from "@/lib/reports/cash-closing";

describe("HU-10: Reportes de Arqueo y Cierre Diario de Caja en Soles (PDF/HTML)", () => {
  // Test 1: Cálculo exacto del efectivo esperado en gaveta
  it("1. Debe calcular el efectivo esperado sumando el fondo de apertura y las ventas en efectivo", () => {
    const res = calcularArqueoCaja({
      montoApertura: 200.0,
      ventasEfectivoTotal: 850.5,
      efectivoContadoFisico: 1050.5,
    });

    // 200.00 + 850.50 = 1,050.50
    expect(res.efectivoEsperado).toBe(1050.5);
    expect(res.diferencia).toBe(0);
    expect(res.estadoDiferencia).toBe("CUADRADO");
  });

  // Test 2: Caso de caja perfectamente cuadrada (Diferencia = S/. 0.00)
  it("2. Debe clasificar como 'CUADRADO' cuando el conteo físico coincide exactamente con lo esperado", () => {
    const res = calcularArqueoCaja({
      montoApertura: 150.0,
      ventasEfectivoTotal: 500.0,
      efectivoContadoFisico: 650.0,
    });

    expect(res.diferencia).toBe(0);
    expect(res.estadoDiferencia).toBe("CUADRADO");
  });

  // Test 3: Detección de faltante de caja
  it("3. Debe detectar y calcular faltante de caja con signo negativo y estado 'FALTANTE'", () => {
    const res = calcularArqueoCaja({
      montoApertura: 200.0,
      ventasEfectivoTotal: 800.0, // Esperado: 1,000.00
      efectivoContadoFisico: 980.0, // Físico: 980.00 (Faltan S/. 20.00)
    });

    expect(res.efectivoEsperado).toBe(1000.0);
    expect(res.diferencia).toBe(-20.0);
    expect(res.estadoDiferencia).toBe("FALTANTE");
  });

  // Test 4: Detección de sobrante de caja
  it("4. Debe detectar y calcular sobrante de caja con signo positivo y estado 'SOBRANTE'", () => {
    const res = calcularArqueoCaja({
      montoApertura: 100.0,
      ventasEfectivoTotal: 400.0, // Esperado: 500.00
      efectivoContadoFisico: 515.0, // Físico: 515.00 (Sobran S/. 15.00)
    });

    expect(res.efectivoEsperado).toBe(500.0);
    expect(res.diferencia).toBe(15.0);
    expect(res.estadoDiferencia).toBe("SOBRANTE");
  });

  // Test 5: Aislamiento de ventas digitales (Yape, Plin, Tarjeta) sin afectar gaveta física
  it("5. Las ventas digitales no deben sumar al efectivo esperado en gaveta, pero sí al total del día", () => {
    const res = calcularArqueoCaja({
      montoApertura: 100.0,
      ventasEfectivoTotal: 300.0, // Físico esperado: 400.00
      efectivoContadoFisico: 400.0,
      ventasDigitalesTotal: 750.0, // Digital (Yape/Tarjetas)
    });

    expect(res.efectivoEsperado).toBe(400.0);
    expect(res.diferencia).toBe(0);
    // Total ventas global = 300 + 750 = 1,050.00
    expect(res.totalVentasGlobal).toBe(1050.0);
  });

  // Test 6: Inclusión de leyenda legal obligatoria de liquidación
  it("6. [HU-10] El reporte debe incluir la leyenda legal obligatoria 'Venta Final de Liquidación - Sin Devolución'", () => {
    const doc = buildCashClosingDocument({
      id: "CIERRE-20261029-01",
      cajeroNombre: "Carlos Cajero",
      cajeroId: "usr_cajero_01",
      fechaApertura: new Date("2026-10-29T08:00:00"),
      fechaCierre: new Date("2026-10-29T20:00:00"),
      input: {
        montoApertura: 200,
        ventasEfectivoTotal: 500,
        efectivoContadoFisico: 700,
      },
    });

    expect(doc.leyendaLegal).toBe(LEYENDA_LIQUIDACION_OBLIGATORIA);
    expect(doc.leyendaLegal).toContain("Sin Devolución");
  });

  // Test 7: Espacios de firma de conformidad para Cajero y Administrador
  it("7. Debe estructurar los campos de firma de conformidad de Cajero y Administrador", () => {
    const doc = buildCashClosingDocument({
      id: "CIERRE-01",
      cajeroNombre: "Carlos Cajero",
      cajeroId: "usr_cajero",
      supervisorNombre: "Ana Administradora",
      supervisorId: "usr_admin",
      fechaApertura: new Date(),
      fechaCierre: new Date(),
      input: { montoApertura: 100, ventasEfectivoTotal: 200, efectivoContadoFisico: 300 },
    });

    expect(doc.firmas.cajero.nombre).toBe("Carlos Cajero");
    expect(doc.firmas.cajero.firmado).toBe(true);
    expect(doc.firmas.administrador.nombre).toBe("Ana Administradora");
    expect(doc.firmas.administrador.firmado).toBe(true);
  });

  // Test 8: Renderizado HTML de plantilla imprimible para PDF
  it("8. Debe generar código HTML válido con membrete corporativo y tabla de arqueo", () => {
    const doc = buildCashClosingDocument({
      id: "CIERRE-TEST-100",
      cajeroNombre: "Carlos Cajero",
      cajeroId: "usr_cajero",
      supervisorNombre: "Ana Admin",
      supervisorId: "usr_admin",
      fechaApertura: new Date(),
      fechaCierre: new Date(),
      input: { montoApertura: 100, ventasEfectivoTotal: 300, efectivoContadoFisico: 400 },
    });

    const html = renderCashClosingHtml(doc);
    expect(html).toContain("LUMINA");
    expect(html).toContain("Acta Oficial de Arqueo y Cierre Diario de Caja");
    expect(html).toContain("CIERRE-TEST-100");
    expect(html).toContain(LEYENDA_LIQUIDACION_OBLIGATORIA);
  });

  // Test 9: Manejo robusto de valores indefinidos o nulos
  it("9. Debe sanitizar entradas indefinidas tratándolas como cero", () => {
    // @ts-expect-error test inputs
    const res = calcularArqueoCaja({});
    expect(res.montoApertura).toBe(0);
    expect(res.ventasEfectivoTotal).toBe(0);
    expect(res.efectivoEsperado).toBe(0);
    expect(res.diferencia).toBe(0);
    expect(res.estadoDiferencia).toBe("CUADRADO");
  });

  // Test 10: Trazabilidad de auditoría de fechas de turno
  it("10. El documento debe registrar con exactitud las fechas de apertura y cierre de turno", () => {
    const fApertura = "2026-10-29T08:00:00Z";
    const fCierre = "2026-10-29T21:00:00Z";

    const doc = buildCashClosingDocument({
      id: "CIERRE-02",
      cajeroNombre: "Juan Pérez",
      cajeroId: "usr_juan",
      fechaApertura: fApertura,
      fechaCierre: fCierre,
      input: { montoApertura: 50, ventasEfectivoTotal: 100, efectivoContadoFisico: 150 },
    });

    expect(doc.fechaApertura).toBe(fApertura);
    expect(doc.fechaCierre).toBe(fCierre);
  });
});
