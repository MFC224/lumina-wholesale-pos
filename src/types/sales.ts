import { Role } from "./auth";

export type PaymentMethod = "EFECTIVO" | "YAPE" | "PLIN" | "TARJETA" | "TRANSFERENCIA";
export type DiscountType = "NINGUNO" | "PORCENTAJE" | "MONTO_FIJO";
export type SaleStatus = "COMPLETADA" | "ANULADA";
export type KardexMovementType = "VENTA" | "INGRESO" | "AJUSTE" | "ANULACION";

export interface SaleItemInput {
  varianteId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CreateSaleInput {
  usuarioId: string;
  items: SaleItemInput[];
  metodoPago: PaymentMethod;
  descuento?: number;
  tipoDescuento?: DiscountType;
  montoRecibido?: number;
  sesionCajaId?: string;
}

export interface SaleItemDetail {
  id: string;
  ventaId: string;
  varianteId: string;
  sku: string;
  nombreProducto: string;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  numeroTicket: string;
  usuarioId: string;
  nombreCajero?: string;
  subtotal: number;
  descuento: number;
  tipoDescuento: DiscountType;
  total: number;
  metodoPago: PaymentMethod;
  montoRecibido: number;
  vuelto: number;
  estado: SaleStatus;
  anuladoPorId?: string | null;
  motivoAnulacion?: string | null;
  fechaAnulacion?: Date | string | null;
  sesionCajaId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  detalles: SaleItemDetail[];
}

export interface KardexRecord {
  id: string;
  varianteId: string;
  tipo: KardexMovementType;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string | null;
  usuarioId: string;
  ventaId?: string | null;
  createdAt: Date;
}

export interface ProcessSaleResult {
  success: boolean;
  venta?: SaleRecord;
  error?: string;
  code?:
    | "STOCK_INSUFICIENTE"
    | "VARIANTE_NO_ENCONTRADA"
    | "CANTIDAD_INVALIDA"
    | "MONTO_INSUFICIENTE"
    | "CARRITO_VACIO"
    | "TRANSACCION_ERROR";
  stockFaltante?: {
    varianteId: string;
    stockDisponible: number;
    cantidadSolicitada: number;
  }[];
}

export interface VoidSaleInput {
  ventaId: string;
  solicitanteId: string;
  rolSolicitante: Role;
  motivo: string;
}

export interface VoidSaleResult {
  success: boolean;
  venta?: SaleRecord;
  error?: string;
  code?:
    | "VENTA_NO_ENCONTRADA"
    | "VENTA_YA_ANULADA"
    | "FORBIDDEN_ROLE"
    | "MOTIVO_REQUERIDO"
    | "TRANSACCION_ERROR";
}
