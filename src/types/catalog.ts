import { Role } from "./auth";

export type StockStatus = "NORMAL" | "BAJO" | "CRITICO" | "AGOTADO";

export interface VariantData {
  id?: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  ubicacion?: string | null;
  stockInicial: number;
  stockActual: number;
  stockMinimoAlerta?: number;
}

export interface ProductData {
  id?: string;
  nombre: string;
  descripcion?: string | null;
  codigoSku?: string | null;
  categoriaId?: string | null;
  categoriaNombre?: string | null;
  precioOriginal: number;
  precioLiquidacion: number; // S/.
  costo?: number;            // S/. (Confidencial Admin)
  imagenUrl?: string | null;
  activo?: boolean;
  variantes: VariantData[];
}

export interface ProductMetrics {
  totalStockInicial: number;
  totalStockActual: number;
  unidadesLiquidadas: number;
  porcentajeLiquidado: number;
  estadoStockGlobal: StockStatus;
  tieneAlertaCritica: boolean;
}

export interface RawImportRow {
  nombre?: string;
  producto?: string;
  categoria?: string;
  skuBase?: string;
  sku?: string;
  talla?: string;
  color?: string;
  ubicacion?: string;
  precioOriginal?: string | number;
  precioLiquidacion?: string | number;
  precio?: string | number;
  costo?: string | number;
  stockInicial?: string | number;
  stock?: string | number;
  [key: string]: unknown;
}

export interface ValidatedImportItem {
  nombre: string;
  categoria: string;
  skuBase: string;
  skuVariante: string;
  talla: string;
  color: string;
  ubicacion: string;
  precioOriginal: number;
  precioLiquidacion: number;
  costo: number;
  stockInicial: number;
  filaOriginal: number;
}

export interface ImportProductGroup {
  nombre: string;
  categoria: string;
  codigoSku: string;
  precioOriginal: number;
  precioLiquidacion: number;
  costo?: number;
  variantes: {
    sku: string;
    talla: string;
    color: string;
    ubicacion: string;
    stockInicial: number;
    stockActual: number;
  }[];
}

export interface ImportErrorDetail {
  fila: number;
  columna?: string;
  error: string;
  valorOriginal?: unknown;
}

export interface ImportReport {
  totalFilas: number;
  filasValidas: number;
  filasFallidas: number;
  productosAgrupados: ImportProductGroup[];
  errores: ImportErrorDetail[];
}
