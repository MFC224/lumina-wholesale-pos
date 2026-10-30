import { describe, it, expect, beforeEach } from "vitest";
import { registrarAjusteInventarioDb, consultarKardexDb } from "@/lib/kardex/service";
import { prisma } from "@/lib/prisma";

describe("Módulo de Auditoría de Kardex y Ajustes de Stock (Sprint 4)", () => {
  let adminUser: any;
  let vendedorUser: any;
  let testVariant: any;

  beforeEach(async () => {
    // 1. Limpiar solo movimientos de prueba para proteger el catálogo
    await prisma.movimientoKardex.deleteMany({
      where: { motivo: { contains: "TEST-KARDEX-ADJUST" } },
    });

    // 2. Obtener usuarios
    adminUser = await prisma.usuario.findFirst({ where: { rol: "ADMIN" } });
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

    vendedorUser = await prisma.usuario.findFirst({ where: { rol: "VENDEDOR" } });
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

    // 3. Obtener o crear variante de prueba exclusiva para evitar concurrencia en tests
    testVariant = await prisma.varianteStock.findUnique({
      where: { sku: "SKU-DEDICATED-KARDEX-ADJUST" },
      include: { producto: true },
    });

    if (!testVariant) {
      const prod = await prisma.producto.create({
        data: {
          nombre: "Producto Exclusivo Kardex Adjust",
          precioOriginal: 50,
          precioLiquidacion: 30,
          costo: 15,
        },
      });
      testVariant = await prisma.varianteStock.create({
        data: {
          productoId: prod.id,
          sku: "SKU-DEDICATED-KARDEX-ADJUST",
          stockInicial: 20,
          stockActual: 20,
        },
        include: { producto: true },
      });
    }
  });

  it("debe rechazar el ajuste si el motivo de auditoría está vacío", async () => {
    const res = await registrarAjusteInventarioDb({
      varianteId: testVariant.id,
      cantidadAjuste: 5,
      motivo: "   ",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("MOTIVO_REQUERIDO");
  });

  it("debe rechazar el ajuste si la cantidad es 0", async () => {
    const res = await registrarAjusteInventarioDb({
      varianteId: testVariant.id,
      cantidadAjuste: 0,
      motivo: "TEST-KARDEX-ADJUST: Ajuste nulo",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("CANTIDAD_CERO");
  });

  it("debe rechazar el ajuste si el usuario NO es ADMINISTRADOR (RBAC)", async () => {
    const res = await registrarAjusteInventarioDb({
      varianteId: testVariant.id,
      cantidadAjuste: 5,
      motivo: "TEST-KARDEX-ADJUST: Intento por vendedor",
      adminUserId: vendedorUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("NO_AUTORIZADO");
  });

  it("debe rechazar ajustes que resulten en stock negativo (Cero Sobreventa)", async () => {
    const current = testVariant.stockActual;
    const res = await registrarAjusteInventarioDb({
      varianteId: testVariant.id,
      cantidadAjuste: -(current + 50), // Descuenta más de lo que hay
      motivo: "TEST-KARDEX-ADJUST: Descuento excesivo",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("STOCK_NEGATIVO");
  });

  it("debe registrar exitosamente un ajuste de inventario y reflejarlo en Kardex y en stock", async () => {
    const currentVar = await prisma.varianteStock.findUniqueOrThrow({
      where: { id: testVariant.id },
    });
    const stockAntes = currentVar.stockActual;

    const res = await registrarAjusteInventarioDb({
      varianteId: testVariant.id,
      cantidadAjuste: 3,
      motivo: "TEST-KARDEX-ADJUST: Ingreso de 3 unidades halladas en almacén",
      adminUserId: adminUser.id,
    });

    expect(res.success).toBe(true);
    expect(res.movimiento).toBeDefined();
    expect(res.movimiento?.stockAnterior).toBe(stockAntes);
    expect(res.movimiento?.stockNuevo).toBe(stockAntes + 3);

    // Verificar en BD
    const varianteActualizada = await prisma.varianteStock.findUniqueOrThrow({
      where: { id: testVariant.id },
    });
    expect(varianteActualizada.stockActual).toBe(stockAntes + 3);

    // Revertir el ajuste de prueba para dejar el stock intacto
    await prisma.varianteStock.update({
      where: { id: testVariant.id },
      data: { stockActual: stockAntes },
    });
  });

  it("debe permitir consultar la bitácora de Kardex", async () => {
    const movimientos = await consultarKardexDb({ limit: 10 });
    expect(Array.isArray(movimientos)).toBe(true);
    expect(movimientos.length).toBeGreaterThan(0);
    expect(movimientos[0]).toHaveProperty("sku");
    expect(movimientos[0]).toHaveProperty("tipo");
  });
});
