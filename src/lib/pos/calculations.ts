import { DiscountType, PaymentMethod } from "@/types/sales";

export interface CartItemCalculation {
  varianteId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CalculationOptions {
  descuentoValor?: number;
  tipoDescuento?: DiscountType;
  metodoPago?: PaymentMethod;
  montoRecibido?: number;
}

export interface FinancialCalculationResult {
  subtotal: number;
  descuentoMonto: number;
  descuentoPorcentajeEquivalente: number;
  tipoDescuento: DiscountType;
  total: number;
  metodoPago: PaymentMethod;
  montoRecibido: number;
  vuelto: number;
  esMontoSuficiente: boolean;
  totalArticulos: number;
}

/**
 * Redondea un número a 2 decimales para precisión contable en Soles peruanos (S/.).
 */
export function roundPEN(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula el subtotal, descuentos, total a pagar en Soles (S/.) y cálculo exacto de vuelto.
 */
export function calculateCartFinancials(
  items: CartItemCalculation[],
  options: CalculationOptions = {}
): FinancialCalculationResult {
  const totalArticulos = items.reduce((acc, item) => acc + Math.max(0, item.cantidad || 0), 0);

  // 1. Subtotal = Suma de (precioUnitario * cantidad)
  let subtotal = 0;
  for (const item of items) {
    const qty = Math.max(0, item.cantidad || 0);
    const unitPrice = Math.max(0, item.precioUnitario || 0);
    subtotal += roundPEN(qty * unitPrice);
  }
  subtotal = roundPEN(subtotal);

  // 2. Descuentos dinámicos
  const tipoDescuento = options.tipoDescuento || "NINGUNO";
  const rawDescuento = Math.max(0, options.descuentoValor || 0);
  let descuentoMonto = 0;
  let descuentoPorcentajeEquivalente = 0;

  if (tipoDescuento === "PORCENTAJE") {
    // Si el porcentaje supera 100%, se limita a 100%
    const pct = Math.min(100, rawDescuento);
    descuentoMonto = roundPEN(subtotal * (pct / 100));
    descuentoPorcentajeEquivalente = pct;
  } else if (tipoDescuento === "MONTO_FIJO") {
    // Si el monto fijo supera el subtotal, se limita al subtotal
    descuentoMonto = roundPEN(Math.min(subtotal, rawDescuento));
    descuentoPorcentajeEquivalente = subtotal > 0 ? roundPEN((descuentoMonto / subtotal) * 100) : 0;
  }

  // 3. Total a pagar (mínimo 0.00 Soles)
  const total = roundPEN(Math.max(0, subtotal - descuentoMonto));

  // 4. Pago y vuelto
  const metodoPago = options.metodoPago || "EFECTIVO";
  let montoRecibido = options.montoRecibido !== undefined ? roundPEN(options.montoRecibido) : total;

  // En pagos digitales, el monto recibido es siempre exactamente igual al total
  if (metodoPago !== "EFECTIVO") {
    montoRecibido = total;
  }

  const esMontoSuficiente = montoRecibido >= total;
  const vuelto = esMontoSuficiente && metodoPago === "EFECTIVO" ? roundPEN(montoRecibido - total) : 0;

  return {
    subtotal,
    descuentoMonto,
    descuentoPorcentajeEquivalente,
    tipoDescuento,
    total,
    metodoPago,
    montoRecibido,
    vuelto,
    esMontoSuficiente,
    totalArticulos,
  };
}

/**
 * Atajos de descuentos rápidos para liquidación en caja (5%, 10%, 15%, 20%).
 */
export const QUICK_DISCOUNTS = [
  { label: "0%", value: 0, type: "NINGUNO" as DiscountType },
  { label: "5%", value: 5, type: "PORCENTAJE" as DiscountType },
  { label: "10%", value: 10, type: "PORCENTAJE" as DiscountType },
  { label: "15%", value: 15, type: "PORCENTAJE" as DiscountType },
  { label: "20%", value: 20, type: "PORCENTAJE" as DiscountType },
] as const;

/**
 * Denominaciones de billetes peruanos en Soles para botones rápidos en caja.
 */
export const BILLETES_PERU = [10, 20, 50, 100, 200] as const;
