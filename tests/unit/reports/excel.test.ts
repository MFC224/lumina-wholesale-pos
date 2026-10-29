import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateExecutiveExcelReport } from "@/lib/reports/excel";
import { ExecutiveReportData } from "@/types/reports";

describe("HU-09: Motor de Generación de Reportes Contables en Excel (.xlsx con exceljs)", () => {
  const mockReportData: ExecutiveReportData = {
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-29",
    solicitanteRol: "ADMIN",
    solicitanteNombre: "Administrador General",
    kpis: {
      totalRecaudado: 4500.5,
      totalArticulosVendidos: 120,
      totalTicketsCompletados: 45,
      totalTicketsAnulados: 2,
    },
    metodosPago: [
      { metodo: "EFECTIVO", cantidadTickets: 25, totalRecaudado: 2500.5 },
      { metodo: "YAPE", cantidadTickets: 12, totalRecaudado: 1200.0 },
      { metodo: "PLIN", cantidadTickets: 5, totalRecaudado: 500.0 },
      { metodo: "TARJETA", cantidadTickets: 3, totalRecaudado: 300.0 },
    ],
    inventario: [
      {
        producto: "Polo Oversize Urbano",
        sku: "POLO-URB-NG-M",
        talla: "M",
        color: "Negro",
        ubicacion: "Rack A-1",
        stockInicial: 50,
        stockActual: 10,
        unidadesLiquidadas: 40,
        porcentajeLiquidado: 80,
        precioLiquidacion: 29.9,
        costo: 14.5, // Confidencial
      },
    ],
    tickets: [
      {
        numeroTicket: "TICK-20261029-0001",
        fecha: "2026-10-29",
        hora: "10:30",
        cajero: "Caja 1",
        metodoPago: "EFECTIVO",
        estado: "COMPLETADA",
        subtotal: 59.8,
        descuento: 0,
        total: 59.8,
      },
    ],
  };

  // Test 1: Generación de buffer binario válido
  it("1. Debe generar un buffer binario de Excel (.xlsx) válido y no vacío", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  // Test 2: Creación de las 3 hojas requeridas por la especificación
  it("2. Debe estructurar el libro con exactamente 3 hojas contables", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets).toHaveLength(3);
    const sheetNames = workbook.worksheets.map((w) => w.name);
    expect(sheetNames).toContain("Resumen Ejecutivo");
    expect(sheetNames).toContain("Inventario y Liquidación");
    expect(sheetNames).toContain("Detalle de Tickets");
  });

  // Test 3: Fórmulas dinámicas nativas =SUM(...) en Resumen Ejecutivo
  it("3. Debe incluir fórmulas dinámicas =SUM(...) en la fila de totales de Métodos de Pago", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Resumen Ejecutivo")!;
    // La fila de total está después de los 4 métodos de pago (filas 10 a 13, total en fila 14)
    const totalRow = sheet.getRow(14);
    const formulaCell = totalRow.getCell(4); // Columna D: Total Recaudado

    expect(typeof formulaCell.value).toBe("object");
    expect((formulaCell.value as { formula: string }).formula).toContain("SUM(D10:D13)");
  });

  // Test 4: Fórmulas dinámicas nativas =SUM(...) en Detalle de Tickets
  it("4. Debe incluir fórmulas dinámicas =SUM(...) en la fila de totales de Detalle de Tickets", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Detalle de Tickets")!;
    const totalRow = sheet.getRow(3); // 1 ítem en fila 2, total en fila 3
    const formulaCell = totalRow.getCell(9); // Columna I: Total Venta

    expect(typeof formulaCell.value).toBe("object");
    expect((formulaCell.value as { formula: string }).formula).toContain("SUM(I2:I2)");
  });

  // Test 5: Fórmulas dinámicas en Inventario y Liquidación
  it("5. Debe incluir fórmulas dinámicas en la fila de totales de Inventario", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Inventario y Liquidación")!;
    const totalRow = sheet.getRow(3);
    const stockInicialFormula = totalRow.getCell(6);

    expect(typeof stockInicialFormula.value).toBe("object");
    expect((stockInicialFormula.value as { formula: string }).formula).toContain("SUM(F2:F2)");
  });

  // Test 6: Formato numérico contable en Soles ("S/." #,##0.00)
  it("6. Debe aplicar formato contable en Soles a las columnas de montos", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheetResumen = workbook.getWorksheet("Resumen Ejecutivo")!;
    const montoCell = sheetResumen.getCell("D10");
    expect(montoCell.numFmt).toContain("S/.");
  });

  // Test 7: Formato de porcentaje (0.00%) en columna de % Liquidado
  it("7. Debe aplicar formato de porcentaje en la hoja de Inventario", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheetInv = workbook.getWorksheet("Inventario y Liquidación")!;
    const pctCell = sheetInv.getCell("I2");
    expect(pctCell.numFmt).toContain("%");
  });

  // Test 8: Desglose de todos los métodos de pago registrados
  it("8. Debe incluir filas para cada método de pago informado", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Resumen Ejecutivo")!;
    expect(sheet.getCell("B10").value).toBe("EFECTIVO");
    expect(sheet.getCell("B11").value).toBe("YAPE");
    expect(sheet.getCell("B12").value).toBe("PLIN");
    expect(sheet.getCell("B13").value).toBe("TARJETA");
  });

  // Test 9: Ocultamiento confidencial de costos si el solicitante es VENDEDOR (HU-05)
  it("9. [HU-05] Debe excluir la columna de costos confidenciales cuando el solicitante es VENDEDOR", async () => {
    const vendedorData: ExecutiveReportData = {
      ...mockReportData,
      solicitanteRol: "VENDEDOR",
      solicitanteNombre: "Cajero 1",
    };

    const buffer = await generateExecutiveExcelReport(vendedorData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheetInv = workbook.getWorksheet("Inventario y Liquidación")!;
    const headerRow = sheetInv.getRow(1);
    const headerValues = headerRow.values as string[];

    // No debe existir ninguna columna de costo
    const hasCostColumn = headerValues.some((h) => typeof h === "string" && h.toLowerCase().includes("costo"));
    expect(hasCostColumn).toBe(false);
  });

  // Test 10: Preservación de columna de costo cuando el solicitante es ADMIN (HU-05)
  it("10. [HU-05] Debe incluir la columna de costos confidenciales cuando el solicitante es ADMIN", async () => {
    const buffer = await generateExecutiveExcelReport(mockReportData);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error buffer overload
    await workbook.xlsx.load(buffer);

    const sheetInv = workbook.getWorksheet("Inventario y Liquidación")!;
    const headerRow = sheetInv.getRow(1);
    const headerValues = headerRow.values as string[];

    const hasCostColumn = headerValues.some((h) => typeof h === "string" && h.toLowerCase().includes("costo"));
    expect(hasCostColumn).toBe(true);
  });
});
