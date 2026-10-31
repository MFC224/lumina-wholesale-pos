import { describe, it, expect } from "vitest";
import { calculateCartFinancials } from "@/lib/pos/calculations";

describe("Cálculo de Efectivo y Vuelto Ergonómico en POS (Input UX)", () => {
  // Helper para simular el parser del input del POS
  function parseCashInput(raw: string): { display: string; num: number; valid: boolean } {
    let val = raw.replace(/,/g, ".");
    if (val === "" || /^\d+(\.\d{0,2})?$/.test(val) || val === ".") {
      if (val === ".") val = "0.";
      const parsed = parseFloat(val);
      return {
        display: val,
        num: isNaN(parsed) ? 0 : Math.max(0, parsed),
        valid: true,
      };
    }
    return { display: raw, num: 0, valid: false };
  }

  it("1. Debe permitir dejar la casilla completamente vacía sin errores visuales ni NaN", () => {
    const res = parseCashInput("");
    expect(res.valid).toBe(true);
    expect(res.display).toBe("");
    expect(res.num).toBe(0);

    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 50.0 }],
      { metodoPago: "EFECTIVO", montoRecibido: res.num }
    );

    expect(financials.esMontoSuficiente).toBe(false);
    expect(financials.vuelto).toBe(0);
  });

  it("2. Debe aceptar montos decimales como 74.7 y calcular el vuelto exacto en Soles", () => {
    const res = parseCashInput("74.7");
    expect(res.valid).toBe(true);
    expect(res.display).toBe("74.7");
    expect(res.num).toBe(74.7);

    // Venta con total de 50.00
    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 50.0 }],
      { metodoPago: "EFECTIVO", montoRecibido: res.num }
    );

    expect(financials.total).toBe(50.0);
    expect(financials.esMontoSuficiente).toBe(true);
    // Vuelto: 74.70 - 50.00 = 24.70
    expect(financials.vuelto).toBe(24.7);
  });

  it("3. Debe soportar estados intermedios de digitación como '74.' sin perder el punto decimal", () => {
    const res = parseCashInput("74.");
    expect(res.valid).toBe(true);
    expect(res.display).toBe("74.");
    expect(res.num).toBe(74.0);
  });

  it("4. Debe convertir comas a puntos para teclados numéricos con coma (ej. '74,7' -> '74.7')", () => {
    const res = parseCashInput("74,7");
    expect(res.valid).toBe(true);
    expect(res.display).toBe("74.7");
    expect(res.num).toBe(74.7);
  });

  it("5. Debe rechazar caracteres no numéricos o múltiples puntos (ej. '74..7', 'abc')", () => {
    const res1 = parseCashInput("74..7");
    expect(res1.valid).toBe(false);

    const res2 = parseCashInput("abc");
    expect(res2.valid).toBe(false);
  });

  it("6. Debe calcular correctamente el monto faltante cuando el cliente entrega menos del total", () => {
    const res = parseCashInput("30.0");
    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 74.7 }],
      { metodoPago: "EFECTIVO", montoRecibido: res.num }
    );

    expect(financials.total).toBe(74.7);
    expect(financials.esMontoSuficiente).toBe(false);
    expect(financials.vuelto).toBe(0);
    // Faltante: 74.70 - 30.00 = 44.70
    const faltante = Number((financials.total - res.num).toFixed(2));
    expect(faltante).toBe(44.7);
  });
});
