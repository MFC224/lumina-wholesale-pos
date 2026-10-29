import ExcelJS from "exceljs";
import { Role } from "@/types/auth";
import { canViewCosts } from "@/lib/auth/rbac";
import {
  RawImportRow,
  ValidatedImportItem,
  ImportProductGroup,
  ImportErrorDetail,
  ImportReport,
} from "@/types/catalog";
import { generateVariantSku, normalizeText } from "./variants";

/**
 * Normaliza las cabeceras de columnas para admitir variaciones en los archivos del usuario.
 */
function normalizeHeader(header: string): string {
  const clean = normalizeText(header).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.includes("nombre") || clean.includes("producto") || clean.includes("item")) return "nombre";
  if (clean.includes("categoria") || clean.includes("rubro")) return "categoria";
  if (clean.includes("skubase") || clean.includes("sku") || clean.includes("codigo")) return "skuBase";
  if (clean.includes("talla") || clean.includes("size")) return "talla";
  if (clean.includes("color")) return "color";
  if (clean.includes("ubicacion") || clean.includes("estante") || clean.includes("rack")) return "ubicacion";
  if (clean.includes("original") || clean.includes("lista") || clean.includes("referencial")) return "precioOriginal";
  if (clean.includes("liquidacion") || clean.includes("venta") || clean.includes("precio")) return "precioLiquidacion";
  if (clean.includes("costo") || clean.includes("cost")) return "costo";
  if (clean.includes("stock") || clean.includes("cantidad") || clean.includes("unidades")) return "stockInicial";
  return clean;
}

/**
 * Parsea texto en formato CSV o TSV tolerando comas, punto y coma y tabuladores.
 */
export function parseCsvText(csvText: string): RawImportRow[] {
  if (!csvText || typeof csvText !== "string") return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detectar delimitador (tab, punto y coma o coma)
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";

  const rawHeaders = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const rows: RawImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
    const rowObj: RawImportRow = {};

    normalizedHeaders.forEach((header, idx) => {
      if (header) {
        rowObj[header] = values[idx] !== undefined ? values[idx] : "";
      }
    });

    rows.push(rowObj);
  }

  return rows;
}

/**
 * Parsea un buffer de archivo Excel (.xlsx) usando ExcelJS.
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error ExcelJS buffer overload compatible with node Buffer
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: RawImportRow[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = (row.values as unknown[]) || [];
    // row.values en ExcelJS tiene índice 1-based (índice 0 es undefined)
    const stringValues = values.slice(1).map((val) => {
      if (val === null || val === undefined) return "";
      if (typeof val === "object" && "result" in (val as Record<string, unknown>)) {
        return String((val as { result: unknown }).result || "");
      }
      return String(val).trim();
    });

    if (rowNumber === 1) {
      headers = stringValues.map(normalizeHeader);
    } else {
      const rowObj: RawImportRow = {};
      headers.forEach((header, idx) => {
        if (header) {
          rowObj[header] = stringValues[idx] || "";
        }
      });
      rows.push(rowObj);
    }
  });

  return rows;
}

/**
 * Extrae un valor numérico limpio de cadenas que contienen símbolos de moneda como 'S/.', '$' o comas.
 */
export function cleanCurrencyNumber(val: string | number | unknown): number {
  if (typeof val === "number") return val;
  if (!val) return NaN;

  let cleaned = String(val)
    .replace(/S\/\.?/gi, "") // Eliminar "S/." o "S/"
    .replace(/[$€]/g, "")    // Eliminar símbolos de otras monedas
    .replace(/[a-zA-Z]/g, "") // Eliminar letras remanentes
    .replace(/\s+/g, "");    // Eliminar espacios

  // Manejo de comas y puntos (si viene 1,250.50 o 199,90)
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  }

  return parseFloat(cleaned);
}
export function validateAndGroupImportRows(rawRows: RawImportRow[]): ImportReport {
  const errores: ImportErrorDetail[] = [];
  const validItems: ValidatedImportItem[] = [];

  rawRows.forEach((row, index) => {
    const fila = index + 2; // Considerando fila 1 como encabezado

    // 1. Nombre obligatorio
    const nombre = String(row.nombre || "").trim();
    if (!nombre) {
      errores.push({
        fila,
        columna: "nombre",
        error: "El nombre del producto es obligatorio.",
        valorOriginal: row.nombre,
      });
      return;
    }

    // 2. Precios numéricos en Soles
    const precioLiqNum = cleanCurrencyNumber(row.precioLiquidacion);
    if (isNaN(precioLiqNum) || precioLiqNum <= 0) {
      errores.push({
        fila,
        columna: "precioLiquidacion",
        error: "El precio de liquidación debe ser un número positivo mayor a 0.",
        valorOriginal: row.precioLiquidacion,
      });
      return;
    }

    // Precio original (si falta, igual a precio liquidación)
    let precioOrigNum = cleanCurrencyNumber(row.precioOriginal);
    if (isNaN(precioOrigNum) || precioOrigNum <= 0) {
      precioOrigNum = precioLiqNum;
    }

    // Costo (si falta o es inválido, 0)
    let costoNum = cleanCurrencyNumber(row.costo);
    if (isNaN(costoNum) || costoNum < 0) {
      if (row.costo !== undefined && row.costo !== "") {
        errores.push({
          fila,
          columna: "costo",
          error: "El costo confidencial no puede ser un valor negativo.",
          valorOriginal: row.costo,
        });
        return;
      }
      costoNum = 0;
    }

    // Stock Inicial
    const rawStock = String(row.stockInicial || row.stock || "0").trim();
    const stockNum = parseInt(rawStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      errores.push({
        fila,
        columna: "stockInicial",
        error: "El stock inicial debe ser un número entero mayor o igual a 0.",
        valorOriginal: row.stockInicial,
      });
      return;
    }

    // SKU Base: si falta, se deriva del nombre
    let skuBase = String(row.skuBase || "").trim();
    if (!skuBase) {
      skuBase = normalizeText(nombre)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10);
      if (!skuBase) skuBase = "ITEM";
    }

    const talla = String(row.talla || "Única").trim() || "Única";
    const color = String(row.color || "Estándar").trim() || "Estándar";
    const categoria = String(row.categoria || "Liquidación General").trim() || "Liquidación General";
    const ubicacion = String(row.ubicacion || "Almacén Central").trim() || "Almacén Central";

    const skuVariante = generateVariantSku(skuBase, color, talla);

    validItems.push({
      nombre,
      categoria,
      skuBase,
      skuVariante,
      talla,
      color,
      ubicacion,
      precioOriginal: Math.round(precioOrigNum * 100) / 100,
      precioLiquidacion: Math.round(precioLiqNum * 100) / 100,
      costo: Math.round(costoNum * 100) / 100,
      stockInicial: stockNum,
      filaOriginal: fila,
    });
  });

  // Agrupar filas válidas en productos con matriz de variantes
  const groupMap = new Map<string, ImportProductGroup>();

  for (const item of validItems) {
    const groupKey = `${item.skuBase}__${normalizeText(item.nombre).toUpperCase()}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        nombre: item.nombre,
        categoria: item.categoria,
        codigoSku: item.skuBase,
        precioOriginal: item.precioOriginal,
        precioLiquidacion: item.precioLiquidacion,
        costo: item.costo,
        variantes: [],
      });
    }

    const group = groupMap.get(groupKey)!;

    // Evitar variantes con el mismo SKU duplicado dentro del mismo producto
    const exists = group.variantes.some((v) => v.sku === item.skuVariante);
    if (!exists) {
      group.variantes.push({
        sku: item.skuVariante,
        talla: item.talla,
        color: item.color,
        ubicacion: item.ubicacion,
        stockInicial: item.stockInicial,
        stockActual: item.stockInicial,
      });
    } else {
      // Si la variante ya existía en otra fila, acumula el stock inicial
      const existingVariant = group.variantes.find((v) => v.sku === item.skuVariante)!;
      existingVariant.stockInicial += item.stockInicial;
      existingVariant.stockActual += item.stockInicial;
    }
  }

  const productosAgrupados = Array.from(groupMap.values());

  return {
    totalFilas: rawRows.length,
    filasValidas: validItems.length,
    filasFallidas: errores.length,
    productosAgrupados,
    errores,
  };
}

/**
 * Sanitiza el reporte de importación según el rol del usuario (HU-05 y HU-07).
 * Si el usuario es VENDEDOR, se suprime el costo de los productos agrupados.
 */
export function sanitizeImportReportForRole(report: ImportReport, role: Role): ImportReport {
  if (canViewCosts(role)) {
    return report;
  }

  return {
    ...report,
    productosAgrupados: report.productosAgrupados.map((prod) => {
      const sanitized = { ...prod };
      delete (sanitized as Record<string, unknown>).costo;
      return sanitized as ImportProductGroup;
    }),
  };
}
