import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  validateAndGroupImportRows,
  sanitizeImportReportForRole,
} from "@/lib/catalog/importer";

describe("HU-07: Módulo de Importación Masiva (Excel / CSV)", () => {
  // Test 1: Parseo de CSV estándar delimitado por comas
  it("1. Debe parsear texto CSV con delimitador por comas y mapear columnas automáticamente", () => {
    const csv = `nombre,skuBase,talla,color,precioLiquidacion,stockInicial
Polo Oversize,POLO-01,M,Negro,29.90,20
Polo Oversize,POLO-01,L,Negro,29.90,30`;

    const parsed = parseCsvText(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].nombre).toBe("Polo Oversize");
    expect(parsed[0].skuBase).toBe("POLO-01");
    expect(parsed[0].talla).toBe("M");
    expect(parsed[0].color).toBe("Negro");
  });

  // Test 2: Soporte para punto y coma (formato típico de Excel en español/Perú)
  it("2. Debe detectar y parsear CSV delimitado por punto y coma (;)", () => {
    const csvSemicolon = `Producto;SKU;Precio;Stock;Talla;Color
Casaca Impermeable;CAS-IMP;89.90;15;L;Azul
Casaca Impermeable;CAS-IMP;89.90;10;XL;Azul`;

    const parsed = parseCsvText(csvSemicolon);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].nombre).toBe("Casaca Impermeable");
    expect(parsed[0].skuBase).toBe("CAS-IMP");
  });

  // Test 3: Agrupación inteligente de variantes bajo un único producto padre
  it("3. Debe agrupar múltiples filas con el mismo SKU base en un solo producto con matriz de variantes", () => {
    const rawRows = [
      { nombre: "Polo Urbano", skuBase: "POLO-URB", talla: "S", color: "Rojo", precioLiquidacion: 25, stockInicial: 10 },
      { nombre: "Polo Urbano", skuBase: "POLO-URB", talla: "M", color: "Rojo", precioLiquidacion: 25, stockInicial: 15 },
      { nombre: "Polo Urbano", skuBase: "POLO-URB", talla: "L", color: "Azul", precioLiquidacion: 25, stockInicial: 20 },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(3);
    expect(report.filasFallidas).toBe(0);
    expect(report.productosAgrupados).toHaveLength(1);

    const producto = report.productosAgrupados[0];
    expect(producto.nombre).toBe("Polo Urbano");
    expect(producto.codigoSku).toBe("POLO-URB");
    expect(producto.variantes).toHaveLength(3);
    expect(producto.variantes[0].sku).toBe("POLO-URB-ROJO-S");
    expect(producto.variantes[1].sku).toBe("POLO-URB-ROJO-M");
    expect(producto.variantes[2].sku).toBe("POLO-URB-AZUL-L");
  });

  // Test 4: Rechazo de fila con nombre de producto vacío
  it("4. Debe rechazar filas sin nombre de producto y registrar el error con el número de fila", () => {
    const rawRows = [
      { nombre: "", skuBase: "ITEM-01", precioLiquidacion: 50, stockInicial: 5 },
      { nombre: "   ", skuBase: "ITEM-02", precioLiquidacion: 50, stockInicial: 5 },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(0);
    expect(report.filasFallidas).toBe(2);
    expect(report.errores[0].fila).toBe(2);
    expect(report.errores[0].columna).toBe("nombre");
  });

  // Test 5: Rechazo de fila con precio de liquidación inválido o menor a cero
  it("5. Debe rechazar filas con precio de liquidación no numérico o menor a cero", () => {
    const rawRows = [
      { nombre: "Taladro Percutor", skuBase: "TAL-01", precioLiquidacion: "-15.00", stockInicial: 10 },
      { nombre: "Lijadora Orbital", skuBase: "LIJ-01", precioLiquidacion: "GRATIS", stockInicial: 5 },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(0);
    expect(report.filasFallidas).toBe(2);
    expect(report.errores[0].columna).toBe("precioLiquidacion");
    expect(report.errores[1].columna).toBe("precioLiquidacion");
  });

  // Test 6: Rechazo de fila con stock negativo
  it("6. Debe rechazar filas con stock inicial negativo", () => {
    const rawRows = [
      { nombre: "Destornillador", skuBase: "DES-01", precioLiquidacion: 10, stockInicial: -3 },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(0);
    expect(report.filasFallidas).toBe(1);
    expect(report.errores[0].columna).toBe("stockInicial");
  });

  // Test 7: Manejo tolerante de símbolos de moneda (S/., $) en precios
  it("7. Debe limpiar y extraer montos numéricos válidos cuando vienen con 'S/.' o espacios", () => {
    const rawRows = [
      {
        nombre: "Zapatilla Deportiva",
        skuBase: "ZAP-01",
        precioOriginal: "S/. 199.90",
        precioLiquidacion: "S/. 79.90",
        costo: "S/. 35.00",
        stockInicial: 12,
      },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(1);
    const prod = report.productosAgrupados[0];
    expect(prod.precioOriginal).toBe(199.9);
    expect(prod.precioLiquidacion).toBe(79.9);
    expect(prod.costo).toBe(35.0);
  });

  // Test 8: Valores predeterminados cuando faltan talla, color o categoría
  it("8. Debe asignar valores por defecto coherentes (Única, Estándar) para productos sin variantes", () => {
    const rawRows = [
      {
        nombre: "Juego de Llaves Allen",
        skuBase: "ALL-01",
        precioLiquidacion: 19.5,
        stockInicial: 8,
      },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.filasValidas).toBe(1);
    const prod = report.productosAgrupados[0];
    expect(prod.categoria).toBe("Liquidación General");
    expect(prod.variantes[0].talla).toBe("Única");
    expect(prod.variantes[0].color).toBe("Estándar");
    expect(prod.variantes[0].ubicacion).toBe("Almacén Central");
    expect(prod.variantes[0].sku).toBe("ALL-01-STD");
  });

  // Test 9: Generación estructurada del reporte de importación con métricas
  it("9. Debe generar métricas claras de totalFilas, válidas y fallidas en el reporte", () => {
    const rawRows = [
      { nombre: "Item Valido 1", precioLiquidacion: 10, stockInicial: 5 },
      { nombre: "", precioLiquidacion: 10, stockInicial: 5 }, // Fallido: sin nombre
      { nombre: "Item Valido 2", precioLiquidacion: 20, stockInicial: 2 },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.totalFilas).toBe(3);
    expect(report.filasValidas).toBe(2);
    expect(report.filasFallidas).toBe(1);
    expect(report.errores).toHaveLength(1);
  });

  // Test 10: Cumplimiento de RBAC: ocultamiento de costos confidenciales en el reporte para Vendedor (HU-05)
  it("10. [HU-05] Debe eliminar el costo de los productos importados cuando el usuario es VENDEDOR", () => {
    const rawRows = [
      {
        nombre: "Chompa de Alpaca",
        skuBase: "CHOMP-01",
        precioLiquidacion: 95.0,
        costo: 40.0, // Confidencial
        stockInicial: 10,
      },
    ];

    const report = validateAndGroupImportRows(rawRows);
    expect(report.productosAgrupados[0].costo).toBe(40.0);

    // Sanitizar para Vendedor
    const reporteVendedor = sanitizeImportReportForRole(report, "VENDEDOR");
    expect(reporteVendedor.productosAgrupados[0]).not.toHaveProperty("costo");
    expect((reporteVendedor.productosAgrupados[0] as unknown as Record<string, unknown>).costo).toBeUndefined();

    // Sanitizar para Admin
    const reporteAdmin = sanitizeImportReportForRole(report, "ADMIN");
    expect(reporteAdmin.productosAgrupados[0].costo).toBe(40.0);
  });
});
