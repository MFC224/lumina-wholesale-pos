"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types/auth";
import { formatPEN } from "@/lib/utils";
import { calcularArqueoCaja, LEYENDA_LIQUIDACION_OBLIGATORIA } from "@/lib/reports/cash-closing";
import {
  FileText,
  X,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  DollarSign,
} from "lucide-react";

interface CashClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export function CashClosingModal({ isOpen, onClose, currentUser }: CashClosingModalProps) {
  const [montoApertura, setMontoApertura] = useState<number>(150);
  const [ventasEfectivo, setVentasEfectivo] = useState<number>(850.5);
  const [efectivoContado, setEfectivoContado] = useState<number>(1000.5);
  const [observaciones, setObservaciones] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculos = calcularArqueoCaja({
    montoApertura,
    ventasEfectivoTotal: ventasEfectivo,
    efectivoContadoFisico: efectivoContado,
  });

  const isCuadrado = calculos.estadoDiferencia === "CUADRADO";
  const isFaltante = calculos.estadoDiferencia === "FALTANTE";

  const handleGenerateReport = async () => {
    setLoading(true);
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
      // Error
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Arqueo y Cierre Diario de Caja</h2>
              <p className="text-xs text-slate-300">
                Conciliación contable física vs sistema y emisión de acta PDF con firmas
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {!generatedHtml ? (
            <>
              {/* Entradas Contables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Fondo Inicial de Apertura (S/.):
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={montoApertura || ""}
                    onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                  />
                  <span className="text-[10px] text-slate-400">Efectivo base en gaveta al abrir</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Efectivo Real Contado Físicamente (S/.):
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={efectivoContado || ""}
                    onChange={(e) => setEfectivoContado(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border-2 border-emerald-500 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                  />
                  <span className="text-[10px] text-slate-400">Conteo físico de billetes y monedas</span>
                </div>
              </div>

              {/* Panel de Conciliación en Vivo */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Fondo de Apertura:</span>
                  <span className="font-semibold tabular-nums">{formatPEN(montoApertura)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cobros en Efectivo del Sistema:</span>
                  <span className="font-semibold tabular-nums">{formatPEN(ventasEfectivo)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                  <span>TOTAL EFECTIVO ESPERADO:</span>
                  <span className="text-[#081C6C] tabular-nums">{formatPEN(calculos.efectivoEsperado)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>TOTAL CONTADO EN GAVETA:</span>
                  <span className="text-emerald-700 tabular-nums">{formatPEN(calculos.efectivoContadoFisico)}</span>
                </div>
              </div>

              {/* Estado de Diferencia */}
              <div
                className={`p-3.5 rounded-xl border text-center font-bold text-sm ${
                  isCuadrado
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : isFaltante
                    ? "bg-red-50 text-red-800 border-red-300"
                    : "bg-blue-50 text-blue-800 border-blue-300"
                }`}
              >
                {isCuadrado ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Caja Cuadrada Exactamente (Diferencia: S/. 0.00)
                  </span>
                ) : isFaltante ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Faltante de Caja: -{formatPEN(Math.abs(calculos.diferencia))}
                  </span>
                ) : (
                  <span>Sobrante de Caja: +{formatPEN(calculos.diferencia)}</span>
                )}
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Observaciones o Justificación del Cierre:
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Detalles sobre billetes deteriorados, diferencias justificadas o incidencias del turno..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                />
              </div>

              {/* Leyenda obligatoria */}
              <div className="text-center text-[10px] font-bold text-red-600 border border-dashed border-red-200 p-2 rounded-lg bg-red-50/50">
                {LEYENDA_LIQUIDACION_OBLIGATORIA}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Acta Oficial de Arqueo Generada Exitosamente</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg font-bold shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-96 overflow-y-auto">
                <iframe
                  title="Vista Previa de Acta"
                  srcDoc={generatedHtml}
                  className="w-full h-96 border-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cerrar
          </button>

          {!generatedHtml ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateReport}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#081C6C] hover:bg-[#0E2A9E] rounded-xl shadow transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando Arqueo...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Generar Acta Oficial de Cierre
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" /> Imprimir Documento Oficial (PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
