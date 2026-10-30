import { describe, it, expect } from "vitest";
import { generarKardexExcelBuffer } from "@/lib/reports/kardex-excel";
import ExcelJS from "exceljs";

describe("Módulo de Exportación de Kardex a Excel (Sprint 5)", () => {
  it("debe generar un buffer binario válido de archivo Excel .xlsx", async () => {
    const buffer = await generarKardexExcelBuffer();

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("debe contener la hoja de cálculo 'Kardex Inmutable' con encabezados correctos", async () => {
    const buffer = await generarKardexExcelBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet("Kardex Inmutable");
    expect(worksheet).toBeDefined();

    // Validar título institucional
    const title = worksheet?.getCell("A1").value;
    expect(title).toContain("LUMINA WHOLESALE & LIQUIDATION");

    // Validar fila de encabezados
    const headerRow = worksheet?.getRow(4);
    const headerValues = headerRow?.values as string[];
    expect(headerValues).toContain("ID Movimiento");
    expect(headerValues).toContain("Código SKU");
    expect(headerValues).toContain("Tipo de Movimiento");
    expect(headerValues).toContain("Motivo de Auditoría");
  });
});
