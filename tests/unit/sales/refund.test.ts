import { describe, it, expect, beforeEach } from "vitest";
import { procesarDevolucionItemDb } from "@/lib/sales/service";
import { prisma } from "@/lib/prisma";

describe("Módulo de Devoluciones Parciales de Venta (Sprint 3)", () => {
  let adminUser: any;
  let vendedorUser: any;
  let sampleProduct: any;
  let sampleVariant: any;
  let sampleVenta: any;
  let sampleDetalle: any;

  beforeEach(async () => {
    // Limpiar solo los registros de la prueba de refund para proteger el catálogo general
    await prisma.movimientoKardex.deleteMany({
      where: { motivo: { contains: "TICK-TEST-REFUND-" } },
    });
    await prisma.detalleVenta.deleteMany({
      where: { venta: { numeroTicket: { startsWith: "TICK-TEST-REFUND-" } } },
    });
    await prisma.venta.deleteMany({
      where: { numeroTicket: { startsWith: "TICK-TEST-REFUND-" } },
    });

    // 2. Obtener o crear usuarios de prueba
    adminUser = await prisma.usuario.findFirst({
      where: { rol: "ADMIN" },
    });
    if (!adminUser) {
      adminUser = await prisma.usuario.create({
        data: {
          nombre: "Admin Supervisor",
          pin: "$2a$10$abcdefg1234567890",
          rol: "ADMIN",
          activo: true,
        },
      });
    }

    vendedorUser = await prisma.usuario.findFirst({
      where: { rol: "VENDEDOR" },
    });
    if (!vendedorUser) {
      vendedorUser = await prisma.usuario.create({
        data: {
          nombre: "Cajero Turno",
          pin: "$2a$10$abcdefg1234567890",
          rol: "VENDEDOR",
          activo: true,
        },
      });
    }

    // 3. Obtener o crear producto y variante de prueba
    sampleVariant = await prisma.varianteStock.findFirst({
      include: { producto: true },
    });

    if (!sampleVariant) {
      sampleProduct = await prisma.producto.create({
        data: {
          nombre: "Polo Drill Heavyweight",
          precioOriginal: 80.0,
          precioLiquidacion: 40.0,
          costo: 20.0,
        },
      });

      sampleVariant = await prisma.varianteStock.create({
        data: {
          productoId: sampleProduct.id,
          sku: "POL-DRL-M",
          talla: "M",
          color: "Azul",
          stockInicial: 20,
          stockActual: 16,
        },
        include: { producto: true },
      });
    }

    // Asegurar stock mínimo para la prueba
    await prisma.varianteStock.update({
      where: { id: sampleVariant.id },
      data: { stockActual: 16 },
    });

    // 4. Crear venta completada con 4 unidades
    sampleVenta = await prisma.venta.create({
      data: {
        numeroTicket: `TICK-TEST-REFUND-${Date.now()}`,
        usuarioId: vendedorUser.id,
        subtotal: 160.0,
        descuento: 16.0, // 10% descuento
        tipoDescuento: "PORCENTAJE",
        total: 144.0,
        metodoPago: "EFECTIVO",
        montoRecibido: 150.0,
        vuelto: 6.0,
        estado: "COMPLETADA",
      },
    });

    sampleDetalle = await prisma.detalleVenta.create({
      data: {
        ventaId: sampleVenta.id,
        varianteId: sampleVariant.id,
        cantidad: 4,
        precioUnitario: 40.0,
        subtotal: 160.0,
      },
    });
  });

  it("debe rechazar la devolución si el motivo está vacío", async () => {
    const res = await procesarDevolucionItemDb({
      ventaId: sampleVenta.id,
      detalleId: sampleDetalle.id,
      cantidad: 1,
      motivo: "   ",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("MOTIVO_REQUERIDO");
  });

  it("debe rechazar la devolución si el usuario NO es ADMIN", async () => {
    const res = await procesarDevolucionItemDb({
      ventaId: sampleVenta.id,
      detalleId: sampleDetalle.id,
      cantidad: 1,
      motivo: "Cliente no le quedó la talla",
      adminUserId: vendedorUser.id, // VENDEDOR
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("NO_AUTORIZADO");
  });

  it("debe rechazar si la cantidad a devolver supera las unidades compradas", async () => {
    const res = await procesarDevolucionItemDb({
      ventaId: sampleVenta.id,
      detalleId: sampleDetalle.id,
      cantidad: 5, // Compró solo 4
      motivo: "Devolución excesiva",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("CANTIDAD_EXCESIVA");
  });

  it("debe procesar exitosamente la devolución parcial de 1 unidad y restituir stock en BD", async () => {
    const res = await procesarDevolucionItemDb({
      ventaId: sampleVenta.id,
      detalleId: sampleDetalle.id,
      cantidad: 1,
      motivo: "Cambio de talla por prenda más chica",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(true);
    expect(res.devolucion).toBeDefined();
    expect(res.devolucion?.cantidadDevuelta).toBe(1);
    expect(res.devolucion?.nuevoStock).toBe(17); // 16 + 1 = 17

    // Verificar en BD que el stock se incrementó
    const varianteActualizada = await prisma.varianteStock.findUniqueOrThrow({
      where: { id: sampleVariant.id },
    });
    expect(varianteActualizada.stockActual).toBe(17);

    // Verificar registro en Kardex
    const kardex = await prisma.movimientoKardex.findFirst({
      where: {
        varianteId: sampleVariant.id,
        tipo: "INGRESO",
        motivo: { contains: "Devolución" },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(kardex).toBeDefined();
    expect(kardex?.cantidad).toBe(1);
    expect(kardex?.stockAnterior).toBe(16);
    expect(kardex?.stockNuevo).toBe(17);
    expect(kardex?.usuarioId).toBe(adminUser.id);
  });

  it("debe calcular el monto exacto de reembolso proporcional con descuento del ticket", async () => {
    // Ticket: Subtotal 160, Total 144 (10% descuento). Precio unitario: 40.
    // Reembolso por 2 unidades con 10% de descuento = 40 * 2 * 0.9 = 72.00 Soles
    const res = await procesarDevolucionItemDb({
      ventaId: sampleVenta.id,
      detalleId: sampleDetalle.id,
      cantidad: 2,
      motivo: "Devolución de 2 unidades",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(true);
    expect(res.devolucion?.montoReembolso).toBe(72.0);
  });
});
