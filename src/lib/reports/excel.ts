import ExcelJS from "exceljs";
import { ExecutiveReportData } from "@/types/reports";
import { canViewCosts } from "@/lib/auth/rbac";

/**
 * Estilos y colores corporativos Lumina Wholesale & Liquidation
 */
const NAVY_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF081C6C" }, // #081C6C Navy institucional
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Inter",
  size: 11,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

const SOLES_NUM_FMT = '"S/." #,##0.00';
const PERCENT_NUM_FMT = '0.00"%"';

/**
 * Genera el libro contable de reportes ejecutivos en formato Excel (.xlsx).
 */
export async function generateExecutiveExcelReport(data: ExecutiveReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Import L&R POS";
  workbook.created = new Date();

  const isCostVisible = canViewCosts(data.solicitanteRol);

  // =========================================================================
  // HOJA 1: RESUMEN EJECUTIVO
  // =========================================================================
  const sheetResumen = workbook.addWorksheet("Resumen Ejecutivo", {
    views: [{ showGridLines: true }],
  });

  // Título
  sheetResumen.mergeCells("B2:E2");
  const titleCell = sheetResumen.getCell("B2");
  titleCell.value = "IMPORT L&R - RESUMEN EJECUTIVO";
  titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: "FF081C6C" } };

  sheetResumen.getCell("B3").value = `Período: ${new Date(data.fechaInicio).toLocaleDateString()} al ${new Date(data.fechaFin).toLocaleDateString()} | Generado por: ${data.solicitanteNombre} (${data.solicitanteRol})`;
  sheetResumen.getCell("B3").font = { name: "Inter", size: 9, italic: true, color: { argb: "FF64748B" } };

  // Bloque de KPIs
  const kpiLabels = [
    ["B5", "Total Recaudado en Soles", data.kpis.totalRecaudado, SOLES_NUM_FMT],
    ["C5", "Artículos Liquidados", data.kpis.totalArticulosVendidos, "#,##0"],
    ["D5", "Tickets Completados", data.kpis.totalTicketsCompletados, "#,##0"],
    ["E5", "Tickets Anulados", data.kpis.totalTicketsAnulados, "#,##0"],
  ] as const;

  kpiLabels.forEach(([cellRef, label, value, numFmt]) => {
    const col = cellRef[0];
    const headerCell = sheetResumen.getCell(`${col}5`);
    headerCell.value = label;
    headerCell.font = { name: "Inter", size: 9, bold: true, color: { argb: "FF475569" } };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    headerCell.border = BORDER_THIN;

    const valCell = sheetResumen.getCell(`${col}6`);
    valCell.value = value;
    valCell.font = { name: "Inter", size: 12, bold: true, color: { argb: "FF081C6C" } };
    valCell.numFmt = numFmt;
    valCell.border = BORDER_THIN;
  });

  // Tabla Desglose por Método de Pago
  sheetResumen.getCell("B8").value = "Desglose de Recaudación por Método de Pago";
  sheetResumen.getCell("B8").font = { name: "Inter", size: 11, bold: true, color: { argb: "FF0F172A" } };

  const paymentHeaders = ["Método de Pago", "Cantidad de Tickets", "Total Recaudado (S/.)"];
  const paymentHeaderRow = sheetResumen.getRow(9);
  paymentHeaderRow.values = ["", paymentHeaders[0], paymentHeaders[1], paymentHeaders[2]];
  for (let c = 2; c <= 4; c++) {
    const cell = paymentHeaderRow.getCell(c);
    cell.fill = NAVY_HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: c === 2 ? "left" : "right" };
  }

  let pRowIndex = 10;
  for (const mp of data.metodosPago) {
    const row = sheetResumen.getRow(pRowIndex);
    row.values = ["", mp.metodo, mp.cantidadTickets, mp.totalRecaudado];
    row.getCell(2).font = { name: "Inter", size: 10 };
    row.getCell(3).font = { name: "Inter", size: 10 };
    row.getCell(3).alignment = { horizontal: "right" };
    row.getCell(4).font = { name: "Inter", size: 10, bold: true };
    row.getCell(4).numFmt = SOLES_NUM_FMT;
    row.getCell(4).alignment = { horizontal: "right" };
    row.eachCell((c, colNum) => {
      if (colNum >= 2 && colNum <= 4) c.border = BORDER_THIN;
    });
    pRowIndex++;
  }

  // Fila de Total con Fórmulas Dinámicas =SUM(...)
  const totalPaymentRow = sheetResumen.getRow(pRowIndex);
  totalPaymentRow.values = [
    "",
    "TOTAL GENERAL",
    { formula: `SUM(C10:C${pRowIndex - 1})` },
    { formula: `SUM(D10:D${pRowIndex - 1})` },
  ];
  totalPaymentRow.getCell(2).font = { name: "Inter", size: 10, bold: true };
  totalPaymentRow.getCell(3).font = { name: "Inter", size: 10, bold: true };
  totalPaymentRow.getCell(3).alignment = { horizontal: "right" };
  totalPaymentRow.getCell(4).font = { name: "Inter", size: 10, bold: true, color: { argb: "FF081C6C" } };
  totalPaymentRow.getCell(4).numFmt = SOLES_NUM_FMT;
  totalPaymentRow.getCell(4).alignment = { horizontal: "right" };
  totalPaymentRow.eachCell((c, colNum) => {
    if (colNum >= 2 && colNum <= 4) {
      c.border = { top: { style: "double" }, bottom: { style: "thick" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    }
  });

  sheetResumen.columns = [
    { width: 4 },
    { width: 32 },
    { width: 22 },
    { width: 26 },
    { width: 24 },
  ];

  // =========================================================================
  // HOJA 2: INVENTARIO Y LIQUIDACIÓN
  // =========================================================================
  const sheetInv = workbook.addWorksheet("Inventario y Liquidación", {
    views: [{ showGridLines: true }],
  });

  const invHeaders = [
    "Producto",
    "SKU",
    "Talla",
    "Color",
    "Ubicación",
    "Stock Inicial",
    "Stock Actual",
    "Liquidadas",
    "% Liquidado",
    "Precio Remate (S/.)",
  ];

  if (isCostVisible) {
    invHeaders.push("Costo Confidencial (S/.)");
  }

  const invHeaderRow = sheetInv.getRow(1);
  invHeaderRow.values = invHeaders;
  invHeaderRow.height = 24;
  invHeaderRow.eachCell((cell) => {
    cell.fill = NAVY_HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  let invRowIndex = 2;
  for (const item of data.inventario) {
    const row = sheetInv.getRow(invRowIndex);
    const rowValues: (string | number | ExcelJS.CellFormulaValue)[] = [
      item.producto,
      item.sku,
      item.talla || "Única",
      item.color || "Estándar",
      item.ubicacion || "Almacén",
      item.stockInicial,
      item.stockActual,
      item.unidadesLiquidadas,
      item.porcentajeLiquidado / 100, // Decimal para numFmt porcentaje
      item.precioLiquidacion,
    ];

    if (isCostVisible) {
      rowValues.push(item.costo || 0);
    }

    row.values = rowValues;

    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(7).alignment = { horizontal: "right" };
    row.getCell(8).alignment = { horizontal: "right" };
    row.getCell(9).alignment = { horizontal: "right" };
    row.getCell(9).numFmt = PERCENT_NUM_FMT;
    row.getCell(10).alignment = { horizontal: "right" };
    row.getCell(10).numFmt = SOLES_NUM_FMT;

    if (isCostVisible) {
      row.getCell(11).alignment = { horizontal: "right" };
      row.getCell(11).numFmt = SOLES_NUM_FMT;
    }

    row.eachCell((cell) => {
      cell.border = BORDER_THIN;
      cell.font = { name: "Inter", size: 9 };
    });

    invRowIndex++;
  }

  // Fila de Totales de Inventario con fórmulas
  if (data.inventario.length > 0) {
    const totalInvRow = sheetInv.getRow(invRowIndex);
    const totalValues: (string | ExcelJS.CellFormulaValue)[] = [
      "TOTALES",
      "",
      "",
      "",
      "",
      { formula: `SUM(F2:F${invRowIndex - 1})` },
      { formula: `SUM(G2:G${invRowIndex - 1})` },
      { formula: `SUM(H2:H${invRowIndex - 1})` },
      "",
      "",
    ];
    totalInvRow.values = totalValues;
    totalInvRow.font = { name: "Inter", size: 10, bold: true };
    totalInvRow.getCell(1).alignment = { horizontal: "center" };
    totalInvRow.getCell(6).alignment = { horizontal: "right" };
    totalInvRow.getCell(7).alignment = { horizontal: "right" };
    totalInvRow.getCell(8).alignment = { horizontal: "right" };
    totalInvRow.eachCell((c) => {
      c.border = { top: { style: "thin" }, bottom: { style: "double" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    });
  }

  sheetInv.columns = [
    { width: 34 },
    { width: 22 },
    { width: 10 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 20 },
    ...(isCostVisible ? [{ width: 24 }] : []),
  ];

  // =========================================================================
  // HOJA 3: DETALLE DE TICKETS
  // =========================================================================
  const sheetTickets = workbook.addWorksheet("Detalle de Tickets", {
    views: [{ showGridLines: true }],
  });

  const ticketHeaders = [
    "N° Ticket",
    "Fecha",
    "Hora",
    "Cajero",
    "Método de Pago",
    "Estado",
    "Subtotal (S/.)",
    "Descuento (S/.)",
    "Total Venta (S/.)",
  ];

  const tHeaderRow = sheetTickets.getRow(1);
  tHeaderRow.values = ticketHeaders;
  tHeaderRow.height = 24;
  tHeaderRow.eachCell((c) => {
    c.fill = NAVY_HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: "middle", horizontal: "center" };
  });

  let tRowIndex = 2;
  for (const t of data.tickets) {
    const row = sheetTickets.getRow(tRowIndex);
    row.values = [
      t.numeroTicket,
      t.fecha,
      t.hora,
      t.cajero,
      t.metodoPago,
      t.estado,
      t.subtotal,
      t.descuento,
      t.total,
    ];

    row.getCell(1).font = { name: "Inter", size: 9, bold: true };
    row.getCell(7).numFmt = SOLES_NUM_FMT;
    row.getCell(7).alignment = { horizontal: "right" };
    row.getCell(8).numFmt = SOLES_NUM_FMT;
    row.getCell(8).alignment = { horizontal: "right" };
    row.getCell(9).numFmt = SOLES_NUM_FMT;
    row.getCell(9).alignment = { horizontal: "right" };
    row.getCell(9).font = { name: "Inter", size: 9, bold: true, color: { argb: "FF081C6C" } };

    row.eachCell((c) => {
      c.border = BORDER_THIN;
    });

    tRowIndex++;
  }

  // Fila de Total de Tickets con =SUM(...)
  if (data.tickets.length > 0) {
    const totalTicketRow = sheetTickets.getRow(tRowIndex);
    totalTicketRow.values = [
      "TOTAL GENERAL",
      "",
      "",
      "",
      "",
      "",
      { formula: `SUM(G2:G${tRowIndex - 1})` },
      { formula: `SUM(H2:H${tRowIndex - 1})` },
      { formula: `SUM(I2:I${tRowIndex - 1})` },
    ];
    totalTicketRow.font = { name: "Inter", size: 10, bold: true };
    totalTicketRow.getCell(7).numFmt = SOLES_NUM_FMT;
    totalTicketRow.getCell(8).numFmt = SOLES_NUM_FMT;
    totalTicketRow.getCell(9).numFmt = SOLES_NUM_FMT;
    totalTicketRow.getCell(9).font = { name: "Inter", size: 10, bold: true, color: { argb: "FF081C6C" } };
    totalTicketRow.eachCell((c) => {
      c.border = { top: { style: "thin" }, bottom: { style: "double" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    });
  }

  sheetTickets.columns = [
    { width: 26 },
    { width: 14 },
    { width: 12 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
  ];

  // Escribir a Buffer binario
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
