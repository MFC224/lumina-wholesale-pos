import {
  CashClosingCalculationInput,
  CashClosingResult,
  CashClosingReportDocument,
  CashDifferenceStatus,
} from "@/types/reports";
import { formatPEN } from "@/lib/utils";

export const LEYENDA_LIQUIDACION_OBLIGATORIA = "Venta Final de Liquidación - Sin Devolución";

/**
 * Calcula el arqueo contable de caja comparando el efectivo esperado vs físico contado.
 */
export function calcularArqueoCaja(input: CashClosingCalculationInput): CashClosingResult {
  const montoApertura = Math.max(0, input.montoApertura || 0);
  const ventasEfectivoTotal = Math.max(0, input.ventasEfectivoTotal || 0);
  const efectivoContadoFisico = Math.max(0, input.efectivoContadoFisico || 0);
  const ventasDigitalesTotal = Math.max(0, input.ventasDigitalesTotal || 0);

  // Efectivo esperado en gaveta = Fondo inicial de apertura + Cobros en efectivo
  const efectivoEsperado = Math.round((montoApertura + ventasEfectivoTotal) * 100) / 100;

  // Diferencia = Lo que hay físicamente - Lo que el sistema esperaba
  const diferencia = Math.round((efectivoContadoFisico - efectivoEsperado) * 100) / 100;

  let estadoDiferencia: CashDifferenceStatus = "CUADRADO";
  if (diferencia > 0) {
    estadoDiferencia = "SOBRANTE";
  } else if (diferencia < 0) {
    estadoDiferencia = "FALTANTE";
  }

  const totalVentasGlobal = Math.round((ventasEfectivoTotal + ventasDigitalesTotal) * 100) / 100;

  return {
    montoApertura,
    ventasEfectivoTotal,
    efectivoEsperado,
    efectivoContadoFisico,
    diferencia,
    estadoDiferencia,
    ventasDigitalesTotal,
    totalVentasGlobal,
  };
}

/**
 * Genera la estructura formal del informe de Arqueo y Cierre Diario de Caja.
 */
export function buildCashClosingDocument(params: {
  id: string;
  cajeroNombre: string;
  cajeroId: string;
  supervisorNombre?: string;
  supervisorId?: string;
  fechaApertura: Date | string;
  fechaCierre: Date | string;
  observaciones?: string;
  input: CashClosingCalculationInput;
}): CashClosingReportDocument {
  const calculos = calcularArqueoCaja(params.input);

  return {
    id: params.id,
    cajeroNombre: params.cajeroNombre,
    cajeroId: params.cajeroId,
    supervisorNombre: params.supervisorNombre,
    supervisorId: params.supervisorId,
    fechaApertura: params.fechaApertura,
    fechaCierre: params.fechaCierre,
    observaciones: params.observaciones,
    calculos,
    leyendaLegal: LEYENDA_LIQUIDACION_OBLIGATORIA,
    firmas: {
      cajero: {
        nombre: params.cajeroNombre,
        firmado: true,
        fecha: new Date(params.fechaCierre).toLocaleString("es-PE"),
      },
      administrador: {
        nombre: params.supervisorNombre || "Administrador de Turno",
        firmado: Boolean(params.supervisorId),
        fecha: params.supervisorId ? new Date(params.fechaCierre).toLocaleString("es-PE") : undefined,
      },
    },
  };
}

/**
 * Genera una plantilla HTML lista para impresión o renderizado en PDF (formato A4 estándar).
 */
export function renderCashClosingHtml(doc: CashClosingReportDocument): string {
  const { calculos, firmas } = doc;
  const isCuadrado = calculos.estadoDiferencia === "CUADRADO";
  const isFaltante = calculos.estadoDiferencia === "FALTANTE";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Arqueo y Cierre Diario de Caja - ${doc.id}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #081C6C;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-box {
      font-size: 20px;
      font-weight: 900;
      color: #081C6C;
      letter-spacing: -0.5px;
    }
    .logo-box span { color: #10B981; }
    .doc-meta { text-align: right; font-size: 10px; color: #64748b; }
    .title-box { text-align: center; margin-bottom: 24px; }
    .title-box h1 {
      margin: 0;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #081C6C;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #081C6C;
      color: #ffffff;
      font-size: 10px;
      text-transform: uppercase;
    }
    .text-right { text-align: right; }
    .tabular { font-variant-numeric: tabular-nums; }
    .total-row {
      font-weight: bold;
      background: #f1f5f9;
      border-top: 2px solid #081C6C;
    }
    .diff-box {
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 24px;
      border: 1px solid;
    }
    .diff-cuadrado { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .diff-faltante { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .diff-sobrante { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .legal-notice {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #b91c1c;
      border-top: 1px dashed #cbd5e1;
      border-bottom: 1px dashed #cbd5e1;
      padding: 8px 0;
      margin-bottom: 30px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .sign-col {
      text-align: center;
      border-top: 1px solid #0f172a;
      padding-top: 8px;
      font-size: 11px;
    }
    .sign-name { font-weight: bold; margin-bottom: 2px; }
    .sign-role { color: #64748b; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">IMPORT <span>L&R</span></div>
    <div class="doc-meta">
      <div>Acta N°: <strong>${doc.id}</strong></div>
      <div>Fecha Emisión: ${new Date(doc.fechaCierre).toLocaleDateString("es-PE")}</div>
    </div>
  </div>

  <div class="title-box">
    <h1>Acta Oficial de Arqueo y Cierre Diario de Caja</h1>
    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Sistema de Inventario y Remate de Liquidación</div>
  </div>

  <div class="grid-info">
    <div><strong>Cajero Responsable:</strong> ${doc.cajeroNombre} (ID: ${doc.cajeroId})</div>
    <div><strong>Supervisor / Admin:</strong> ${doc.supervisorNombre || "Administrador General"}</div>
    <div><strong>Apertura de Turno:</strong> ${new Date(doc.fechaApertura).toLocaleString("es-PE")}</div>
    <div><strong>Cierre de Turno:</strong> ${new Date(doc.fechaCierre).toLocaleString("es-PE")}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto de Movimiento</th>
        <th class="text-right">Monto en Soles (S/.)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Fondo Inicial de Apertura de Gaveta</td>
        <td class="text-right tabular">${formatPEN(calculos.montoApertura)}</td>
      </tr>
      <tr>
        <td>Ventas Cobradas en Efectivo</td>
        <td class="text-right tabular">${formatPEN(calculos.ventasEfectivoTotal)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL EFECTIVO ESPERADO EN SISTEMA</td>
        <td class="text-right tabular" style="color: #081C6C;">${formatPEN(calculos.efectivoEsperado)}</td>
      </tr>
      <tr>
        <td><strong>EFECTIVO REAL CONTADO FÍSICAMENTE</strong></td>
        <td class="text-right tabular" style="font-weight: bold;">${formatPEN(calculos.efectivoContadoFisico)}</td>
      </tr>
    </tbody>
  </table>

  <div class="diff-box ${isCuadrado ? "diff-cuadrado" : isFaltante ? "diff-faltante" : "diff-sobrante"}">
    ${
      isCuadrado
        ? "✓ CAJA CONCILIADA EXACTAMENTE (DIFERENCIA: S/. 0.00)"
        : isFaltante
        ? `⚠ FALTANTE DE CAJA DETECTADO: ${formatPEN(Math.abs(calculos.diferencia))}`
        : `ℹ SOBRANTE DE CAJA DETECTADO: +${formatPEN(calculos.diferencia)}`
    }
  </div>

  <table style="margin-bottom: 24px;">
    <thead>
      <tr>
        <th>Ventas Digitales Informadas (No afectan gaveta física)</th>
        <th class="text-right">Monto en Soles (S/.)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Cobros vía Yape / Plin / Tarjetas / Transferencia</td>
        <td class="text-right tabular">${formatPEN(calculos.ventasDigitalesTotal)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL VENTAS GLOBALES DEL DÍA (Efectivo + Digital)</td>
        <td class="text-right tabular">${formatPEN(calculos.totalVentasGlobal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="legal-notice">
    ${doc.leyendaLegal}
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div class="sign-name">${firmas.cajero.nombre}</div>
      <div class="sign-role">Firma de Cajero de Turno</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Conforme con el conteo físico</div>
    </div>
    <div class="sign-col">
      <div class="sign-name">${firmas.administrador.nombre}</div>
      <div class="sign-role">Firma de Administrador / Auditor</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Aprobación de Cierre de Caja</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
