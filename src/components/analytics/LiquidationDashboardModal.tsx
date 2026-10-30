"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatPEN } from "@/lib/utils";
import { DatePreset } from "@/lib/reports/date-ranges";
import { LiquidationKpiSummary } from "@/lib/reports/kpis";
import {
  TrendingUp,
  X,
  Calendar,
  Layers,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Sparkles,
  Flame,
  Clock,
  Loader2,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
} from "lucide-react";

interface LiquidationDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: "HOY", label: "Hoy" },
  { id: "AYER", label: "Ayer" },
  { id: "7_DIAS", label: "Últimos 7 Días" },
  { id: "MES", label: "Este Mes" },
  { id: "TODO", label: "Todo el Historial" },
];

export function LiquidationDashboardModal({ isOpen, onClose }: LiquidationDashboardModalProps) {
  const [preset, setPreset] = useState<DatePreset>("HOY");
  const [loading, setLoading] = useState<boolean>(false);
  const [kpis, setKpis] = useState<LiquidationKpiSummary | null>(null);
  const [rangeLabel, setRangeLabel] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchKpis = useCallback(async (selectedPreset: DatePreset) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/kpis?preset=${selectedPreset}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKpis(data.kpis);
          setRangeLabel(data.rangeLabel);
        } else {
          setErrorMsg(data.error || "Error al cargar KPIs");
        }
      } else {
        setErrorMsg("Error de conexión al cargar KPIs");
      }
    } catch {
      setErrorMsg("Error de red al consultar métricas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchKpis(preset);
    }
  }, [isOpen, preset, fetchKpis]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Dashboard de Liquidación &amp; Velocidad de Desplome</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  KPIs en Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Métricas ejecutivas de rotación de stock, recaudación por pasarela y aceleración de remate
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

        {/* Barra de Filtros de Período */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Período:</span>
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  preset === p.id
                    ? "bg-[#081C6C] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {rangeLabel}
            </span>
            <button
              onClick={() => fetchKpis(preset)}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition disabled:opacity-50"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading && !kpis ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-[#081C6C]" />
              <span>Calculando métricas de liquidación...</span>
            </div>
          ) : kpis ? (
            <>
              {/* Tarjetas Principales de Desempeño */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tasa de Liquidación Global */}
                <div className="bg-gradient-to-br from-[#081C6C] to-[#0A2688] text-white p-4 rounded-2xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Velocidad de Desplome
                    </span>
                    <Flame className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-3xl font-black text-emerald-300 tabular-nums">
                      {kpis.porcentajeLiquidadoGlobal}%
                    </span>
                    <span className="text-xs text-slate-200 ml-1.5">liquidado</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, kpis.porcentajeLiquidadoGlobal)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-mono pt-1">
                    <span>Restante: {kpis.totalStockActual} un.</span>
                    <span>Total Lote: {kpis.totalStockInicial} un.</span>
                  </div>
                </div>

                {/* Recaudación Total en Soles */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Recaudación del Período
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {formatPEN(kpis.totalVentasPEN)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t pt-1.5">
                    <span>Descuentos dados:</span>
                    <strong className="text-amber-700 font-bold tabular-nums">
                      - {formatPEN(kpis.totalDescuentosPEN)}
                    </strong>
                  </div>
                </div>

                {/* Tickets y Ticket Promedio */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Tickets Emitidos
                    </span>
                    <ShoppingBag className="w-4 h-4 text-[#081C6C]" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {kpis.totalTickets}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5">ventas</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t pt-1.5">
                    <span>Ticket promedio:</span>
                    <strong className="text-[#081C6C] font-bold tabular-nums">
                      {formatPEN(kpis.ticketPromedioPEN)}
                    </strong>
                  </div>
                </div>

                {/* Unidades Desplazadas */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Unidades Rematadas
                    </span>
                    <PackageCheck className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-emerald-700 tabular-nums">
                      {kpis.totalUnidadesLiquidadas}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5">unidades</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t pt-1.5">
                    <span>Rotación del inventario:</span>
                    <span className="font-bold text-slate-700">Alta velocidad</span>
                  </div>
                </div>
              </div>

              {/* Sección de Recaudación por Pasarela y Categorías */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Distribución por Método de Pago */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Recaudación por Pasarela de Pago</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(kpis.ventasPorMetodo).map(([metodo, total]) => {
                      const pct =
                        kpis.totalVentasPEN > 0
                          ? Math.round((total / kpis.totalVentasPEN) * 100)
                          : 0;
                      return (
                        <div key={metodo} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 font-mono">{metodo}</span>
                            <div className="text-right">
                              <span className="font-extrabold text-slate-900 tabular-nums">
                                {formatPEN(total)}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1.5">({pct}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#081C6C] h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desplome por Categoría */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Velocidad de Liquidación por Categoría</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    {kpis.porCategoria.map((cat) => (
                      <div key={cat.categoriaId} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{cat.categoriaNombre}</span>
                          <span className="font-extrabold text-emerald-700 tabular-nums">
                            {cat.porcentajeLiquidado}% ({cat.unidadesLiquidadas}/{cat.stockInicial} un.)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, cat.porcentajeLiquidado)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tablas: Top Más Vendidos y Top Lenta Rotación (Huesos) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top 5 Más Vendidos */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Top 5 Productos de Mayor Desplome</span>
                  </h3>
                  {kpis.topMasVendidos.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No hay ventas registradas en este período.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {kpis.topMasVendidos.map((prod, idx) => (
                        <div key={prod.productoId} className="py-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-slate-800 truncate">{prod.nombre}</p>
                              <span className="text-[10px] font-mono text-slate-400">
                                {prod.codigoSku} &bull; {prod.categoria}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-slate-900 block tabular-nums">
                              {prod.unidadesVendidas} un.
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold">
                              {formatPEN(prod.totalRecaudadoPEN)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top 5 Lenta Rotación ("Huesos" de Remate) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Productos en Riesgo de Estancamiento (&quot;Huesos&quot;)</span>
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {kpis.topLentaRotacion.map((prod) => (
                      <div key={prod.productoId} className="py-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{prod.nombre}</p>
                            <span className="text-[10px] font-mono text-slate-400">
                              SKU: {prod.codigoSku} &bull; Precio: {formatPEN(prod.precioLiquidacion)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] block tabular-nums">
                              {prod.stockActual} un. varadas
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/50">
                          💡 {prod.sugerenciaRemate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Actualización en tiempo real &bull; Moneda: <strong>Soles (S/.)</strong></span>
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
