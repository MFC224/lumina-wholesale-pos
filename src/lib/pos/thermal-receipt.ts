import { formatPEN } from "@/lib/utils";

export interface ThermalReceiptItem {
  nombre: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ThermalReceiptData {
  numeroTicket: string;
  cajeroNombre: string;
  fecha?: string | Date;
  metodoPago: string;
  subtotal: number;
  descuento?: number;
  tipoDescuento?: string;
  total: number;
  montoRecibido?: number;
  vuelto?: number;
  clienteNombre?: string;
  clienteDocumento?: string;
  items: ThermalReceiptItem[];
  anulada?: boolean;
  motivoAnulacion?: string;
  esDevolucion?: boolean;
  montoDevolucion?: number;
  motivoDevolucion?: string;
}

export const LEYENDA_LIQUIDACION_TICKET = "VENTA FINAL DE LIQUIDACIÓN — SIN CAMBIOS NI DEVOLUCIONES";

/**
 * Genera el documento HTML formateado para impresión en tiqueteras térmicas estándar (80mm o 58mm).
 * Incluye estilos CSS de alta densidad sin márgenes externos para corte limpio de papel.
 */
export function generateThermalReceiptHtml(data: ThermalReceiptData, paperWidth: "80mm" | "58mm" = "80mm"): string {
  const fechaStr = data.fecha
    ? new Date(data.fecha).toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : new Date().toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

  const isEfectivo = data.metodoPago.toUpperCase() === "EFECTIVO";
  const efectivoRecibido = data.montoRecibido !== undefined ? data.montoRecibido : data.total;
  const vuelto = data.vuelto !== undefined ? data.vuelto : 0;
  const descuento = data.descuento || 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${data.numeroTicket}</title>
  <style>
    @page {
      margin: 0;
      size: ${paperWidth} auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      -webkit-print-color-adjust: exact;
    }
    body {
      width: ${paperWidth};
      padding: ${paperWidth === "80mm" ? "8mm 6mm" : "5mm 3mm"};
      font-size: ${paperWidth === "80mm" ? "12px" : "10px"};
      line-height: 1.25;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px double #000;
      margin: 8px 0;
    }

    .brand-title {
      font-size: ${paperWidth === "80mm" ? "15px" : "13px"};
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: ${paperWidth === "80mm" ? "10px" : "9px"};
      margin-top: 2px;
    }

    .meta-table, .items-table, .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 1.5px 0;
      font-size: ${paperWidth === "80mm" ? "11px" : "9.5px"};
    }

    .items-table th {
      border-bottom: 1px dashed #000;
      padding: 4px 0;
      font-size: ${paperWidth === "80mm" ? "11px" : "9.5px"};
    }
    .items-table td {
      padding: 3px 0;
      vertical-align: top;
      font-size: ${paperWidth === "80mm" ? "11px" : "9.5px"};
    }

    .totals-table td {
      padding: 2px 0;
      font-size: ${paperWidth === "80mm" ? "12px" : "10.5px"};
    }

    .total-highlight {
      font-size: ${paperWidth === "80mm" ? "15px" : "13px"};
      font-weight: 900;
    }

    .notice-box {
      border: 1px solid #000;
      padding: 5px;
      margin-top: 8px;
      font-size: ${paperWidth === "80mm" ? "9.5px" : "8.5px"};
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
    }

    .watermark-anulada {
      border: 2px solid #000;
      padding: 4px;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 900;
      text-align: center;
      background: #eee;
    }

    @media print {
      body { width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${data.esDevolucion ? `<div class="watermark-anulada">*** NOTA DE CRÉDITO / DEVOLUCIÓN ***</div>` : data.anulada ? `<div class="watermark-anulada">*** TICKET ANULADO ***</div>` : ""}

  <div class="text-center">
    <div class="brand-title">IMPORT L&R</div>
    <div class="brand-sub">${data.esDevolucion ? "COMPROBANTE DE REEMBOLSO PARCIAL" : "IMPORTACIÓN & VENTAS AL POR MAYOR"}</div>
    <div style="font-size: 9px; margin-top: 2px;">RUC: 20608945123</div>
    <div style="font-size: 9px;">LIMA - PERÚ &bull; MONEDA: SOLES (S/.)</div>
  </div>

  <div class="divider"></div>

  <table class="meta-table">
    <tr>
      <td class="bold">TICKET N°:</td>
      <td class="text-right bold">${data.numeroTicket}</td>
    </tr>
    <tr>
      <td>FECHA / HORA:</td>
      <td class="text-right">${fechaStr}</td>
    </tr>
    <tr>
      <td>CAJERO:</td>
      <td class="text-right uppercase">${data.cajeroNombre}</td>
    </tr>
    <tr>
      <td>MÉTODO PAGO:</td>
      <td class="text-right bold uppercase">${data.metodoPago}</td>
    </tr>
    ${
      data.clienteNombre && data.clienteNombre !== "PÚBLICO GENERAL"
        ? `<tr>
      <td>CLIENTE:</td>
      <td class="text-right uppercase">${data.clienteNombre}</td>
    </tr>`
        : ""
    }
    ${
      data.clienteDocumento
        ? `<tr>
      <td>DOC / DNI:</td>
      <td class="text-right">${data.clienteDocumento}</td>
    </tr>`
        : ""
    }
  </table>

  <div class="divider"></div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left" style="width: 15%;">CANT</th>
        <th class="text-left" style="width: 55%;">DESCRIPCIÓN</th>
        <th class="text-right" style="width: 30%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${data.items
        .map(
          (item) => `<tr>
        <td class="text-left bold">${item.cantidad}</td>
        <td class="text-left">
          ${item.nombre}
          ${
            item.talla || item.color
              ? `<br><span style="font-size: 8.5px;">${[item.talla, item.color].filter(Boolean).join(" / ")}</span>`
              : ""
          }
          <br><span style="font-size: 8.5px; color: #444;">SKU: ${item.sku} &bull; P.U: ${formatPEN(item.precioUnitario)}</span>
        </td>
        <td class="text-right bold">${formatPEN(item.subtotal)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="divider"></div>

  <table class="totals-table">
    <tr>
      <td class="text-right" style="width: 60%;">SUBTOTAL:</td>
      <td class="text-right bold" style="width: 40%;">${formatPEN(data.subtotal)}</td>
    </tr>
    ${
      descuento > 0
        ? `<tr>
      <td class="text-right" style="width: 60%;">DESCUENTO:</td>
      <td class="text-right bold" style="width: 40%;">- ${formatPEN(descuento)}</td>
    </tr>`
        : ""
    }
    <tr class="total-highlight">
      <td class="text-right">TOTAL PAGADO:</td>
      <td class="text-right">${formatPEN(data.total)}</td>
    </tr>
    ${
      isEfectivo
        ? `<tr>
      <td class="text-right" style="padding-top: 4px;">EFECTIVO RECIBIDO:</td>
      <td class="text-right bold" style="padding-top: 4px;">${formatPEN(efectivoRecibido)}</td>
    </tr>
    <tr>
      <td class="text-right bold">VUELTO ENTREGADO:</td>
      <td class="text-right bold">${formatPEN(vuelto)}</td>
    </tr>`
        : ""
    }
  </table>

  <div class="double-divider"></div>

  <div class="notice-box">
    ${LEYENDA_LIQUIDACION_TICKET}
    <div style="font-weight: normal; margin-top: 3px; font-size: 8px;">
      Verifique su mercadería antes de retirarse. Este ticket constituye comprobante interno de control de stock de liquidación.
    </div>
  </div>

  ${
    data.motivoAnulacion
      ? `<div style="margin-top: 6px; font-size: 9px; text-align: center;">
      <strong>Motivo de Anulación:</strong> ${data.motivoAnulacion}
    </div>`
      : ""
  }

  <div class="text-center" style="margin-top: 10px; font-size: 9px;">
    ¡Gracias por su compra en Import L&R!
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
}

/**
 * Dispara la ventana de impresión térmica en el navegador del cajero.
 */
export function printThermalReceipt(data: ThermalReceiptData, paperWidth: "80mm" | "58mm" = "80mm"): void {
  if (typeof window === "undefined") return;
  const html = generateThermalReceiptHtml(data, paperWidth);
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}


export interface ThermalCashClosingData {
  numeroCierre?: string;
  cajeroNombre: string;
  supervisorNombre?: string;
  fechaHora?: string | Date;
  periodoLabel?: string;
  montoApertura: number;
  ventasEfectivo: number;
  ventasYape: number;
  ventasPlin: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  totalVentas: number;
  efectivoEsperado: number;
  efectivoReal: number;
  diferencia: number;
  estadoCuadre: "CUADRADO" | "SOBRANTE" | "FALTANTE";
  ticketsEmitidos: number;
  ticketsAnulados: number;
}

/**
 * Genera el documento HTML formateado para imprimir el Reporte de Cierre Z / Arqueo de Caja
 * en tiqueteras térmicas estándar (80mm o 58mm).
 */
export function generateThermalCashClosingHtml(
  data: ThermalCashClosingData,
  paperWidth: "80mm" | "58mm" = "80mm"
): string {
  const fechaStr = data.fechaHora
    ? new Date(data.fechaHora).toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : new Date().toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cierre Z - ${data.cajeroNombre}</title>
  <style>
    @page { margin: 0; size: ${paperWidth} auto; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      -webkit-print-color-adjust: exact;
    }
    body {
      width: ${paperWidth};
      padding: ${paperWidth === "80mm" ? "8mm 6mm" : "5mm 3mm"};
      font-size: ${paperWidth === "80mm" ? "12px" : "10px"};
      line-height: 1.25;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px double #000; margin: 8px 0; }
    .brand-title { font-size: ${paperWidth === "80mm" ? "15px" : "13px"}; font-weight: 900; }
    .banner-z {
      border: 2px solid #000;
      padding: 4px;
      margin: 6px 0;
      font-size: 13px;
      font-weight: 900;
      text-align: center;
      background: #eee;
    }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1.5px 0; font-size: ${paperWidth === "80mm" ? "11px" : "9.5px"}; }
    .sign-box { margin-top: 25px; padding-top: 4px; border-top: 1px solid #000; text-align: center; font-size: 9px; }
    @media print { body { width: 100%; } }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="brand-title">IMPORT L&R</div>
    <div style="font-size: 9px;">RUC: 20608945123 &bull; LIMA - PERÚ</div>
    <div class="banner-z">*** REPORTE DE CIERRE Z ***</div>
  </div>

  <table>
    <tr><td class="bold">FECHA/HORA:</td><td class="text-right">${fechaStr}</td></tr>
    <tr><td>CAJERO:</td><td class="text-right uppercase">${data.cajeroNombre}</td></tr>
    ${data.supervisorNombre ? `<tr><td>SUPERVISOR:</td><td class="text-right uppercase">${data.supervisorNombre}</td></tr>` : ""}
    ${data.periodoLabel ? `<tr><td>PERÍODO:</td><td class="text-right">${data.periodoLabel}</td></tr>` : ""}
    <tr><td>TICKETS EMITIDOS:</td><td class="text-right bold">${data.ticketsEmitidos}</td></tr>
    <tr><td>TICKETS ANULADOS:</td><td class="text-right">${data.ticketsAnulados}</td></tr>
  </table>

  <div class="divider"></div>
  <div class="bold" style="font-size: 10px; margin-bottom: 3px;">DESGLOSE POR PASARELA (S/.)</div>
  <table>
    <tr><td>EFECTIVO:</td><td class="text-right bold">${formatPEN(data.ventasEfectivo)}</td></tr>
    <tr><td>YAPE:</td><td class="text-right bold">${formatPEN(data.ventasYape)}</td></tr>
    <tr><td>PLIN:</td><td class="text-right bold">${formatPEN(data.ventasPlin)}</td></tr>
    <tr><td>TARJETA (POS):</td><td class="text-right bold">${formatPEN(data.ventasTarjeta)}</td></tr>
    <tr><td>TRANSFERENCIA:</td><td class="text-right bold">${formatPEN(data.ventasTransferencia)}</td></tr>
  </table>

  <div class="double-divider"></div>
  <table>
    <tr style="font-size: 13px; font-weight: 900;">
      <td>TOTAL VENTAS:</td>
      <td class="text-right">${formatPEN(data.totalVentas)}</td>
    </tr>
  </table>

  <div class="divider"></div>
  <div class="bold" style="font-size: 10px; margin-bottom: 3px;">ARQUEO FÍSICO DE CAJA (SOLES)</div>
  <table>
    <tr><td>(+) Fondo Inicial:</td><td class="text-right">${formatPEN(data.montoApertura)}</td></tr>
    <tr><td>(+) Efectivo por Ventas:</td><td class="text-right">${formatPEN(data.ventasEfectivo)}</td></tr>
    <tr class="bold"><td>(=) Efectivo Esperado:</td><td class="text-right">${formatPEN(data.efectivoEsperado)}</td></tr>
    <tr class="bold"><td>(=) Efectivo Contado Físico:</td><td class="text-right">${formatPEN(data.efectivoReal)}</td></tr>
    <tr class="bold" style="font-size: 12px;">
      <td>DIFERENCIA:</td>
      <td class="text-right">${formatPEN(data.diferencia)} (${data.estadoCuadre})</td>
    </tr>
  </table>

  <div class="double-divider"></div>
  <table style="width: 100%; margin-top: 20px;">
    <tr>
      <td style="width: 48%;">
        <div class="sign-box">FIRMA CAJERO<br>${data.cajeroNombre}</div>
      </td>
      <td style="width: 4%;"></td>
      <td style="width: 48%;">
        <div class="sign-box">FIRMA SUPERVISOR<br>ADMINISTRACIÓN</div>
      </td>
    </tr>
  </table>

  <div class="text-center" style="margin-top: 15px; font-size: 8.5px; color: #444;">
    SISTEMA IMPORT L&R &bull; PERÚ
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 250);
    });
  </script>
</body>
</html>`;
}

/**
 * Dispara la impresión del Reporte de Cierre Z en la tiquetera térmica del cajero.
 */
export function printThermalCashClosing(
  data: ThermalCashClosingData,
  paperWidth: "80mm" | "58mm" = "80mm"
): void {
  if (typeof window === "undefined") return;
  const html = generateThermalCashClosingHtml(data, paperWidth);
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
