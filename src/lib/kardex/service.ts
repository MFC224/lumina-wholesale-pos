import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

export interface RegistrarAjusteParams {
  varianteId: string;
  cantidadAjuste: number; // Positivo para añadir, negativo para descontar merma/pérdida
  motivo: string;
  adminUserId: string;
  tipo?: TipoMovimiento; // Por defecto AJUSTE
}

export interface RegistrarAjusteResult {
  success: boolean;
  code?: string;
  error?: string;
  movimiento?: {
    id: string;
    varianteId: string;
    sku: string;
    productoNombre: string;
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    motivo: string;
    tipo: TipoMovimiento;
    fecha: Date;
  };
}

/**
 * Registra un ajuste de stock auditado en Kardex. Exclusivo para administradores.
 * Utiliza bloqueo pesimista (FOR UPDATE) para garantizar consistencia atómica.
 */
export async function registrarAjusteInventarioDb(
  params: RegistrarAjusteParams
): Promise<RegistrarAjusteResult> {
  const { varianteId, cantidadAjuste, motivo, adminUserId, tipo = TipoMovimiento.AJUSTE } = params;

  if (!varianteId) {
    return { success: false, code: "VARIANTE_REQUERIDA", error: "Debe especificar la variante a ajustar" };
  }

  if (cantidadAjuste === 0) {
    return { success: false, code: "CANTIDAD_CERO", error: "El ajuste de cantidad no puede ser 0" };
  }

  if (!motivo || !motivo.trim()) {
    return {
      success: false,
      code: "MOTIVO_REQUERIDO",
      error: "El motivo de auditoría para el ajuste de inventario es obligatorio",
    };
  }

  // 1. Verificar rol ADMIN
  const usuario = await prisma.usuario.findUnique({
    where: { id: adminUserId },
  });

  if (!usuario || usuario.rol !== "ADMIN") {
    return {
      success: false,
      code: "NO_AUTORIZADO",
      error: "Solo usuarios con rol ADMINISTRADOR pueden realizar ajustes manuales de stock",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // 2. Bloqueo pesimista sobre la variante
      const stocks = await tx.$queryRaw<Array<{ id: string; stockActual: number }>>`
        SELECT id, "stockActual" FROM "VarianteStock"
        WHERE id = ${varianteId}
        FOR UPDATE
      `;

      if (!stocks || stocks.length === 0) {
        return { success: false, code: "VARIANTE_NO_EXISTE", error: "La variante especificada no existe" };
      }

      const currentStock = stocks[0].stockActual;
      const nuevoStock = currentStock + cantidadAjuste;

      if (nuevoStock < 0) {
        return {
          success: false,
          code: "STOCK_NEGATIVO",
          error: `El ajuste solicitado dejaría el stock en negativo (${nuevoStock}). El stock actual es ${currentStock}.`,
        };
      }

      // 3. Actualizar stock de la variante
      const varianteActualizada = await tx.varianteStock.update({
        where: { id: varianteId },
        data: { stockActual: nuevoStock },
        include: {
          producto: { select: { nombre: true, codigoSku: true } },
        },
      });

      // 4. Crear movimiento de Kardex
      const movimiento = await tx.movimientoKardex.create({
        data: {
          varianteId,
          tipo,
          cantidad: cantidadAjuste,
          stockAnterior: currentStock,
          stockNuevo: nuevoStock,
          motivo: motivo.trim(),
          usuarioId: adminUserId,
        },
      });

      return {
        success: true,
        movimiento: {
          id: movimiento.id,
          varianteId,
          sku: varianteActualizada.sku,
          productoNombre: varianteActualizada.producto.nombre,
          cantidad: cantidadAjuste,
          stockAnterior: currentStock,
          stockNuevo: nuevoStock,
          motivo: motivo.trim(),
          tipo,
          fecha: movimiento.createdAt,
        },
      };
    });
  } catch (err) {
    return {
      success: false,
      code: "ERROR_TRANSACCION",
      error: err instanceof Error ? err.message : "Error al procesar el ajuste en base de datos",
    };
  }
}

/**
 * Consulta la bitácora de movimientos de Kardex con filtros opcionales.
 */
export async function consultarKardexDb(filter: {
  varianteId?: string;
  productoId?: string;
  tipo?: TipoMovimiento;
  limit?: number;
}) {
  const limit = Math.min(200, Math.max(1, filter.limit || 50));

  const whereClause: any = {};
  if (filter.varianteId) {
    whereClause.varianteId = filter.varianteId;
  }
  if (filter.tipo) {
    whereClause.tipo = filter.tipo;
  }
  if (filter.productoId) {
    whereClause.variante = { productoId: filter.productoId };
  }

  const movimientos = await prisma.movimientoKardex.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
      venta: { select: { id: true, numeroTicket: true } },
      variante: {
        select: {
          id: true,
          sku: true,
          talla: true,
          color: true,
          ubicacion: true,
          producto: {
            select: {
              id: true,
              nombre: true,
              codigoSku: true,
              categoria: { select: { nombre: true } },
            },
          },
        },
      },
    },
  });

  return movimientos.map((m) => ({
    id: m.id,
    fecha: m.createdAt,
    tipo: m.tipo,
    cantidad: m.cantidad,
    stockAnterior: m.stockAnterior,
    stockNuevo: m.stockNuevo,
    motivo: m.motivo || "Sin motivo registrado",
    usuario: m.usuario.nombre,
    rolUsuario: m.usuario.rol,
    numeroTicket: m.venta?.numeroTicket || null,
    sku: m.variante.sku,
    producto: m.variante.producto.nombre,
    talla: m.variante.talla,
    color: m.variante.color,
    ubicacion: m.variante.ubicacion,
    categoria: m.variante.producto.categoria?.nombre || "General",
  }));
}
