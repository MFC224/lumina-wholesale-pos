import ExcelJS from "exceljs";
import { consultarKardexDb } from "@/lib/kardex/service";

/**
 * Genera el archivo Excel (.xlsx) con la bitácora inmutable de Kardex formateada según el estándar ejecutivo Lumina.
 */
export async function generarKardexExcelBuffer(): Promise<Buffer> {
  const movimientos = await consultarKardexDb({ limit: 500 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lumina POS System";
  workbook.lastModifiedBy = "Lumina POS System";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Kardex Inmutable", {
    views: [{ showGridLines: true }],
  });

  // Título Institucional
  worksheet.mergeCells("A1:O1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "LUMINA WHOLESALE & LIQUIDATION — BITÁCORA OFICIAL DE KARDEX";
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF081C6C" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Subtítulo con metadata
  worksheet.mergeCells("A2:O2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Auditoría física de inventario &bull; Total movimientos: ${movimientos.length} &bull; Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Fila 3 vacía

  // Encabezados de Columna
  const headers = [
    "ID Movimiento",
    "Fecha y Hora (PE)",
    "Tipo de Movimiento",
    "Código SKU",
    "Producto",
    "Categoría",
    "Talla",
    "Color",
    "Ubicación",
    "Cantidad (+/-)",
    "Stock Anterior",
    "Stock Nuevo",
    "Motivo de Auditoría",
    "N° Ticket",
    "Usuario Responsable",
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0A2688" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF081C6C" } },
    };
  });

  // Filas de datos
  movimientos.forEach((m, idx) => {
    const isEven = idx % 2 === 0;
    const fechaLima = new Date(m.fecha).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const row = worksheet.addRow([
      m.id,
      fechaLima,
      m.tipo,
      m.sku,
      m.producto,
      m.categoria,
      m.talla || "—",
      m.color || "—",
      m.ubicacion || "Almacén General",
      m.cantidad,
      m.stockAnterior,
      m.stockNuevo,
      m.motivo,
      m.numeroTicket || "—",
      `${m.usuario} (${m.rolUsuario})`,
    ]);

    row.height = 20;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10 };
      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Alineación
      if ([1, 2, 4, 14].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if ([10, 11, 12].includes(colNumber)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0";
      } else if (colNumber === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // Ajuste de Ancho de Columnas
  const colWidths = [22, 20, 16, 18, 32, 20, 12, 14, 18, 14, 14, 14, 40, 18, 25];
  colWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
