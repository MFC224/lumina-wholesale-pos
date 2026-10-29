"use client";

import React, { useState, useRef } from "react";
import { ImportReport } from "@/types/catalog";
import { formatPEN } from "@/lib/utils";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Save,
  Loader2,
} from "lucide-react";

interface BulkImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: () => void;
}

export function BulkImporterModal({ isOpen, onClose, onImportCompleted }: BulkImporterModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMessage(null);
    setSuccessMessage(null);
    setReport(null);

    // Previsualización y validación automática
    await previewFile(selected);
  };

  const previewFile = async (targetFile: File) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("persist", "false"); // Solo validación

      const res = await fetch("/api/catalog/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Error al validar el archivo");
      } else {
        setReport(data.report);
      }
    } catch {
      setErrorMessage("Error de conexión al enviar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !report || report.filasValidas === 0) return;

    setPersisting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("persist", "true"); // Persistir en PostgreSQL

      const res = await fetch("/api/catalog/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`¡Éxito! Se guardaron ${data.guardados} productos en la base de datos.`);
        setTimeout(() => {
          onImportCompleted();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(data.error || "Error al guardar los productos");
      }
    } catch {
      setErrorMessage("Error de conexión al guardar los productos");
    } finally {
      setPersisting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Importador Masivo de Inventario</h2>
              <p className="text-xs text-slate-300">
                Soporte para archivos Excel (.xlsx) y CSV con agrupación de variantes
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Zona de Drag & Drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#081C6C] bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-colors duration-200"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.csv"
              className="hidden"
            />
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">
              {file ? file.name : "Haga clic o arrastre aquí su archivo Excel o CSV"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Columnas admitidas: Nombre, Categoría, SKU Base, Talla, Color, Ubicación, Precio Liquidación, Stock Inicial
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin text-[#081C6C]" />
              <span>Validando y estructurando variantes...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Resumen del Reporte de Validación */}
          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block">Total Filas</span>
                  <span className="text-xl font-bold text-slate-800 tabular-nums">{report.totalFilas}</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-xs text-emerald-700 block font-medium">Filas Válidas</span>
                  <span className="text-xl font-bold text-emerald-700 tabular-nums">{report.filasValidas}</span>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-center">
                  <span className="text-xs text-red-700 block font-medium">Filas con Error</span>
                  <span className="text-xl font-bold text-red-700 tabular-nums">{report.filasFallidas}</span>
                </div>
              </div>

              {/* Errores detectados */}
              {report.errores.length > 0 && (
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Errores por corregir en el archivo:
                  </h4>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                    {report.errores.map((err, idx) => (
                      <li key={idx}>
                        Fila {err.fila}: {err.error} {err.columna ? `(Columna: ${err.columna})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Previsualización de Productos Agrupados con Variantes */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Productos Agrupados Listos para Ingresar ({report.productosAgrupados.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3">SKU Base</th>
                        <th className="py-2 px-3">Precio S/.</th>
                        <th className="py-2 px-3 text-center">Variantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.productosAgrupados.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">{item.nombre}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{item.codigoSku}</td>
                          <td className="py-2 px-3 font-bold text-[#081C6C] tabular-nums">
                            {formatPEN(item.precioLiquidacion)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                              {item.variantes.length} var.
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Cancelar
          </button>

          {report && report.filasValidas > 0 && (
            <button
              type="button"
              disabled={persisting}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow transition disabled:opacity-50"
            >
              {persisting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando en Base de Datos...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Confirmar e Ingresar al Inventario ({report.productosAgrupados.length} Productos)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
