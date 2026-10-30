import { describe, it, expect } from "vitest";
import { getDateRangeBounds } from "@/lib/reports/date-ranges";

describe("Filtros de Rango de Fechas para Reportes (Sprint 3)", () => {
  it("debe calcular los límites para el preset 'HOY' iniciando a las 00:00:00 y finalizando a las 23:59:59", () => {
    const bounds = getDateRangeBounds("HOY");
    expect(bounds.preset).toBe("HOY");
    expect(bounds.label).toBe("Turno de Hoy");
    expect(bounds.startDate.getHours()).toBe(0);
    expect(bounds.startDate.getMinutes()).toBe(0);
    expect(bounds.endDate.getHours()).toBe(23);
    expect(bounds.endDate.getMinutes()).toBe(59);
  });

  it("debe calcular los límites para el preset 'AYER'", () => {
    const bounds = getDateRangeBounds("AYER");
    expect(bounds.preset).toBe("AYER");
    expect(bounds.label).toBe("Ayer");
    const now = new Date();
    const ayer = new Date(now);
    ayer.setDate(ayer.getDate() - 1);
    expect(bounds.startDate.getDate()).toBe(ayer.getDate());
  });

  it("debe calcular los límites para el preset '7_DIAS'", () => {
    const bounds = getDateRangeBounds("7_DIAS");
    expect(bounds.preset).toBe("7_DIAS");
    expect(bounds.label).toBe("Últimos 7 días");
    const diffDays = Math.round(
      (bounds.endDate.getTime() - bounds.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(7);
  });

  it("debe calcular los límites para el preset 'MES'", () => {
    const bounds = getDateRangeBounds("MES");
    expect(bounds.preset).toBe("MES");
    expect(bounds.startDate.getDate()).toBe(1);
  });

  it("debe procesar fechas personalizadas desde y hasta", () => {
    const bounds = getDateRangeBounds("TODO", "2026-10-01", "2026-10-15");
    expect(bounds.startDate.getFullYear()).toBe(2026);
    expect(bounds.startDate.getMonth()).toBe(9); // Octubre (0-indexed)
    expect(bounds.startDate.getDate()).toBe(1);
    expect(bounds.endDate.getDate()).toBe(15);
  });
});
