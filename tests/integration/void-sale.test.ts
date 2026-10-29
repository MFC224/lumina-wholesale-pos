import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";

describe("HU-08: Anulación Transaccional de Ventas y Auditoría Kardex", () => {
  let engine: SalesTransactionEngine;

  const mockVariants: VariantEntity[] = [
    {
      id: "var_zapatilla_40",
      sku: "ZAP-URB-40",
      nombreProducto: "Zapatilla Urbana Casual",
      talla: "40",
      color: "Blanco",
      stockActual: 10,
      precioLiquidacion: 89.9,
    },
    {
      id: "var_casaca_cuero",
      sku: "CAS-CUER-L",
      nombreProducto: "Casaca de Cuero Sintético",
      talla: "L",
      color: "Marrón",
      stockActual: 6,
      precioLiquidacion: 149.0,
    },
  ];

  beforeEach(() => {
    engine = new SalesTransactionEngine(mockVariants);
  });

  // Test 1: Anulación exitosa ejecutada por un usuario ADMIN
  it("1. Debe permitir al Administrador anular una venta con motivo válido y cambiar su estado", async () => {
    // 1. Crear venta inicial
    const saleRes = await engine.processSale({
      usuarioId: "usr_vendedor_01",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 2, precioUnitario: 89.9 }],
    });

    expect(saleRes.success).toBe(true);
    const ventaId = saleRes.venta!.id;

    // 2. Anular venta como ADMIN
    const voidRes = await engine.voidSale({
      ventaId,
      solicitanteId: "usr_admin_principal",
      rolSolicitante: "ADMIN",
      motivo: "Cliente solicitó cambio de opinión en caja antes del retiro",
    });

    expect(voidRes.success).toBe(true);
    expect(voidRes.venta?.estado).toBe("ANULADA");
    expect(voidRes.venta?.anuladoPorId).toBe("usr_admin_principal");
    expect(voidRes.venta?.motivoAnulacion).toContain("Cliente solicitó cambio de opinión");
  });

  // Test 2: Rechazo de anulación para rol VENDEDOR (Seguridad RBAC)
  it("2. [HU-08] Debe denegar la anulación si el solicitante es VENDEDOR", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_vendedor_01",
      metodoPago: "YAPE",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 1, precioUnitario: 89.9 }],
    });

    const voidRes = await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_vendedor_01",
      rolSolicitante: "VENDEDOR", // No autorizado
      motivo: "Intento de anulación sin permiso",
    });

    expect(voidRes.success).toBe(false);
    expect(voidRes.code).toBe("FORBIDDEN_ROLE");

    // La venta debe mantenerse como COMPLETADA
    const ventaActual = engine.getSale(saleRes.venta!.id);
    expect(ventaActual?.estado).toBe("COMPLETADA");
  });

  // Test 3: Rechazo de anulación sin motivo justificado
  it("3. Debe rechazar la anulación si el motivo está vacío o solo contiene espacios", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "PLIN",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 1, precioUnitario: 89.9 }],
    });

    const voidRes = await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "   ", // Vacío
    });

    expect(voidRes.success).toBe(false);
    expect(voidRes.code).toBe("MOTIVO_REQUERIDO");
  });

  // Test 4: Restauración íntegra del stock en la base de datos tras la anulación
  it("4. Debe restaurar exactamente la cantidad vendida al stock actual de la variante", async () => {
    // Stock inicial: 10
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "TARJETA",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 4, precioUnitario: 89.9 }],
    });

    // Stock tras venta: 6
    expect(engine.getVariant("var_zapatilla_40")?.stockActual).toBe(6);

    // Anular venta de 4 unidades
    await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Error en tarjeta del cliente",
    });

    // Stock restaurado: 6 + 4 = 10
    expect(engine.getVariant("var_zapatilla_40")?.stockActual).toBe(10);
  });

  // Test 5: Registro Kardex con tipo ANULACION y cantidad positiva
  it("5. Debe registrar un movimiento en Kardex de tipo ANULACION con cantidad positiva de reingreso", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 3, precioUnitario: 89.9 }],
    });

    await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_admin_01",
      rolSolicitante: "ADMIN",
      motivo: "Ticket duplicado por error de digitación",
    });

    const kardex = engine.getKardexForVariant("var_zapatilla_40");
    expect(kardex).toHaveLength(2); // Venta + Anulación

    const movAnulacion = kardex[1];
    expect(movAnulacion.tipo).toBe("ANULACION");
    expect(movAnulacion.cantidad).toBe(3); // Reingreso positivo
    expect(movAnulacion.stockAnterior).toBe(7);
    expect(movAnulacion.stockNuevo).toBe(10);
    expect(movAnulacion.usuarioId).toBe("usr_admin_01");
    expect(movAnulacion.motivo).toContain("Ticket duplicado");
  });

  // Test 6: Rechazo si se intenta anular una venta inexistente
  it("6. Debe retornar error VENTA_NO_ENCONTRADA si el ID no corresponde a ninguna venta", async () => {
    const voidRes = await engine.voidSale({
      ventaId: "id_inexistente_999",
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Venta no existe",
    });

    expect(voidRes.success).toBe(false);
    expect(voidRes.code).toBe("VENTA_NO_ENCONTRADA");
  });

  // Test 7: Rechazo de doble anulación sobre el mismo ticket
  it("7. Debe rechazar cualquier intento de volver a anular una venta ya anulada", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 1, precioUnitario: 89.9 }],
    });

    const ventaId = saleRes.venta!.id;

    // Primera anulación: exitosa
    const anulacion1 = await engine.voidSale({
      ventaId,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Primer intento de anulación",
    });
    expect(anulacion1.success).toBe(true);

    // Segundo intento de anulación: rechazo
    const anulacion2 = await engine.voidSale({
      ventaId,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Segundo intento repetido",
    });
    expect(anulacion2.success).toBe(false);
    expect(anulacion2.code).toBe("VENTA_YA_ANULADA");

    // Stock debe haberse restaurado exactamente una vez (de 9 a 10)
    expect(engine.getVariant("var_zapatilla_40")?.stockActual).toBe(10);
  });

  // Test 8: Preservación de trazabilidad completa del ticket anulado
  it("8. El registro de la venta debe conservar todos sus ítems originales tras la anulación", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_zapatilla_40", cantidad: 2, precioUnitario: 89.9 }],
    });

    const ventaId = saleRes.venta!.id;

    await engine.voidSale({
      ventaId,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Auditoría de arqueo",
    });

    const ventaPersistida = engine.getSale(ventaId);
    expect(ventaPersistida?.estado).toBe("ANULADA");
    expect(ventaPersistida?.detalles).toHaveLength(1);
    expect(ventaPersistida?.detalles[0].cantidad).toBe(2);
    expect(ventaPersistida?.total).toBe(179.8);
    expect(ventaPersistida?.fechaAnulacion).toBeDefined();
  });

  // Test 9: Restauración atómica en ventas multi-ítem
  it("9. Debe restaurar atómicamente el stock de todas las variantes involucradas en una venta múltiple", async () => {
    // Venta de 2 zapatillas (stock 10 -> 8) y 3 casacas (stock 6 -> 3)
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero",
      metodoPago: "YAPE",
      items: [
        { varianteId: "var_zapatilla_40", cantidad: 2, precioUnitario: 89.9 },
        { varianteId: "var_casaca_cuero", cantidad: 3, precioUnitario: 149.0 },
      ],
    });

    expect(engine.getVariant("var_zapatilla_40")?.stockActual).toBe(8);
    expect(engine.getVariant("var_casaca_cuero")?.stockActual).toBe(3);

    // Anular venta multi-ítem
    const voidRes = await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Anulación de pedido completo por reclamo de cliente",
    });

    expect(voidRes.success).toBe(true);

    // Ambas variantes deben tener su stock original restituido
    expect(engine.getVariant("var_zapatilla_40")?.stockActual).toBe(10);
    expect(engine.getVariant("var_casaca_cuero")?.stockActual).toBe(6);
  });

  // Test 10: Secuencia cronológica y correlación de Kardex
  it("10. El historial de Kardex debe reflejar la trazabilidad completa (VENTA -> ANULACION) con el mismo ventaId", async () => {
    const saleRes = await engine.processSale({
      usuarioId: "usr_vendedor_01",
      metodoPago: "EFECTIVO",
      items: [{ varianteId: "var_casaca_cuero", cantidad: 1, precioUnitario: 149.0 }],
    });

    const ventaId = saleRes.venta!.id;

    await engine.voidSale({
      ventaId,
      solicitanteId: "usr_admin_supervisor",
      rolSolicitante: "ADMIN",
      motivo: "Prenda con falla de cierre detectada en empaque",
    });

    const historial = engine.getKardexForVariant("var_casaca_cuero");
    expect(historial).toHaveLength(2);

    expect(historial[0].tipo).toBe("VENTA");
    expect(historial[0].cantidad).toBe(-1);
    expect(historial[0].ventaId).toBe(ventaId);

    expect(historial[1].tipo).toBe("ANULACION");
    expect(historial[1].cantidad).toBe(1);
    expect(historial[1].ventaId).toBe(ventaId);
    expect(historial[1].motivo).toContain("Prenda con falla de cierre");
  });
});
