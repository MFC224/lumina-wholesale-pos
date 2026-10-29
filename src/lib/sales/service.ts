import { prisma } from "@/lib/prisma";
import { CreateSaleInput, ProcessSaleResult, VoidSaleResult } from "@/types/sales";
import { generateTicketNumber } from "./ticket";
import { TipoMovimiento, EstadoVenta, MetodoPago, TipoDescuento } from "@prisma/client";

/**
 * Servicio de ventas para base de datos PostgreSQL con Prisma ORM.
 * Emplea transacciones ACID con SELECT ... FOR UPDATE para garantizar CERO sobreventa.
 */
export async function procesarVentaDb(input: CreateSaleInput): Promise<ProcessSaleResult> {
  if (!input.items || input.items.length === 0) {
    return {
      success: false,
      error: "El carrito de compras está vacío.",
      code: "CARRITO_VACIO",
    };
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Bloqueo pesimista a nivel de fila (Pessimistic Locking)
      for (const item of input.items) {
        // Bloquear fila de la variante para evitar race conditions
        const rows = await tx.$queryRaw<Array<{ id: string; stockActual: number }>>`
          SELECT id, "stockActual" 
          FROM "VarianteStock" 
          WHERE id = ${item.varianteId} 
          FOR UPDATE
        `;

        if (!rows || rows.length === 0) {
          throw new Error(`VARIANTE_NO_ENCONTRADA:${item.varianteId}`);
        }

        const stockDisponible = rows[0].stockActual;
        if (stockDisponible < item.cantidad) {
          throw new Error(`STOCK_INSUFICIENTE:${item.varianteId}:${stockDisponible}:${item.cantidad}`);
        }
      }

      // 2. Cálculos financieros
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += Math.round(item.precioUnitario * item.cantidad * 100) / 100;
      }

      let descuentoMonto = 0;
      const tipoDescuento = (input.tipoDescuento as TipoDescuento) || TipoDescuento.NINGUNO;
      if (tipoDescuento === TipoDescuento.PORCENTAJE && input.descuento) {
        descuentoMonto = Math.round((subtotal * (input.descuento / 100)) * 100) / 100;
      } else if (tipoDescuento === TipoDescuento.MONTO_FIJO && input.descuento) {
        descuentoMonto = Math.min(subtotal, Math.round(input.descuento * 100) / 100);
      }

      const total = Math.max(0, Math.round((subtotal - descuentoMonto) * 100) / 100);
      const montoRecibido = input.montoRecibido !== undefined ? input.montoRecibido : total;

      if (input.metodoPago === "EFECTIVO" && montoRecibido < total) {
        throw new Error("MONTO_INSUFICIENTE");
      }

      const vuelto = input.metodoPago === "EFECTIVO" ? Math.max(0, Math.round((montoRecibido - total) * 100) / 100) : 0;
      const numeroTicket = generateTicketNumber();

      // 3. Crear venta
      const venta = await tx.venta.create({
        data: {
          numeroTicket,
          usuarioId: input.usuarioId,
          subtotal,
          descuento: descuentoMonto,
          tipoDescuento,
          total,
          metodoPago: input.metodoPago as MetodoPago,
          montoRecibido,
          vuelto,
          estado: EstadoVenta.COMPLETADA,
          sesionCajaId: input.sesionCajaId,
        },
      });

      // 4. Procesar cada detalle, descontar stock e insertar Kardex
      for (const item of input.items) {
        const itemSubtotal = Math.round(item.precioUnitario * item.cantidad * 100) / 100;

        await tx.detalleVenta.create({
          data: {
            ventaId: venta.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: itemSubtotal,
          },
        });

        // Obtener stock previo antes de actualizar
        const varianteAntes = await tx.varianteStock.findUniqueOrThrow({
          where: { id: item.varianteId },
        });

        const stockAnterior = varianteAntes.stockActual;
        const stockNuevo = stockAnterior - item.cantidad;

        await tx.varianteStock.update({
          where: { id: item.varianteId },
          data: { stockActual: { decrement: item.cantidad } },
        });

        await tx.movimientoKardex.create({
          data: {
            varianteId: item.varianteId,
            tipo: TipoMovimiento.VENTA,
            cantidad: -item.cantidad,
            stockAnterior,
            stockNuevo,
            motivo: `Venta Ticket ${numeroTicket}`,
            usuarioId: input.usuarioId,
            ventaId: venta.id,
          },
        });
      }

      return venta;
    });

    return {
      success: true,
      venta: {
        id: resultado.id,
        numeroTicket: resultado.numeroTicket,
        usuarioId: resultado.usuarioId,
        subtotal: Number(resultado.subtotal),
        descuento: Number(resultado.descuento),
        tipoDescuento: resultado.tipoDescuento as any,
        total: Number(resultado.total),
        metodoPago: resultado.metodoPago as any,
        montoRecibido: Number(resultado.montoRecibido),
        vuelto: Number(resultado.vuelto),
        estado: resultado.estado as any,
        createdAt: resultado.createdAt,
        updatedAt: resultado.updatedAt,
        detalles: [],
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Desconocido";

    if (msg.startsWith("STOCK_INSUFICIENTE")) {
      const [, varianteId, disponible, pedida] = msg.split(":");
      return {
        success: false,
        error: "Stock insuficiente para completar la transacción. Cero sobreventa garantizada.",
        code: "STOCK_INSUFICIENTE",
        stockFaltante: [
          {
            varianteId,
            stockDisponible: Number(disponible),
            cantidadSolicitada: Number(pedida),
          },
        ],
      };
    }

    if (msg.startsWith("VARIANTE_NO_ENCONTRADA")) {
      return {
        success: false,
        error: "Una de las variantes seleccionadas ya no está disponible.",
        code: "VARIANTE_NO_ENCONTRADA",
      };
    }

    if (msg === "MONTO_INSUFICIENTE") {
      return {
        success: false,
        error: "El monto en efectivo entregado es menor al total a pagar.",
        code: "MONTO_INSUFICIENTE",
      };
    }

    return {
      success: false,
      error: "Error interno al procesar la venta: " + msg,
      code: "TRANSACCION_ERROR",
    };
  }
}

/**
 * Anula una venta registrada en base de datos restaurando el inventario atómicamente.
 * Solo permitido para administradores con motivo especificado.
 */
export async function anularVentaDb(
  ventaId: string,
  adminUserId: string,
  motivo: string
): Promise<VoidSaleResult> {
  if (!motivo || !motivo.trim()) {
    return {
      success: false,
      error: "El motivo de la anulación es estrictamente obligatorio.",
      code: "MOTIVO_REQUERIDO",
    };
  }

  try {
    const ventaAnulada = await prisma.$transaction(async (tx) => {
      // 1. Obtener venta con detalles
      const venta = await tx.venta.findUnique({
        where: { id: ventaId },
        include: { detalles: true },
      });

      if (!venta) {
        throw new Error("VENTA_NO_ENCONTRADA");
      }

      if (venta.estado === EstadoVenta.ANULADA) {
        throw new Error("VENTA_YA_ANULADA");
      }

      // 2. Restaurar stock de cada ítem y registrar en Kardex
      for (const det of venta.detalles) {
        const varianteAntes = await tx.varianteStock.findUniqueOrThrow({
          where: { id: det.varianteId },
        });

        const stockAnterior = varianteAntes.stockActual;
        const stockNuevo = stockAnterior + det.cantidad;

        await tx.varianteStock.update({
          where: { id: det.varianteId },
          data: { stockActual: { increment: det.cantidad } },
        });

        await tx.movimientoKardex.create({
          data: {
            varianteId: det.varianteId,
            tipo: TipoMovimiento.ANULACION,
            cantidad: det.cantidad, // Positivo
            stockAnterior,
            stockNuevo,
            motivo: `Anulación de Ticket ${venta.numeroTicket} - Motivo: ${motivo.trim()}`,
            usuarioId: adminUserId,
            ventaId: venta.id,
          },
        });
      }

      // 3. Cambiar estado de la venta
      const updated = await tx.venta.update({
        where: { id: ventaId },
        data: {
          estado: EstadoVenta.ANULADA,
          anuladoPorId: adminUserId,
          motivoAnulacion: motivo.trim(),
        },
      });

      return updated;
    });

    return {
      success: true,
      venta: {
        id: ventaAnulada.id,
        numeroTicket: ventaAnulada.numeroTicket,
        usuarioId: ventaAnulada.usuarioId,
        subtotal: Number(ventaAnulada.subtotal),
        descuento: Number(ventaAnulada.descuento),
        tipoDescuento: ventaAnulada.tipoDescuento as any,
        total: Number(ventaAnulada.total),
        metodoPago: ventaAnulada.metodoPago as any,
        montoRecibido: Number(ventaAnulada.montoRecibido),
        vuelto: Number(ventaAnulada.vuelto),
        estado: ventaAnulada.estado as any,
        anuladoPorId: ventaAnulada.anuladoPorId,
        motivoAnulacion: ventaAnulada.motivoAnulacion,
        createdAt: ventaAnulada.createdAt,
        updatedAt: ventaAnulada.updatedAt,
        detalles: [],
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Desconocido";

    if (msg === "VENTA_NO_ENCONTRADA") {
      return { success: false, error: "La venta solicitada no existe.", code: "VENTA_NO_ENCONTRADA" };
    }
    if (msg === "VENTA_YA_ANULADA") {
      return { success: false, error: "La venta ya se encuentra anulada.", code: "VENTA_YA_ANULADA" };
    }

    return {
      success: false,
      error: "Error interno al anular la venta: " + msg,
      code: "TRANSACCION_ERROR",
    };
  }
}
