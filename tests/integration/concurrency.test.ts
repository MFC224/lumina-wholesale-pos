import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";

describe("HU-01: Motor Transaccional Atómico, Concurrencia y Cero Sobreventa", () => {
  let engine: SalesTransactionEngine;

  const mockVariants: VariantEntity[] = [
    {
      id: "var_polo_negro_m",
      sku: "POLO-HVY-NEGRO-M",
      nombreProducto: "Polo Oversize Heavyweight Cotton",
      talla: "M",
      color: "Negro",
      stockActual: 3, // Solo 3 unidades en stock para prueba de estrés
      precioLiquidacion: 29.9,
    },
    {
      id: "var_taladro_650",
      sku: "TAL-650-STD",
      nombreProducto: "Taladro Percutor Industrial 650W",
      talla: "Única",
      color: "Azul/Negro",
      stockActual: 5,
      precioLiquidacion: 119.0,
    },
    {
      id: "var_casaca_termica",
      sku: "CAS-TERM-AZUL-L",
      nombreProducto: "Casaca Térmica Militar",
      talla: "L",
      color: "Azul",
      stockActual: 0, // Agotado
      precioLiquidacion: 69.9,
    },
  ];

  beforeEach(() => {
    engine = new SalesTransactionEngine(mockVariants);
  });

  // Test 1: Venta exitosa única con decremento exacto
  it("1. Debe procesar una venta individual decrementando el stock y generando ticket", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_cajero_01",
      metodoPago: "EFECTIVO",
      montoRecibido: 250.0,
      items: [{ varianteId: "var_taladro_650", cantidad: 2, precioUnitario: 119.0 }],
    });

    expect(result.success).toBe(true);
    expect(result.venta).toBeDefined();
    expect(result.venta?.numeroTicket).toMatch(/^TICK-\d{8}-\d+/);
    expect(result.venta?.total).toBe(238.0);
    expect(result.venta?.vuelto).toBe(12.0); // 250 - 238 = 12

    const updated = engine.getVariant("var_taladro_650");
    expect(updated?.stockActual).toBe(3); // 5 - 2 = 3
  });

  // Test 2: Prueba de estrés concurrente (10 peticiones simultáneas compitiendo por 3 unidades)
  it("2. [HU-01] Estrés concurrente: 10 peticiones compitiendo por 3 unidades deben resultar en CERO sobreventa", async () => {
    // 10 cajeros intentan comprar 1 unidad de 'var_polo_negro_m' (stock inicial: 3) exactamente al mismo tiempo
    const peticiones = Array.from({ length: 10 }).map((_, idx) =>
      engine.processSale({
        usuarioId: `usr_cajero_${idx + 1}`,
        metodoPago: "YAPE",
        items: [{ varianteId: "var_polo_negro_m", cantidad: 1, precioUnitario: 29.9 }],
      })
    );

    const resultados = await Promise.all(peticiones);

    const exitosas = resultados.filter((r) => r.success);
    const fallidas = resultados.filter((r) => !r.success);

    // Exactamente 3 ventas deben ser exitosas
    expect(exitosas).toHaveLength(3);
    // Las 7 restantes deben ser rechazadas
    expect(fallidas).toHaveLength(7);

    // Todas las fallidas deben tener código STOCK_INSUFICIENTE
    fallidas.forEach((f) => {
      expect(f.code).toBe("STOCK_INSUFICIENTE");
    });

    // El stock final debe ser exactamente 0 (NUNCA negativo)
    const varianteFinal = engine.getVariant("var_polo_negro_m");
    expect(varianteFinal?.stockActual).toBe(0);
  });

  // Test 3: Transaccionalidad atómica multi-ítem con Rollback automático
  it("3. Debe ejecutar ROLLBACK total si uno de los productos del carrito no tiene stock suficiente", async () => {
    // Intentar comprar 1 taladro (stock: 5) y 1 casaca (stock: 0) en la misma venta
    const result = await engine.processSale({
      usuarioId: "usr_cajero_01",
      metodoPago: "PLIN",
      items: [
        { varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 119.0 },
        { varianteId: "var_casaca_termica", cantidad: 1, precioUnitario: 69.9 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("STOCK_INSUFICIENTE");

    // Verificar que el taladro NO fue descontado (debe seguir en 5)
    const taladro = engine.getVariant("var_taladro_650");
    expect(taladro?.stockActual).toBe(5);

    // Verificar que no se creó ninguna venta
    expect(engine.getAllSales()).toHaveLength(0);
  });

  // Test 4: Generación de ticket único y correlativo
  it("4. Cada venta exitosa debe tener un número de ticket único y estructurado", async () => {
    const sale1 = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "TARJETA",
      items: [{ varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 119.0 }],
    });

    const sale2 = await engine.processSale({
      usuarioId: "usr_2",
      metodoPago: "TARJETA",
      items: [{ varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 119.0 }],
    });

    expect(sale1.venta?.numeroTicket).not.toBe(sale2.venta?.numeroTicket);
    expect(sale1.venta?.numeroTicket).toMatch(/^TICK-/);
  });

  // Test 5: Cálculo correcto de descuento porcentual en Soles
  it("5. Debe aplicar descuentos porcentuales calculados con exactitud de redondeo en Soles", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "EFECTIVO",
      montoRecibido: 100,
      descuento: 10, // 10% de descuento
      tipoDescuento: "PORCENTAJE",
      items: [{ varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 100.0 }],
    });

    expect(result.success).toBe(true);
    expect(result.venta?.subtotal).toBe(100.0);
    expect(result.venta?.descuento).toBe(10.0);
    expect(result.venta?.total).toBe(90.0);
  });

  // Test 6: Cálculo de descuento por monto fijo
  it("6. Debe aplicar descuento de monto fijo en Soles validando que no exceda el subtotal", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "YAPE",
      descuento: 25.0,
      tipoDescuento: "MONTO_FIJO",
      items: [{ varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 100.0 }],
    });

    expect(result.success).toBe(true);
    expect(result.venta?.descuento).toBe(25.0);
    expect(result.venta?.total).toBe(75.0);
  });

  // Test 7: Pago en efectivo con vuelto exacto
  it("7. Debe calcular el vuelto exacto al pagar en efectivo con monto mayor", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "EFECTIVO",
      montoRecibido: 100.0,
      items: [{ varianteId: "var_polo_negro_m", cantidad: 2, precioUnitario: 29.9 }], // 59.80
    });

    expect(result.success).toBe(true);
    expect(result.venta?.total).toBe(59.8);
    expect(result.venta?.montoRecibido).toBe(100.0);
    // Vuelto: 100 - 59.80 = 40.20
    expect(result.venta?.vuelto).toBe(40.2);
  });

  // Test 8: Pago en efectivo rechazado por monto insuficiente
  it("8. Debe rechazar la venta si el monto en efectivo entregado es menor al total", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "EFECTIVO",
      montoRecibido: 50.0,
      items: [{ varianteId: "var_taladro_650", cantidad: 1, precioUnitario: 119.0 }],
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("MONTO_INSUFICIENTE");

    // Stock intacto
    const taladro = engine.getVariant("var_taladro_650");
    expect(taladro?.stockActual).toBe(5);
  });

  // Test 9: Rechazo si el carrito está vacío o tiene cantidades inválidas
  it("9. Debe rechazar ventas con carrito vacío o cantidades menores o iguales a cero", async () => {
    const empty = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "EFECTIVO",
      items: [],
    });
    expect(empty.code).toBe("CARRITO_VACIO");

    const invalidQty = await engine.processSale({
      usuarioId: "usr_1",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_taladro_650", cantidad: 0, precioUnitario: 119 }],
    });
    expect(invalidQty.code).toBe("CANTIDAD_INVALIDA");
  });

  // Test 10: Auditoría Kardex inmutable para cada venta
  it("10. Cada venta debe registrar un movimiento Kardex inmutable con tipo VENTA y decremento", async () => {
    const result = await engine.processSale({
      usuarioId: "usr_auditor",
      metodoPago: "TRANSFERENCIA",
      items: [{ varianteId: "var_taladro_650", cantidad: 2, precioUnitario: 119.0 }],
    });

    expect(result.success).toBe(true);

    const movimientos = engine.getKardexForVariant("var_taladro_650");
    expect(movimientos).toHaveLength(1);

    const mov = movimientos[0];
    expect(mov.tipo).toBe("VENTA");
    expect(mov.cantidad).toBe(-2);
    expect(mov.stockAnterior).toBe(5);
    expect(mov.stockNuevo).toBe(3);
    expect(mov.usuarioId).toBe("usr_auditor");
    expect(mov.ventaId).toBe(result.venta?.id);
  });
});
