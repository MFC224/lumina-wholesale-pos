import { StockStatus, ProductMetrics } from "@/types/catalog";

/**
 * Normaliza una cadena de texto eliminando tildes y caracteres especiales.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Determina el estado del stock según las reglas de negocio de liquidación:
 * - stockActual <= 0: AGOTADO (Bloqueo de venta)
 * - 1 <= stockActual <= 3: CRITICO (Alerta visual con pulso rojo)
 * - 4 <= stockActual <= 5: BAJO (Advertencia de reposición)
 * - stockActual > 5: NORMAL (En stock)
 */
export function determineStockStatus(stockActual: number): StockStatus {
  if (stockActual <= 0) return "AGOTADO";
  if (stockActual <= 3) return "CRITICO";
  if (stockActual <= 5) return "BAJO";
  return "NORMAL";
}

/**
 * Calcula la velocidad de desplome (% liquidado):
 * % Liquidado = ((Stock Inicial - Stock Actual) / Stock Inicial) * 100
 * Retorna un valor entre 0 y 100 con 2 decimales de precisión.
 */
export function calculateLiquidationPercentage(stockInicial: number, stockActual: number): number {
  if (stockInicial <= 0) return 0;
  if (stockActual >= stockInicial) return 0;
  if (stockActual <= 0) return 100;

  const liquidadas = stockInicial - stockActual;
  const porcentaje = (liquidadas / stockInicial) * 100;
  return Math.round(porcentaje * 100) / 100;
}

/**
 * Genera un SKU normalizado y consistente para una variante.
 * - Si es ropa: [SKU_BASE]-[COLOR]-[TALLA] (ej. POLO-HVY-NEGRO-M)
 * - Si es unitario o herramienta: [SKU_BASE]-STD
 */
export function generateVariantSku(
  baseSku: string,
  color?: string | null,
  talla?: string | null
): string {
  const cleanBase = normalizeText(baseSku).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const cleanColor = normalizeText(color || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const cleanTalla = normalizeText(talla || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");

  const parts = [cleanBase || "ITEM"];

  const hasColor = cleanColor && cleanColor !== "UNICO" && cleanColor !== "ESTANDAR";
  const hasTalla = cleanTalla && cleanTalla !== "UNICA" && cleanTalla !== "ESTANDAR";

  if (hasColor) parts.push(cleanColor);
  if (hasTalla) parts.push(cleanTalla);

  if (!hasColor && !hasTalla) {
    parts.push("STD");
  }

  return parts.join("-");
}

/**
 * Calcula el stock total agregado de un producto a partir de sus variantes.
 */
export function calculateProductTotalStock(variantes: { stockActual: number }[]): number {
  if (!Array.isArray(variantes) || variantes.length === 0) return 0;
  return variantes.reduce((total, v) => total + Math.max(0, v.stockActual || 0), 0);
}

/**
 * Calcula las métricas globales de liquidación de un producto.
 */
export function calculateProductMetrics(
  variantes: { stockInicial: number; stockActual: number }[]
): ProductMetrics {
  if (!Array.isArray(variantes) || variantes.length === 0) {
    return {
      totalStockInicial: 0,
      totalStockActual: 0,
      unidadesLiquidadas: 0,
      porcentajeLiquidado: 0,
      estadoStockGlobal: "AGOTADO",
      tieneAlertaCritica: false,
    };
  }

  let totalStockInicial = 0;
  let totalStockActual = 0;
  let tieneAlertaCritica = false;

  for (const v of variantes) {
    const inicial = Math.max(0, v.stockInicial || 0);
    const actual = Math.max(0, v.stockActual || 0);

    totalStockInicial += inicial;
    totalStockActual += actual;

    if (actual >= 1 && actual <= 3) {
      tieneAlertaCritica = true;
    }
  }

  const unidadesLiquidadas = Math.max(0, totalStockInicial - totalStockActual);
  const porcentajeLiquidado = calculateLiquidationPercentage(totalStockInicial, totalStockActual);
  const estadoStockGlobal = determineStockStatus(totalStockActual);

  return {
    totalStockInicial,
    totalStockActual,
    unidadesLiquidadas,
    porcentajeLiquidado,
    estadoStockGlobal,
    tieneAlertaCritica,
  };
}
