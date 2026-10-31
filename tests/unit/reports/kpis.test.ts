import { describe, it, expect } from "vitest";
import { obtenerMetricasLiquidacionDb } from "@/lib/reports/kpis";

describe("Módulo de Métricas y KPIs de Liquidación (Sprint 4)", () => {
  it("debe calcular correctamente el resumen de stock y tasa de liquidación", async () => {
    const kpis = await obtenerMetricasLiquidacionDb();

    expect(kpis).toBeDefined();
    expect(kpis.totalStockInicial).toBeGreaterThan(0);
    expect(kpis.totalStockActual).toBeGreaterThanOrEqual(0);
    expect(kpis.porcentajeLiquidadoGlobal).toBeGreaterThanOrEqual(0);
    expect(kpis.porcentajeLiquidadoGlobal).toBeLessThanOrEqual(100);
  });

  it("debe calcular el desglose de liquidación por categoría", async () => {
    const kpis = await obtenerMetricasLiquidacionDb();

    expect(Array.isArray(kpis.porCategoria)).toBe(true);
    expect(kpis.porCategoria.length).toBeGreaterThan(0);

    const primeraCat = kpis.porCategoria[0];
    expect(primeraCat).toHaveProperty("categoriaNombre");
    expect(primeraCat).toHaveProperty("stockInicial");
    expect(primeraCat).toHaveProperty("stockActual");
    expect(primeraCat).toHaveProperty("porcentajeLiquidado");
  });

  it("debe calcular los métodos de pago en Soles y ticket promedio", async () => {
    const kpis = await obtenerMetricasLiquidacionDb();

    expect(kpis.ventasPorMetodo).toBeDefined();
    expect(kpis.ventasPorMetodo).toHaveProperty("EFECTIVO");
    expect(kpis.ventasPorMetodo).toHaveProperty("YAPE");
    expect(kpis.ventasPorMetodo).toHaveProperty("PLIN");
    expect(kpis.ventasPorMetodo).toHaveProperty("TARJETA");

    if (kpis.totalTickets > 0) {
      expect(kpis.ticketPromedioPEN).toBeGreaterThan(0);
    } else {
      expect(kpis.ticketPromedioPEN).toBe(0);
    }
  });

  it("debe identificar productos de menor rotación con sugerencias de liquidación", async () => {
    const kpis = await obtenerMetricasLiquidacionDb();

    expect(Array.isArray(kpis.topLentaRotacion)).toBe(true);
    expect(kpis.topLentaRotacion.length).toBeLessThanOrEqual(5);

    if (kpis.topLentaRotacion.length > 0) {
      const slow = kpis.topLentaRotacion[0];
      expect(slow).toHaveProperty("nombre");
      expect(slow).toHaveProperty("stockActual");
      expect(slow).toHaveProperty("sugerenciaRemate");
    }
  });

  it("debe calcular el ranking de los 4 vendedores con total vendido y porcentaje", async () => {
    const kpis = await obtenerMetricasLiquidacionDb();

    expect(Array.isArray(kpis.rankingVendedores)).toBe(true);
    expect(kpis.rankingVendedores.length).toBeGreaterThanOrEqual(4);

    const leader = kpis.rankingVendedores[0];
    expect(leader).toHaveProperty("usuarioId");
    expect(leader).toHaveProperty("nombre");
    expect(leader).toHaveProperty("totalVendidoPEN");
    expect(leader).toHaveProperty("totalTickets");
    expect(leader).toHaveProperty("ticketPromedioPEN");
    expect(leader).toHaveProperty("porcentajeTotal");
    expect(leader.totalVendidoPEN).toBeGreaterThan(0);

    // Debe estar ordenado descendentemente por total vendido
    for (let i = 0; i < kpis.rankingVendedores.length - 1; i++) {
      expect(kpis.rankingVendedores[i].totalVendidoPEN).toBeGreaterThanOrEqual(
        kpis.rankingVendedores[i + 1].totalVendidoPEN
      );
    }
  });
});
