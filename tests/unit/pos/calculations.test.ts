import { describe, it, expect } from "vitest";
import {
  calculateCartFinancials,
  roundPEN,
  QUICK_DISCOUNTS,
  BILLETES_PERU,
} from "@/lib/pos/calculations";

describe("HU-03: Motor Financiero en Soles (S/.) y Cálculos de Caja", () => {
  // Test 1: Cálculo de subtotal con múltiples productos en Soles
  it("1. Debe calcular el subtotal sumando exactamente los subtotales de cada ítem en Soles", () => {
    const items = [
      { varianteId: "v1", cantidad: 2, precioUnitario: 29.9 }, // 59.80
      { varianteId: "v2", cantidad: 1, precioUnitario: 119.0 }, // 119.00
      { varianteId: "v3", cantidad: 3, precioUnitario: 15.5 },  // 46.50
    ];

    const res = calculateCartFinancials(items);
    // 59.80 + 119.00 + 46.50 = 225.30
    expect(res.subtotal).toBe(225.3);
    expect(res.total).toBe(225.3);
    expect(res.totalArticulos).toBe(6);
  });

  // Test 2: Descuento rápido del 5% con redondeo
  it("2. Debe aplicar descuento del 5% redondeado a 2 decimales en Soles", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 99.9 }]; // 99.90
    const res = calculateCartFinancials(items, {
      descuentoValor: 5,
      tipoDescuento: "PORCENTAJE",
    });

    // 99.90 * 0.05 = 4.995 -> redondeado a 5.00
    expect(res.descuentoMonto).toBe(5.0);
    // Total: 99.90 - 5.00 = 94.90
    expect(res.total).toBe(94.9);
  });

  // Test 3: Descuento rápido del 10%
  it("3. Debe aplicar descuento del 10% correctamente", () => {
    const items = [{ varianteId: "v1", cantidad: 2, precioUnitario: 50.0 }]; // 100.00
    const res = calculateCartFinancials(items, {
      descuentoValor: 10,
      tipoDescuento: "PORCENTAJE",
    });

    expect(res.descuentoMonto).toBe(10.0);
    expect(res.total).toBe(90.0);
  });

  // Test 4: Descuentos de remate final (15% y 20%)
  it("4. Debe calcular descuentos de remate de stock (15% y 20%) para liquidación acelerada", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 200.0 }];

    const res15 = calculateCartFinancials(items, {
      descuentoValor: 15,
      tipoDescuento: "PORCENTAJE",
    });
    expect(res15.descuentoMonto).toBe(30.0);
    expect(res15.total).toBe(170.0);

    const res20 = calculateCartFinancials(items, {
      descuentoValor: 20,
      tipoDescuento: "PORCENTAJE",
    });
    expect(res20.descuentoMonto).toBe(40.0);
    expect(res20.total).toBe(160.0);
  });

  // Test 5: Descuento por monto fijo en Soles (S/.)
  it("5. Debe aplicar descuento por monto fijo directo en Soles", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 120.0 }];
    const res = calculateCartFinancials(items, {
      descuentoValor: 25.5,
      tipoDescuento: "MONTO_FIJO",
    });

    expect(res.descuentoMonto).toBe(25.5);
    expect(res.total).toBe(94.5);
  });

  // Test 6: Descuento fijo que supera el subtotal se acota (total >= 0)
  it("6. Si el descuento fijo supera el subtotal, el total debe acotarse a S/. 0.00 (nunca negativo)", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 50.0 }];
    const res = calculateCartFinancials(items, {
      descuentoValor: 80.0, // Mayor a 50.00
      tipoDescuento: "MONTO_FIJO",
    });

    expect(res.descuentoMonto).toBe(50.0);
    expect(res.total).toBe(0.0);
  });

  // Test 7: Descuento porcentual mayor a 100% se limita al 100%
  it("7. Si el porcentaje de descuento supera el 100%, se limita al 100%", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 80.0 }];
    const res = calculateCartFinancials(items, {
      descuentoValor: 150,
      tipoDescuento: "PORCENTAJE",
    });

    expect(res.descuentoMonto).toBe(80.0);
    expect(res.total).toBe(0.0);
  });

  // Test 8: Pago en efectivo y cálculo de vuelto exacto
  it("8. Debe calcular el vuelto exacto al pagar en efectivo con un billete superior", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 73.5 }]; // Total 73.50
    const res = calculateCartFinancials(items, {
      metodoPago: "EFECTIVO",
      montoRecibido: 100.0, // Billete de S/. 100
    });

    expect(res.total).toBe(73.5);
    expect(res.esMontoSuficiente).toBe(true);
    // Vuelto: 100 - 73.50 = 26.50
    expect(res.vuelto).toBe(26.5);
  });

  // Test 9: Validación de insuficiencia de pago en efectivo
  it("9. Debe señalar monto insuficiente cuando el efectivo entregado no cubre el total", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 120.0 }];
    const res = calculateCartFinancials(items, {
      metodoPago: "EFECTIVO",
      montoRecibido: 100.0, // Falta dinero
    });

    expect(res.esMontoSuficiente).toBe(false);
    expect(res.vuelto).toBe(0);
  });

  // Test 10: Métodos de pago digitales (Yape, Plin, Tarjeta) sin vuelto
  it("10. Los métodos digitales (Yape, Plin, Tarjeta, Transferencia) deben ajustar el monto recibido al total exacto", () => {
    const items = [{ varianteId: "v1", cantidad: 1, precioUnitario: 45.9 }];

    const resYape = calculateCartFinancials(items, { metodoPago: "YAPE" });
    expect(resYape.montoRecibido).toBe(45.9);
    expect(resYape.vuelto).toBe(0);
    expect(resYape.esMontoSuficiente).toBe(true);

    const resTarjeta = calculateCartFinancials(items, { metodoPago: "TARJETA" });
    expect(resTarjeta.montoRecibido).toBe(45.9);
    expect(resTarjeta.vuelto).toBe(0);
  });
});
