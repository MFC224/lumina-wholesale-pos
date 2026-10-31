import { describe, it, expect } from "vitest";
import { calculateCartFinancials } from "@/lib/pos/calculations";
import { DiscountType } from "@/types/sales";

describe("Terminal POS en Tablet — Descuento Unificado y Cobro de Efectivo", () => {
  // Simulación de parser y manejador de descuento personalizado
  function handleCustomDiscount(
    rawInput: string,
    unit: "PORCENTAJE" | "MONTO_FIJO"
  ): { type: DiscountType; value: number; input: string } {
    const val = rawInput.replace(/,/g, ".").replace(/\s/g, "");
    if (val === "" || /^\d+(\.\d{0,2})?$/.test(val) || val === ".") {
      const cleanVal = val === "." ? "0." : val;
      if (cleanVal === "" || parseFloat(cleanVal) === 0) {
        return { type: "NINGUNO", value: 0, input: cleanVal };
      }
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0) {
        if (unit === "MONTO_FIJO") {
          return { type: "MONTO_FIJO", value: num, input: cleanVal };
        } else {
          return { type: "PORCENTAJE", value: Math.min(100, num), input: cleanVal };
        }
      }
    }
    return { type: "NINGUNO", value: 0, input: rawInput };
  }

  // Simulación de parser de efectivo recibido
  function handleCashInput(raw: string): { display: string; num: number; valid: boolean } {
    let val = raw.replace(/,/g, ".").replace(/\s/g, "");
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

  it("1. Descuento unificado: Permite borrar todo el campo de descuento a '' sin reiniciar a 5 ni cambiar modo", () => {
    // Usuario borra el campo
    const res = handleCustomDiscount("", "MONTO_FIJO");
    expect(res.input).toBe("");
    expect(res.type).toBe("NINGUNO");
    expect(res.value).toBe(0);

    // Cálculos sin descuento
    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 2, precioUnitario: 30.0 }],
      { tipoDescuento: res.type, descuentoValor: res.value }
    );
    expect(financials.subtotal).toBe(60.0);
    expect(financials.descuentoMonto).toBe(0);
    expect(financials.total).toBe(60.0);
  });

  it("2. Descuento unificado: Soporta montos libres con decimales en Soles (ej. S/. 7.50)", () => {
    const res = handleCustomDiscount("7.5", "MONTO_FIJO");
    expect(res.input).toBe("7.5");
    expect(res.type).toBe("MONTO_FIJO");
    expect(res.value).toBe(7.5);

    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 50.0 }],
      { tipoDescuento: res.type, descuentoValor: res.value }
    );
    expect(financials.descuentoMonto).toBe(7.5);
    expect(financials.total).toBe(42.5);
  });

  it("3. Descuento unificado: Alternar unidad a % recalcula correctamente sin perder el número", () => {
    const valorDigitado = "15";
    // En Soles
    const resSoles = handleCustomDiscount(valorDigitado, "MONTO_FIJO");
    expect(resSoles.type).toBe("MONTO_FIJO");
    expect(resSoles.value).toBe(15);

    // Alternar a Porcentaje
    const resPct = handleCustomDiscount(valorDigitado, "PORCENTAJE");
    expect(resPct.type).toBe("PORCENTAJE");
    expect(resPct.value).toBe(15);

    // Aplicar a venta de 200 Soles
    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 2, precioUnitario: 100.0 }],
      { tipoDescuento: resPct.type, descuentoValor: resPct.value }
    );
    // 15% de 200 = 30 Soles de descuento
    expect(financials.descuentoMonto).toBe(30.0);
    expect(financials.total).toBe(170.0);
  });

  it("4. Tablet Cash UX: Permite limpiar la casilla de efectivo a '' sin errores visuales", () => {
    const cash = handleCashInput("");
    expect(cash.display).toBe("");
    expect(cash.num).toBe(0);
    expect(cash.valid).toBe(true);

    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 74.7 }],
      { metodoPago: "EFECTIVO", montoRecibido: cash.num }
    );
    expect(financials.esMontoSuficiente).toBe(false);
    expect(financials.vuelto).toBe(0);
  });

  it("5. Tablet Cash UX: Permite ingresar '74.7' con teclado táctil y calcula vuelto exacto de 0.00", () => {
    const cash = handleCashInput("74.7");
    expect(cash.display).toBe("74.7");
    expect(cash.num).toBe(74.7);

    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 74.7 }],
      { metodoPago: "EFECTIVO", montoRecibido: cash.num }
    );
    expect(financials.total).toBe(74.7);
    expect(financials.esMontoSuficiente).toBe(true);
    expect(financials.vuelto).toBe(0.0);
  });

  it("6. Tablet Cash UX: Pago con billete de 100 en cuenta de 74.7 calcula vuelto exacto de S/. 25.30", () => {
    const cash = handleCashInput("100");
    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: 74.7 }],
      { metodoPago: "EFECTIVO", montoRecibido: cash.num }
    );
    expect(financials.total).toBe(74.7);
    expect(financials.esMontoSuficiente).toBe(true);
    // 100 - 74.7 = 25.30
    expect(financials.vuelto).toBe(25.3);
  });

  it("7. Tablet Cash UX: Botón Monto Exacto iguala el monto recibido al total exacto en Soles", () => {
    const total = 128.5;
    const cash = handleCashInput(total.toFixed(2));
    expect(cash.display).toBe("128.50");
    expect(cash.num).toBe(128.5);

    const financials = calculateCartFinancials(
      [{ varianteId: "v1", cantidad: 1, precioUnitario: total }],
      { metodoPago: "EFECTIVO", montoRecibido: cash.num }
    );
    expect(financials.esMontoSuficiente).toBe(true);
    expect(financials.vuelto).toBe(0.0);
  });
});
