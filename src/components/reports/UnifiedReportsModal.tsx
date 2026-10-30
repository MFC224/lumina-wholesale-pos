"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types/auth";
import { formatPEN } from "@/lib/utils";
import { calcularArqueoCaja } from "@/lib/reports/cash-closing";
import {
  FileSpreadsheet,
  FileText,
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  TrendingUp,
  FileCheck,
} from "lucide-react";

interface UnifiedReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export function UnifiedReportsModal({ isOpen, onClose, currentUser }: UnifiedReportsModalProps) {
  const [activeTab, setActiveTab] = useState<"closing" | "excel">("closing");

  // Estados para Arqueo de Caja
  const [montoApertura, setMontoApertura] = useState<number>(150);
  const [ventasEfectivo, setVentasEfectivo] = useState<number>(850.5);
  const [efectivoContado, setEfectivoContado] = useState<number>(1000.5);
  const [observaciones, setObservaciones] = useState<string>("");
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  // Estados para Reporte Excel
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);

  if (!isOpen) return null;

  const calculos = calcularArqueoCaja({
    montoApertura,
    ventasEfectivoTotal: ventasEfectivo,
    efectivoContadoFisico: efectivoContado,
  });

  const isCuadrado = calculos.estadoDiferencia === "CUADRADO";
  const isFaltante = calculos.estadoDiferencia === "FALTANTE";

  const handleGeneratePdfReport = async () => {
    setLoadingPdf(true);
    try {
      const res = await fetch("/api/reports/cash-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoApertura,
          efectivoContadoFisico: efectivoContado,
          observaciones,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.html) {
        setGeneratedHtml(data.html);
      }
    } catch {
      // Error de red
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!generatedHtml) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generatedHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/reports/excel";
      link.download = `Reporte_Inventario_Lumina_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingExcel(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#081C6C] to-[#0A2688] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Centro de Reportes Ejecutivos</h2>
              <p className="text-xs text-slate-300">
                Arqueo de caja contable en PDF y exportación de inventario valorizado en Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas / Tipo de Reporte */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("closing")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "closing"
                ? "border-[#081C6C] text-[#081C6C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Arqueo y Cierre Diario (PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab("excel")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "excel"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Libro de Inventario (Excel .xlsx)</span>
          </button>
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === "closing" ? (
            /* Sección Arqueo de Caja */
            <>
              {generatedHtml ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-6 h-6 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Acta de Cierre Generada con Éxito</p>
                        <p className="text-xs text-emerald-700">El reporte oficial está listo para impresión o descarga PDF.</p>
                      </div>
                    </div>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir / Guardar PDF</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner h-80 bg-slate-50">
                    <iframe
                      srcDoc={generatedHtml}
                      title="Vista Previa de Acta de Cierre"
                      className="w-full h-full border-0"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setGeneratedHtml(null)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5"
                    >
                      &larr; Realizar otro cálculo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                        Fondo de Apertura (S/.)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={montoApertura}
                        onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
                        className="w-full text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                      />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                        Ventas en Efectivo (S/.)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={ventasEfectivo}
                        onChange={(e) => setVentasEfectivo(parseFloat(e.target.value) || 0)}
                        className="w-full text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                      />
                    </div>

                    <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                      <label className="text-[11px] font-bold text-blue-900 uppercase block mb-1">
                        Efectivo Físico Contado (S/.)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={efectivoContado}
                        onChange={(e) => setEfectivoContado(parseFloat(e.target.value) || 0)}
                        className="w-full text-base font-black text-blue-900 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Resumen del Cuadre */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      isCuadrado
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : isFaltante
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCuadrado ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-semibold">
                          Total Esperado: <span className="font-bold">{formatPEN(calculos.efectivoEsperado)}</span>
                        </p>
                        <p className="text-xs">
                          Diferencia:{" "}
                          <span className="font-black">
                            {formatPEN(calculos.diferencia)} ({calculos.estadoDiferencia})
                          </span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isCuadrado
                          ? "bg-emerald-200 text-emerald-800"
                          : isFaltante
                          ? "bg-red-200 text-red-800"
                          : "bg-blue-200 text-blue-800"
                      }`}
                    >
                      {calculos.estadoDiferencia}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Observaciones del Cierre de Caja
                    </label>
                    <textarea
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Indique cualquier incidencia, billetes deteriorados o justificación de diferencias..."
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePdfReport}
                      disabled={loadingPdf}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#081C6C] hover:bg-[#0E2A9E] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {loadingPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      <span>Generar Acta de Arqueo (PDF)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Sección Reporte Excel */
            <div className="space-y-5 py-2">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Libro Oficial de Inventario y Kardex Valorizado (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generado dinámicamente con fórmulas nativas de Microsoft Excel (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300">=SUM(...)</code>).
                    Contiene el desglose completo de productos, variantes por talla/color, stock actual, porcentaje liquidado y valorización en Soles (S/.).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-700 block">Formato & Compatibilidad:</span>
                  <p className="text-slate-500">
                    Totalmente compatible con Microsoft Excel, Google Sheets, LibreOffice Calc y Apple Numbers.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-700 block">Seguridad & Aislamiento (RBAC):</span>
                  <p className="text-slate-500">
                    {currentUser.rol === "ADMIN"
                      ? "Incluye columnas de Costo de Compra y Margen Bruto (Acceso Autorizado)."
                      : "Costos de compra protegidos y omitidos automáticamente para perfil VENDEDOR."}
                  </p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Moneda: <strong>Soles (S/.)</strong> &bull; Generación instantánea
                </span>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={downloadingExcel}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {downloadingExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Descargar Archivo Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
