"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@/types/auth";
import {
  Layers,
  X,
  History,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  ShieldCheck,
  Package,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";

interface KardexMovement {
  id: string;
  fecha: string;
  tipo: "VENTA" | "INGRESO" | "AJUSTE" | "ANULACION";
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  usuario: string;
  rolUsuario: string;
  numeroTicket: string | null;
  sku: string;
  producto: string;
  talla?: string | null;
  color?: string | null;
  ubicacion?: string | null;
  categoria: string;
}

interface CatalogProduct {
  id: string;
  nombre: string;
  codigoSku: string;
  variantes: Array<{
    id: string;
    sku: string;
    talla?: string | null;
    color?: string | null;
    stockActual: number;
    ubicacion?: string | null;
  }>;
}

interface KardexAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  catalog: CatalogProduct[];
  onInventoryAdjusted?: () => void;
}

export function KardexAuditModal({
  isOpen,
  onClose,
  currentUser,
  catalog,
  onInventoryAdjusted,
}: KardexAuditModalProps) {
  const [activeTab, setActiveTab] = useState<"history" | "adjust">("history");
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Formulario de Ajuste
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"AJUSTE" | "INGRESO">("AJUSTE");
  const [adjustMotivo, setAdjustMotivo] = useState<string>("");
  const [processingAdjust, setProcessingAdjust] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleExportExcel = () => {
    setDownloadingExcel(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/reports/kardex-excel";
      link.download = `Kardex_Lumina_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingExcel(false), 1200);
    }
  };

  const fetchKardex = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterType === "TODOS" ? "/api/catalog/kardex" : `/api/catalog/kardex?tipo=${filterType}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMovements(data.movimientos || []);
        }
      }
    } catch {
      // Error silencioso
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (isOpen) {
      fetchKardex();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, fetchKardex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Encontrar la variante seleccionada para el formulario de ajuste
  let selectedVariantInfo: {
    productoNombre: string;
    sku: string;
    talla?: string | null;
    color?: string | null;
    stockActual: number;
    ubicacion?: string | null;
  } | null = null;

  if (selectedVariantId) {
    for (const p of catalog) {
      const v = p.variantes.find((varItem) => varItem.id === selectedVariantId);
      if (v) {
        selectedVariantInfo = {
          productoNombre: p.nombre,
          sku: v.sku,
          talla: v.talla,
          color: v.color,
          stockActual: v.stockActual,
          ubicacion: v.ubicacion,
        };
        break;
      }
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || adjustQty === 0 || !adjustMotivo.trim()) {
      setErrorMsg("Debe seleccionar una variante, especificar una cantidad distinta de 0 y un motivo.");
      return;
    }

    setProcessingAdjust(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/catalog/kardex/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          varianteId: selectedVariantId,
          cantidadAjuste: adjustQty,
          tipo: adjustType,
          motivo: adjustMotivo.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const mov = data.movimiento;
        setSuccessMsg(
          `¡Ajuste de inventario registrado con éxito! Stock de ${mov.sku} actualizado a ${mov.stockNuevo} un.`
        );
        setAdjustQty(0);
        setAdjustMotivo("");
        fetchKardex();
        if (onInventoryAdjusted) onInventoryAdjusted();
      } else {
        setErrorMsg(data.error || "No se pudo registrar el ajuste");
      }
    } catch {
      setErrorMsg("Error de conexión al procesar el ajuste de inventario");
    } finally {
      setProcessingAdjust(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.sku.toLowerCase().includes(term) ||
      m.producto.toLowerCase().includes(term) ||
      m.motivo.toLowerCase().includes(term) ||
      m.usuario.toLowerCase().includes(term) ||
      (m.numeroTicket && m.numeroTicket.toLowerCase().includes(term))
    );
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Auditoría de Kardex &amp; Ajustes de Inventario</span>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                  Inmutable
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Bitácora de movimientos físicos y regularización de existencias de almacén
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

        {/* Pestañas de Navegación */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "history"
                  ? "bg-[#081C6C] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Bitácora de Kardex</span>
            </button>

            {currentUser.rol === "ADMIN" && (
              <button
                type="button"
                onClick={() => setActiveTab("adjust")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "adjust"
                    ? "bg-[#081C6C] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Registrar Ajuste Manual (Admin)</span>
              </button>
            )}
          </div>

          {activeTab === "history" && (
            <div className="flex items-center gap-2">
              {/* Filtro por tipo */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="VENTA">Ventas (-)</option>
                  <option value="INGRESO">Ingresos (+)</option>
                  <option value="AJUSTE">Ajustes (+/-)</option>
                  <option value="ANULACION">Anulaciones (+)</option>
                </select>
              </div>

              {/* Botón Exportar Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={downloadingExcel}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                title="Descargar bitácora completa de Kardex en Excel .xlsx"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{downloadingExcel ? "Exportando..." : "Exportar Excel"}</span>
              </button>

              {/* Botón Refrescar */}
              <button
                onClick={fetchKardex}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition"
                title="Actualizar movimientos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "history" ? (
            <div className="space-y-3">
              {/* Buscador de Kardex */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por SKU, producto, motivo o usuario..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                />
              </div>

              {/* Tabla de Kardex */}
              {loading ? (
                <div className="flex items-center justify-center py-14 text-sm text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#081C6C]" />
                  <span>Cargando bitácora de Kardex...</span>
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="text-center py-14 text-slate-400 text-xs">
                  No se encontraron movimientos de Kardex registrados.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Producto &amp; SKU</th>
                        <th className="py-2.5 px-3 text-center">Variación</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3">Motivo / Auditoría</th>
                        <th className="py-2.5 px-3 text-right">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMovements.map((mov) => {
                        const isPositivo = mov.cantidad > 0;
                        const isVenta = mov.tipo === "VENTA";
                        const isIngreso = mov.tipo === "INGRESO";
                        const isAnulacion = mov.tipo === "ANULACION";

                        return (
                          <tr key={mov.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {new Date(mov.fecha).toLocaleString("es-PE", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isVenta
                                    ? "bg-blue-100 text-blue-800"
                                    : isIngreso
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isAnulacion
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {mov.tipo}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800 truncate max-w-[200px]">
                                {mov.producto}
                              </p>
                              <span className="text-[10px] font-mono text-slate-500">
                                {mov.sku} {mov.talla ? `· ${mov.talla}` : ""} {mov.color ? `· ${mov.color}` : ""}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold tabular-nums">
                              <span
                                className={`inline-flex items-center gap-0.5 ${
                                  isPositivo ? "text-emerald-700" : "text-blue-700"
                                }`}
                              >
                                {isPositivo ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap tabular-nums">
                              <span>{mov.stockAnterior}</span>
                              <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />
                              <strong className="text-slate-900">{mov.stockNuevo}</strong>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[240px] truncate" title={mov.motivo}>
                              {mov.numeroTicket && (
                                <span className="font-mono text-[#081C6C] font-bold mr-1">
                                  [{mov.numeroTicket}]
                                </span>
                              )}
                              <span>{mov.motivo}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-semibold text-slate-700 block">{mov.usuario}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{mov.rolUsuario}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Tab: Ajuste Manual de Inventario */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Formulario de Ajuste de Stock Auditado</span>
              </div>
              <p className="text-xs text-slate-500">
                Este proceso incrementa o descuenta unidades del inventario físico y deja constancia legal en Kardex vinculada a tu usuario.
              </p>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                {/* Seleccionar Variante */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccionar Producto / Variante a regularizar:
                  </label>
                  <select
                    required
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                  >
                    <option value="">-- Selecciona una variante del catálogo --</option>
                    {catalog.map((prod) => (
                      <optgroup key={prod.id} label={prod.nombre}>
                        {prod.variantes.map((v) => (
                          <option key={v.id} value={v.id}>
                            {prod.nombre} &bull; {v.sku} &bull; {v.talla || "Estándar"} / {v.color || "Único"} (Stock Actual: {v.stockActual} un.)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Info de la variante seleccionada */}
                {selectedVariantInfo && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">SKU</span>
                      <strong className="font-mono text-slate-800">{selectedVariantInfo.sku}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Actual</span>
                      <strong className="text-emerald-700 text-sm tabular-nums">
                        {selectedVariantInfo.stockActual} un.
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ubicación</span>
                      <strong className="text-slate-700">{selectedVariantInfo.ubicacion || "Almacén General"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Resultante</span>
                      <strong
                        className={`text-sm tabular-nums ${
                          selectedVariantInfo.stockActual + adjustQty < 0
                            ? "text-red-600 font-black"
                            : "text-[#081C6C]"
                        }`}
                      >
                        {selectedVariantInfo.stockActual + adjustQty} un.
                      </strong>
                    </div>
                  </div>
                )}

                {/* Controles de Cantidad y Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Movimiento:
                    </label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                    >
                      <option value="AJUSTE">AJUSTE (Conteo físico / Cuadre de almacén)</option>
                      <option value="INGRESO">INGRESO (Mercadería o bulto adicional)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cantidad a ajustar (+ para ingresar, - para descontar):
                    </label>
                    <input
                      type="number"
                      required
                      value={adjustQty || ""}
                      onChange={(e) => setAdjustQty(Number(e.target.value))}
                      placeholder="Ej. +10 o -2"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C] font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Motivo Obligatorio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo obligatorio de auditoría:
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustMotivo}
                    onChange={(e) => setAdjustMotivo(e.target.value)}
                    placeholder="Ej. Conteo físico de rack A-3: se encontraron 5 unidades sin rotular"
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                  />

                  {/* Sugerencias Rápidas */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 self-center">Rápidos:</span>
                    {[
                      "Conteo físico en rack",
                      "Merma por empaque roto",
                      "Prenda fallada de fábrica",
                      "Lote extra sin guía",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setAdjustMotivo(sug)}
                        className="px-2 py-0.5 bg-white hover:bg-slate-200 text-slate-600 rounded text-[10px] border border-slate-200 transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón de Enviar */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariantId("");
                      setAdjustQty(0);
                      setAdjustMotivo("");
                    }}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      processingAdjust ||
                      !selectedVariantId ||
                      adjustQty === 0 ||
                      !adjustMotivo.trim() ||
                      (selectedVariantInfo !== null && selectedVariantInfo.stockActual + adjustQty < 0)
                    }
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#081C6C] hover:bg-[#061552] rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {processingAdjust ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Confirmar Ajuste en Kardex</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Bitácora total de movimientos: <strong>{movements.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
