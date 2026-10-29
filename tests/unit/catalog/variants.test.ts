import { describe, it, expect } from "vitest";
import {
  generateVariantSku,
  determineStockStatus,
  calculateLiquidationPercentage,
  calculateProductTotalStock,
  calculateProductMetrics,
  normalizeText,
} from "@/lib/catalog/variants";

describe("HU-06: Matriz de Variantes y Lógica de Catálogo de Liquidación", () => {
  // Test 1: Generación de SKU para prendas de vestir con tallas y colores
  it("1. Debe generar SKU normalizado para variantes de ropa (SKU_BASE-COLOR-TALLA)", () => {
    const sku = generateVariantSku("POLO-HVY", "Negro", "M");
    expect(sku).toBe("POLO-HVY-NEGRO-M");

    const skuL = generateVariantSku("POLO-HVY", "Blanco", "XL");
    expect(skuL).toBe("POLO-HVY-BLANCO-XL");
  });

  // Test 2: Generación de SKU para productos unitarios (herramientas/sin talla ni color)
  it("2. Debe generar sufijo '-STD' para productos unitarios sin variante de talla ni color", () => {
    const skuHerramienta = generateVariantSku("TAL-650", null, null);
    expect(skuHerramienta).toBe("TAL-650-STD");

    const skuConUnica = generateVariantSku("TAL-650", "Estándar", "Única");
    expect(skuConUnica).toBe("TAL-650-STD");
  });

  // Test 3: Normalización de tildes y caracteres especiales en SKUs
  it("3. Debe eliminar tildes y símbolos extraños al construir los SKUs", () => {
    const sku = generateVariantSku("CAS-TÉRM", "Azúl Eléctrico", "S");
    expect(sku).toBe("CAS-TERM-AZULELECTRICO-S");
  });

  // Test 4: Cálculo del stock total agregado sumando variantes
  it("4. Debe calcular la suma total de stock disponible en todas las variantes", () => {
    const variantes = [
      { stockActual: 10 },
      { stockActual: 15 },
      { stockActual: 0 },
      { stockActual: 5 },
    ];
    const total = calculateProductTotalStock(variantes);
    expect(total).toBe(30);
  });

  // Test 5: Estado de stock NORMAL (mayor a 5 unidades)
  it("5. Debe clasificar como 'NORMAL' cuando el stock disponible es superior a 5 unidades", () => {
    expect(determineStockStatus(6)).toBe("NORMAL");
    expect(determineStockStatus(25)).toBe("NORMAL");
  });

  // Test 6: Estado de stock BAJO (entre 4 y 5 unidades)
  it("6. Debe clasificar como 'BAJO' cuando el stock está entre 4 y 5 unidades", () => {
    expect(determineStockStatus(4)).toBe("BAJO");
    expect(determineStockStatus(5)).toBe("BAJO");
  });

  // Test 7: Estado de stock CRITICO (1 a 3 unidades con alerta de pulso)
  it("7. Debe clasificar como 'CRITICO' cuando quedan de 1 a 3 unidades para activar alerta", () => {
    expect(determineStockStatus(1)).toBe("CRITICO");
    expect(determineStockStatus(2)).toBe("CRITICO");
    expect(determineStockStatus(3)).toBe("CRITICO");
  });

  // Test 8: Estado de stock AGOTADO (0 o negativo)
  it("8. Debe clasificar como 'AGOTADO' cuando el stock es 0 o menor", () => {
    expect(determineStockStatus(0)).toBe("AGOTADO");
    expect(determineStockStatus(-2)).toBe("AGOTADO");
  });

  // Test 9: Cálculo de velocidad de desplome (% Liquidado)
  it("9. Debe calcular el porcentaje de liquidación con exactitud matemática", () => {
    // 50 inicial, 25 actual = 50% liquidado
    expect(calculateLiquidationPercentage(50, 25)).toBe(50);

    // 100 inicial, 10 actual = 90% liquidado
    expect(calculateLiquidationPercentage(100, 10)).toBe(90);

    // Nada vendido (100 inicial, 100 actual) = 0%
    expect(calculateLiquidationPercentage(100, 100)).toBe(0);

    // Totalmente liquidado (50 inicial, 0 actual) = 100%
    expect(calculateLiquidationPercentage(50, 0)).toBe(100);

    // Manejo de división por cero
    expect(calculateLiquidationPercentage(0, 0)).toBe(0);
  });

  // Test 10: Métricas globales consolidadas del producto
  it("10. Debe consolidar métricas globales del producto e indicar si tiene variantes en estado crítico", () => {
    const variantes = [
      { stockInicial: 30, stockActual: 15 }, // Normal
      { stockInicial: 20, stockActual: 2 },  // Crítico (<=3)
      { stockInicial: 10, stockActual: 0 },  // Agotado
    ];

    const metricas = calculateProductMetrics(variantes);

    expect(metricas.totalStockInicial).toBe(60);
    expect(metricas.totalStockActual).toBe(17);
    expect(metricas.unidadesLiquidadas).toBe(43);
    // (43 / 60) * 100 = 71.67%
    expect(metricas.porcentajeLiquidado).toBe(71.67);
    expect(metricas.estadoStockGlobal).toBe("NORMAL");
    expect(metricas.tieneAlertaCritica).toBe(true);
  });
});
