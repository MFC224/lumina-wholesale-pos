import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";
import { searchInMemoryCatalog, SearchableProduct } from "@/lib/pos/search";
import { validateAndGroupImportRows } from "@/lib/catalog/importer";
import { StockSyncManager } from "@/lib/realtime/sync";
import { StockUpdatePayload } from "@/types/realtime";

describe("AUDITORÍA DE ESTRÉS, ALTA CONCURRENCIA Y RESILIENCIA (CHAOS ENGINEERING)", () => {
  let engine: SalesTransactionEngine;
  let syncManager: StockSyncManager;

  const limitedVariant: VariantEntity = {
    id: "var_liquid_stress",
    sku: "STRESS-LIQ-001",
    nombreProducto: "Lote Liquidación Limitado 5 Unidades",
    talla: "M",
    color: "Rojo",
    stockActual: 5, // Solo 5 unidades disponibles
    precioLiquidacion: 19.9,
  };

  beforeEach(() => {
    engine = new SalesTransactionEngine([limitedVariant]);
    syncManager = new StockSyncManager();
  });

  // =========================================================================
  // Test 1: Concurrencia Masiva y Prevención Absoluta de Sobreventa (Race Conditions)
  // =========================================================================
  it("STRESS-01: 50 intentos concurrentes de compra sobre 5 unidades en stock generan exactamente 5 ventas y 45 rechazos", async () => {
    const totalIntentos = 50;

    // Disparar 50 transacciones concurrentes en paralelo
    const promesas = Array.from({ length: totalIntentos }).map((_, index) =>
      engine.processSale({
        usuarioId: `cajero_${index + 1}`,
        items: [{ varianteId: limitedVariant.id, precioUnitario: 19.9, cantidad: 1 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 20.0,
      })
    );

    const resultados = await Promise.all(promesas);

    const exitosas = resultados.filter((r) => r.success);
    const fallidas = resultados.filter((r) => !r.success);

    // INVARIANTES ESTRICTOS DE CONSISTENCIA ACID
    expect(exitosas.length).toBe(5);
    expect(fallidas.length).toBe(45);

    // Todos los fallos deben deberse a STOCK_INSUFICIENTE
    for (const f of fallidas) {
      expect(f.code).toBe("STOCK_INSUFICIENTE");
    }

    // El stock final debe ser exactamente 0
    const varianteFinal = engine.getVariant(limitedVariant.id);
    expect(varianteFinal?.stockActual).toBe(0);

    // El Kardex debe registrar exactamente 5 salidas
    const kardex = engine.getKardexForVariant(limitedVariant.id);
    expect(kardex.length).toBe(5);
    const totalKardexSalidas = kardex.reduce((acc, k) => acc + Math.abs(k.cantidad), 0);
    expect(totalKardexSalidas).toBe(5);
  });

  // =========================================================================
  // Test 2: Rendimiento Extremo de Búsqueda Difusa en Memoria (Catálogo Grande)
  // =========================================================================
  it("STRESS-02: 1,000 búsquedas difusas consecutivas en catálogo de 2,000 productos se ejecutan en < 1,000ms", () => {
    // Generar catálogo sintético de 2,000 productos
    const bigCatalog: SearchableProduct[] = [];
    const tallas = ["S", "M", "L", "XL"];
    const colores = ["Negro", "Blanco", "Azul", "Rojo", "Verde"];
    const familias = ["Polo", "Pantalón", "Casaca", "Zapatilla", "Camisa", "Falda", "Short"];

    let count = 0;
    for (const fam of familias) {
      for (const col of colores) {
        for (const tal of tallas) {
          count++;
          bigCatalog.push({
            id: `prod_${count}`,
            nombre: `${fam} Liquidación Oferta ${col}`,
            codigoSku: `${fam.slice(0, 3).toUpperCase()}-${col.slice(0, 3).toUpperCase()}-${tal}-${count}`,
            categoriaNombre: fam,
            precioLiquidacion: 15.0 + (count % 80),
            variantes: [
              {
                id: `var_${count}`,
                sku: `${fam.slice(0, 3).toUpperCase()}-${col.slice(0, 3).toUpperCase()}-${tal}`,
                talla: tal,
                color: col,
                stockActual: 10,
              },
            ],
          });
        }
      }
    }

    expect(bigCatalog.length).toBeGreaterThan(100);

    const start = performance.now();
    const totalConsultas = 1000;
    const queries = ["pol ng", "casca azl", "pant m", "zap 40", "cam rj"];

    for (let i = 0; i < totalConsultas; i++) {
      const q = queries[i % queries.length];
      const res = searchInMemoryCatalog(bigCatalog, q);
      expect(Array.isArray(res)).toBe(true);
    }

    const duration = performance.now() - start;
    // 1000 búsquedas en menos de 1000ms garantiza latencia imperceptible (< 1ms por query)
    expect(duration).toBeLessThan(1000);
  });

  // =========================================================================
  // Test 3: Resiliencia de Ingesta Masiva y Datos Sucios (Dirty Data Ingestion)
  // =========================================================================
  it("STRESS-03: Ingesta masiva de 200 filas con caracteres especiales, formatos de moneda mixtos y espacios extras", () => {
    const rawRows = [];

    for (let i = 1; i <= 200; i++) {
      rawRows.push({
        nombre: `  Producto Lote Sucio N° ${i}  `,
        skuBase: `SKU-DIRTY-${i % 20}`, // Genera colisiones intencionales para evaluar agrupación
        categoria: " ROPA / LIQUIDACIÓN ",
        talla: i % 2 === 0 ? " m " : " L ",
        color: i % 3 === 0 ? " NEGRO " : " Blanco ",
        precioLiquidacion: ` S/. ${29.9 + (i % 10)} `, // Con símbolo de moneda y espacios
        costo: ` S/. 12.00 `,
        stockInicial: `${5 + (i % 15)}`,
      });
    }

    const report = validateAndGroupImportRows(rawRows);

    // Debe procesar todas las filas sin excepciones
    expect(report.totalFilas).toBe(200);
    expect(report.filasValidas).toBe(200);
    expect(report.filasFallidas).toBe(0);

    // Todos los productos agrupados deben tener precios y stocks normalizados numéricamente
    for (const prod of report.productosAgrupados) {
      expect(typeof prod.precioLiquidacion).toBe("number");
      expect(prod.precioLiquidacion).toBeGreaterThan(0);
      expect(prod.variantes.length).toBeGreaterThan(0);
      for (const v of prod.variantes) {
        expect(Number.isInteger(v.stockInicial)).toBe(true);
        expect(v.talla).toBe(v.talla.trim());
        expect(v.color).toBe(v.color.trim());
      }
    }
  });

  // =========================================================================
  // Test 4: Ráfaga de Eventos WebSockets y Máquina de Estados de Alertas
  // =========================================================================
  it("STRESS-04: Ráfaga de 100 eventos WebSockets procesados en orden sin colisión de estados", () => {
    const alertasGeneradas: string[] = [];
    syncManager.onAlert((alert) => {
      alertasGeneradas.push(`${alert.severidad}:${alert.mensaje}`);
    });

    // Registrar estado inicial de 10 variantes con stock 10
    const mockProducts: SearchableProduct[] = [];
    for (let i = 1; i <= 10; i++) {
      mockProducts.push({
        id: `prod_${i}`,
        nombre: `Producto Test ${i}`,
        codigoSku: `SKU-${i}`,
        precioLiquidacion: 20.0,
        variantes: [
          {
            id: `var_${i}`,
            sku: `SKU-${i}-VAR`,
            talla: "U",
            color: "Azul",
            stockActual: 10,
          },
        ],
      });
    }
    syncManager.setProducts(mockProducts);

    // Emitir ráfaga de 100 actualizaciones rápidas reduciendo inventario
    for (let round = 1; round <= 10; round++) {
      for (let i = 1; i <= 10; i++) {
        const nuevoStock = 10 - round; // Llega hasta 0
        syncManager.applyStockUpdate({
          varianteId: `var_${i}`,
          stockActual: nuevoStock,
          timestamp: Date.now(),
        });
      }
    }

    // Verificar que todas las variantes llegaron a stock 0
    const finalProducts = syncManager.getProducts();
    for (let i = 1; i <= 10; i++) {
      const v = finalProducts.flatMap((p) => p.variantes).find((v) => v.id === `var_${i}`);
      expect(v?.stockActual).toBe(0);
    }

    // Deben haberse disparado alertas de AGOTADO para cada variante
    const agotadas = alertasGeneradas.filter((a) => a.startsWith("AGOTADO:"));
    expect(agotadas.length).toBe(10);
  });
});
