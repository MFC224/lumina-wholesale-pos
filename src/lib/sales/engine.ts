import {
  CreateSaleInput,
  ProcessSaleResult,
  VoidSaleInput,
  VoidSaleResult,
  SaleRecord,
  KardexRecord,
  SaleItemDetail,
} from "@/types/sales";
import { generateTicketNumber } from "./ticket";

export interface VariantEntity {
  id: string;
  sku: string;
  nombreProducto: string;
  talla?: string | null;
  color?: string | null;
  stockActual: number;
  precioLiquidacion: number;
}

/**
 * Mutex para bloqueo pesimista a nivel de fila (emula SELECT ... FOR UPDATE).
 * Garantiza que múltiples transacciones concurrentes sobre la misma variante
 * se resuelvan en orden secuencial estricto, impidiendo race conditions.
 */
class RowLockManager {
  private locks = new Map<string, Promise<void>>();

  async acquire(ids: string[]): Promise<() => void> {
    // Ordenar IDs para prevenir deadlocks
    const sortedIds = [...new Set(ids)].sort();
    const releaseFns: (() => void)[] = [];

    for (const id of sortedIds) {
      while (this.locks.has(id)) {
        await this.locks.get(id);
      }

      let releaseCurrent: () => void = () => {};
      const lockPromise = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
      });

      this.locks.set(id, lockPromise);
      releaseFns.push(() => {
        this.locks.delete(id);
        releaseCurrent();
      });
    }

    return () => {
      // Liberar todos los bloqueos en orden inverso
      while (releaseFns.length > 0) {
        const release = releaseFns.pop();
        if (release) release();
      }
    };
  }
}

/**
 * Motor transaccional atómico de ventas y Kardex con soporte de bloqueo pesimista.
 */
export class SalesTransactionEngine {
  private lockManager = new RowLockManager();
  private variants = new Map<string, VariantEntity>();
  private sales = new Map<string, SaleRecord>();
  private kardex = new Map<string, KardexRecord[]>(); // varianteId -> KardexRecord[]

  constructor(initialVariants: VariantEntity[] = []) {
    for (const v of initialVariants) {
      this.variants.set(v.id, { ...v });
    }
  }

  setVariant(variant: VariantEntity) {
    this.variants.set(variant.id, { ...variant });
  }

  getVariant(id: string): VariantEntity | undefined {
    const v = this.variants.get(id);
    return v ? { ...v } : undefined;
  }

  getSale(id: string): SaleRecord | undefined {
    const s = this.sales.get(id);
    return s ? JSON.parse(JSON.stringify(s)) : undefined;
  }

  getKardexForVariant(varianteId: string): KardexRecord[] {
    return (this.kardex.get(varianteId) || []).map((k) => ({ ...k }));
  }

  getAllSales(): SaleRecord[] {
    return Array.from(this.sales.values()).map((s) => JSON.parse(JSON.stringify(s)));
  }

  /**
   * Ejecuta el cobro transaccional atómico de una venta con bloqueo pesimista.
   */
  async processSale(input: CreateSaleInput): Promise<ProcessSaleResult> {
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: "El carrito de compras está vacío.",
        code: "CARRITO_VACIO",
      };
    }

    // Validar cantidades positivas
    for (const item of input.items) {
      if (!item.cantidad || item.cantidad <= 0 || !Number.isInteger(item.cantidad)) {
        return {
          success: false,
          error: `La cantidad solicitada para la variante ${item.varianteId} debe ser un número entero mayor a 0.`,
          code: "CANTIDAD_INVALIDA",
        };
      }
    }

    const varianteIds = input.items.map((i) => i.varianteId);

    // 1. Adquirir bloqueo pesimista a nivel de fila (SELECT ... FOR UPDATE)
    const releaseLock = await this.lockManager.acquire(varianteIds);

    // Snapshot para Rollback Atómico en caso de error
    const rollbackStockSnapshots = new Map<string, number>();

    try {
      const stockFaltante: { varianteId: string; stockDisponible: number; cantidadSolicitada: number }[] = [];

      // 2. Verificar existencia y stock de cada ítem
      for (const item of input.items) {
        const variante = this.variants.get(item.varianteId);
        if (!variante) {
          return {
            success: false,
            error: `La variante con ID '${item.varianteId}' no existe en el catálogo.`,
            code: "VARIANTE_NO_ENCONTRADA",
          };
        }

        if (variante.stockActual < item.cantidad) {
          stockFaltante.push({
            varianteId: item.varianteId,
            stockDisponible: variante.stockActual,
            cantidadSolicitada: item.cantidad,
          });
        }
      }

      // Si falta stock en uno o más ítems -> ROLLBACK TOTAL
      if (stockFaltante.length > 0) {
        return {
          success: false,
          error: "Stock insuficiente para completar la venta. Cero sobreventa garantizada.",
          code: "STOCK_INSUFICIENTE",
          stockFaltante,
        };
      }

      // 3. Cálculos financieros en Soles
      let subtotal = 0;
      const detalles: SaleItemDetail[] = [];
      const ventaId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date();

      for (const item of input.items) {
        const variante = this.variants.get(item.varianteId)!;
        rollbackStockSnapshots.set(item.varianteId, variante.stockActual);

        const itemSubtotal = Math.round(item.precioUnitario * item.cantidad * 100) / 100;
        subtotal += itemSubtotal;

        // Descontar stock
        const stockAnterior = variante.stockActual;
        const stockNuevo = stockAnterior - item.cantidad;
        variante.stockActual = stockNuevo;

        detalles.push({
          id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ventaId,
          varianteId: variante.id,
          sku: variante.sku,
          nombreProducto: variante.nombreProducto,
          talla: variante.talla,
          color: variante.color,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: itemSubtotal,
        });

        // Registrar movimiento Kardex inmutable
        const kardexList = this.kardex.get(variante.id) || [];
        kardexList.push({
          id: `kdx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          varianteId: variante.id,
          tipo: "VENTA",
          cantidad: -item.cantidad,
          stockAnterior,
          stockNuevo,
          motivo: `Venta en caja - Ticket en proceso`,
          usuarioId: input.usuarioId,
          ventaId,
          createdAt: now,
        });
        this.kardex.set(variante.id, kardexList);
      }

      // Descuentos
      let descuentoMonto = 0;
      const tipoDescuento = input.tipoDescuento || "NINGUNO";
      if (tipoDescuento === "PORCENTAJE" && input.descuento) {
        descuentoMonto = Math.round((subtotal * (input.descuento / 100)) * 100) / 100;
      } else if (tipoDescuento === "MONTO_FIJO" && input.descuento) {
        descuentoMonto = Math.min(subtotal, Math.round(input.descuento * 100) / 100);
      }

      const total = Math.max(0, Math.round((subtotal - descuentoMonto) * 100) / 100);
      const montoRecibido = input.montoRecibido !== undefined ? input.montoRecibido : total;

      if (input.metodoPago === "EFECTIVO" && montoRecibido < total) {
        // Rollback por monto insuficiente
        for (const [vId, prevStock] of rollbackStockSnapshots.entries()) {
          this.variants.get(vId)!.stockActual = prevStock;
        }
        return {
          success: false,
          error: `Monto recibido (${montoRecibido}) es menor al total a pagar (${total}).`,
          code: "MONTO_INSUFICIENTE",
        };
      }

      const vuelto = input.metodoPago === "EFECTIVO" ? Math.max(0, Math.round((montoRecibido - total) * 100) / 100) : 0;
      const numeroTicket = generateTicketNumber();

      const nuevaVenta: SaleRecord = {
        id: ventaId,
        numeroTicket,
        usuarioId: input.usuarioId,
        subtotal: Math.round(subtotal * 100) / 100,
        descuento: descuentoMonto,
        tipoDescuento,
        total,
        metodoPago: input.metodoPago,
        montoRecibido,
        vuelto,
        estado: "COMPLETADA",
        sesionCajaId: input.sesionCajaId,
        createdAt: now,
        updatedAt: now,
        detalles,
      };

      this.sales.set(ventaId, nuevaVenta);

      return {
        success: true,
        venta: nuevaVenta,
      };
    } catch (err) {
      // ROLLBACK en caso de excepción imprevista
      for (const [vId, prevStock] of rollbackStockSnapshots.entries()) {
        const v = this.variants.get(vId);
        if (v) v.stockActual = prevStock;
      }
      return {
        success: false,
        error: "Error interno en la transacción de venta: " + (err instanceof Error ? err.message : "Desconocido"),
        code: "TRANSACCION_ERROR",
      };
    } finally {
      // Liberar bloqueos pesimistas
      releaseLock();
    }
  }

  /**
   * Anula una venta completada restaurando el inventario atómicamente en Kardex (HU-08).
   * Solo autorizado para usuarios con rol ADMIN.
   */
  async voidSale(input: VoidSaleInput): Promise<VoidSaleResult> {
    // 1. Verificación de permisos de rol (Solo ADMIN)
    if (input.rolSolicitante !== "ADMIN") {
      return {
        success: false,
        error: "Acceso denegado: Solo el Administrador tiene autorización para anular ventas registradas.",
        code: "FORBIDDEN_ROLE",
      };
    }

    // 2. Validación de motivo obligatorio
    if (!input.motivo || !input.motivo.trim()) {
      return {
        success: false,
        error: "Es obligatorio registrar un motivo justificado para la anulación.",
        code: "MOTIVO_REQUERIDO",
      };
    }

    // 3. Buscar venta
    const venta = this.sales.get(input.ventaId);
    if (!venta) {
      return {
        success: false,
        error: `La venta con ID '${input.ventaId}' no existe.`,
        code: "VENTA_NO_ENCONTRADA",
      };
    }

    // 4. Verificar que no esté ya anulada
    if (venta.estado === "ANULADA") {
      return {
        success: false,
        error: `La venta ticket ${venta.numeroTicket} ya fue previamente anulada.`,
        code: "VENTA_YA_ANULADA",
      };
    }

    const varianteIds = venta.detalles.map((d) => d.varianteId);
    const releaseLock = await this.lockManager.acquire(varianteIds);

    try {
      const now = new Date();

      // 5. Restaurar stock atómicamente y registrar en Kardex
      for (const det of venta.detalles) {
        const variante = this.variants.get(det.varianteId);
        if (variante) {
          const stockAnterior = variante.stockActual;
          const stockNuevo = stockAnterior + det.cantidad;
          variante.stockActual = stockNuevo;

          // Registrar en Kardex
          const kardexList = this.kardex.get(variante.id) || [];
          kardexList.push({
            id: `kdx_anul_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            varianteId: variante.id,
            tipo: "ANULACION",
            cantidad: det.cantidad, // Positivo para reingreso
            stockAnterior,
            stockNuevo,
            motivo: `Anulación de venta Ticket ${venta.numeroTicket} - Motivo: ${input.motivo.trim()}`,
            usuarioId: input.solicitanteId,
            ventaId: venta.id,
            createdAt: now,
          });
          this.kardex.set(variante.id, kardexList);
        }
      }

      // 6. Actualizar estado de la venta
      venta.estado = "ANULADA";
      venta.anuladoPorId = input.solicitanteId;
      venta.motivoAnulacion = input.motivo.trim();
      venta.fechaAnulacion = now;
      venta.updatedAt = now;

      return {
        success: true,
        venta: { ...venta },
      };
    } catch (err) {
      return {
        success: false,
        error: "Error durante la anulación de la venta: " + (err instanceof Error ? err.message : "Desconocido"),
        code: "TRANSACCION_ERROR",
      };
    } finally {
      releaseLock();
    }
  }
}
