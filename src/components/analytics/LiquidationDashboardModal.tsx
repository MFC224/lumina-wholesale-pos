"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatPEN } from "@/lib/utils";
import { DatePreset } from "@/lib/reports/date-ranges";
import { LiquidationKpiSummary, SellerSalesMetric } from "@/lib/reports/kpis";
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
  Loader2,
  PackageCheck,
  RefreshCw,
  Trophy,
  PieChart as PieChartIcon,
  Award,
  Crown,
  Users,
  CreditCard,
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

// Paletas de color ejecutivas para el diagrama de pastel
const PAYMENT_COLORS: Record<string, string> = {
  EFECTIVO: "#10B981", // Esmeralda Lumina
  YAPE: "#7C3AED", // Violeta Yape
  PLIN: "#06B6D4", // Celeste Plin
  TARJETA: "#081C6C", // Navy Lumina
  TRANSFERENCIA: "#F59E0B", // Ámbar
};

const CATEGORY_COLORS = [
  "#2563EB", // Azul
  "#10B981", // Esmeralda
  "#F59E0B", // Ámbar
  "#EC4899", // Rosa
  "#8B5CF6", // Púrpura
  "#06B6D4", // Cian
  "#64748B", // Slate
];

interface PieSegment {
  label: string;
  value: number;
  color: string;
  percent: number;
}

export function LiquidationDashboardModal({ isOpen, onClose }: LiquidationDashboardModalProps) {
  const [preset, setPreset] = useState<DatePreset>("HOY");
  const [loading, setLoading] = useState<boolean>(false);
  const [kpis, setKpis] = useState<LiquidationKpiSummary | null>(null);
  const [rangeLabel, setRangeLabel] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modo del diagrama de pastel: Pasarelas vs Categorías
  const [pieMode, setPieMode] = useState<"METODO" | "CATEGORIA">("METODO");
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

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

  // Cierre accesible con tecla Escape
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

  // Preparar segmentos del Diagrama de Pastel
  const pieSegments: PieSegment[] = useMemo(() => {
    if (!kpis) return [];

    if (pieMode === "METODO") {
      const entries = Object.entries(kpis.ventasPorMetodo);
      const total = kpis.totalVentasPEN || 1;
      return entries
        .map(([metodo, valor]) => ({
          label: metodo,
          value: valor,
          color: PAYMENT_COLORS[metodo] || "#64748B",
          percent: Math.round((valor / total) * 1000) / 10,
        }))
        .filter((s) => s.value > 0);
    } else {
      const totalUnits = kpis.porCategoria.reduce((sum, c) => sum + c.unidadesLiquidadas, 0) || 1;
      return kpis.porCategoria
        .map((cat, idx) => ({
          label: cat.categoriaNombre,
          value: cat.unidadesLiquidadas,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
          percent: Math.round((cat.unidadesLiquidadas / totalUnits) * 1000) / 10,
        }))
        .filter((s) => s.value > 0);
    }
  }, [kpis, pieMode]);

  const pieTotal = useMemo(() => {
    return pieSegments.reduce((sum, s) => sum + s.value, 0);
  }, [pieSegments]);

  // Vendedor Líder para escala relativa de barras
  const topSellerAmount = useMemo(() => {
    if (!kpis?.rankingVendedores || kpis.rankingVendedores.length === 0) return 1;
    return Math.max(...kpis.rankingVendedores.map((v) => v.totalVendidoPEN), 1);
  }, [kpis]);

  // Suma exacta de ventas de los vendedores en el ranking
  const totalVentasVendedores = useMemo(() => {
    if (!kpis?.rankingVendedores) return 0;
    return kpis.rankingVendedores.reduce((sum, v) => sum + v.totalVendidoPEN, 0);
  }, [kpis]);

  // Render SVG Donut Chart Paths de forma pura (React 19)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const calculatedSegments = useMemo(() => {
    let acc = 0;
    return pieSegments.map((segment) => {
      const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((acc / 100) * circumference);
      acc += segment.percent;
      return {
        ...segment,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [pieSegments, circumference]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Ejecutivo */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Dashboard de Liquidación &amp; Control Ejecutivo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider font-mono">
                  En Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Velocidad de desplome, diagramas de distribución y ranking de vendedores en Soles (S/.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Cerrar ventana"
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
            <span className="text-xs font-semibold text-slate-700 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
              {rangeLabel}
            </span>
            <button
              onClick={() => fetchKpis(preset)}
              disabled={loading}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 text-sm">
              <Loader2 className="w-7 h-7 animate-spin text-[#081C6C]" />
              <span>Calculando métricas analíticas y ranking de vendedores...</span>
            </div>
          ) : kpis ? (
            <>
              {/* 1. Tarjetas Principales de Desempeño */}
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
                    <span className="text-xs text-slate-200 ml-1.5 font-medium">liquidado</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, kpis.porcentajeLiquidadoGlobal)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-mono pt-1">
                    <span>Remanente: {kpis.totalStockActual} un.</span>
                    <span>Lote: {kpis.totalStockInicial} un.</span>
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
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>Descuentos aplicados:</span>
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
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">ventas</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
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
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">unidades</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>Rotación del inventario:</span>
                    <span className="font-bold text-emerald-600">Alta velocidad</span>
                  </div>
                </div>
              </div>

              {/* 2. Sección: DIAGRAMA DE PASTEL / DONUT CHART PROFESIONAL */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-[#081C6C] rounded-lg">
                      <PieChartIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Diagrama de Distribución &amp; Métricas Proporcionales
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Visualización gráfica de la participación por método de cobro o categorías de liquidación
                      </p>
                    </div>
                  </div>

                  {/* Selector de Modo del Pastel */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setPieMode("METODO");
                        setHoveredSlice(null);
                      }}
                      className={`px-3 py-1 rounded-lg transition ${
                        pieMode === "METODO"
                          ? "bg-white text-[#081C6C] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Métodos de Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPieMode("CATEGORIA");
                        setHoveredSlice(null);
                      }}
                      className={`px-3 py-1 rounded-lg transition ${
                        pieMode === "CATEGORIA"
                          ? "bg-white text-[#081C6C] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Categorías
                    </button>
                  </div>
                </div>

                {pieSegments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No se registran datos para generar el diagrama en este período.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Donut Chart SVG Interactivo */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                      <div className="relative w-56 h-56 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                          {/* Fondo del anillo */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#F1F5F9"
                            strokeWidth="12"
                          />

                          {/* Segmentos de Dona */}
                          {calculatedSegments.map((segment, idx) => {
                            const isHovered = hoveredSlice === idx;

                            return (
                              <circle
                                key={segment.label}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth={isHovered ? 15 : 12}
                                strokeDasharray={segment.strokeDasharray}
                                strokeDashoffset={segment.strokeDashoffset}
                                className="transition-all duration-300 cursor-pointer"
                                style={{
                                  opacity: hoveredSlice !== null && !isHovered ? 0.45 : 1,
                                }}
                                onMouseEnter={() => setHoveredSlice(idx)}
                                onMouseLeave={() => setHoveredSlice(null)}
                              />
                            );
                          })}
                        </svg>

                        {/* Centro del Donut con Información Dinámica */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                          {hoveredSlice !== null && pieSegments[hoveredSlice] ? (
                            <>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
                                {pieSegments[hoveredSlice].label}
                              </span>
                              <span className="text-base font-black text-slate-900 tabular-nums">
                                {pieMode === "METODO"
                                  ? formatPEN(pieSegments[hoveredSlice].value)
                                  : `${pieSegments[hoveredSlice].value} un.`}
                              </span>
                              <span
                                className="text-xs font-extrabold px-2 py-0.5 rounded-full mt-0.5 text-white shadow-xs"
                                style={{ backgroundColor: pieSegments[hoveredSlice].color }}
                              >
                                {pieSegments[hoveredSlice].percent}%
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {pieMode === "METODO" ? "Total Ventas" : "Total Unidades"}
                              </span>
                              <span className="text-lg font-black text-slate-900 tabular-nums">
                                {pieMode === "METODO"
                                  ? formatPEN(pieTotal)
                                  : `${pieTotal} un.`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                100% analizado
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 mt-2 font-medium">
                        Pasa el cursor sobre una rebanada para inspeccionar el valor
                      </span>
                    </div>

                    {/* Leyenda y Desglose Detallado */}
                    <div className="md:col-span-7 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pieSegments.map((segment, idx) => {
                          const isHovered = hoveredSlice === idx;
                          return (
                            <div
                              key={segment.label}
                              onMouseEnter={() => setHoveredSlice(idx)}
                              onMouseLeave={() => setHoveredSlice(null)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isHovered
                                  ? "border-[#081C6C] bg-blue-50/50 shadow-xs translate-x-1"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: segment.color }}
                                  />
                                  <span className="font-bold text-xs text-slate-800 truncate">
                                    {segment.label}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-900 tabular-nums shrink-0">
                                  {segment.percent}%
                                </span>
                              </div>

                              <div className="mt-1 flex items-baseline justify-between text-[11px] text-slate-500">
                                <span>{pieMode === "METODO" ? "Recaudado:" : "Desplazado:"}</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  {pieMode === "METODO"
                                    ? formatPEN(segment.value)
                                    : `${segment.value} unidades`}
                                </span>
                              </div>

                              {/* Barra de Progreso Interna */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${segment.percent}%`,
                                    backgroundColor: segment.color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Sección: RANKING DE VENDEDORES ("¿QUIÉN VENDE MÁS? - 4 VENDEDORES") */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span>Ranking de Vendedores — ¿Quién Vende Más?</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          Top 4 Vendedores
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Monitoreo de recaudación por caja, tickets emitidos y ticket promedio en Soles (S/.)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Total Ventas Vendedores
                    </span>
                    <strong className="text-sm font-black text-slate-900 tabular-nums">
                      {formatPEN(totalVentasVendedores)}
                    </strong>
                  </div>
                </div>

                {kpis.rankingVendedores.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No se registran ventas asociadas a vendedores en el período seleccionado.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.rankingVendedores.slice(0, 4).map((seller, index) => {
                      // Insignias y Medallas del Podio condicionales a tener ventas
                      const hasSales = seller.totalVendidoPEN > 0;
                      let medalIcon = <Users className="w-4 h-4 text-slate-400" />;
                      let medalBadge = "Caja en Espera";
                      let cardBorder = "border-slate-200";
                      let headerBg = "bg-slate-50 text-slate-600";
                      let rankBadge = "bg-slate-200 text-slate-700";

                      if (index === 0 && hasSales) {
                        medalIcon = <Crown className="w-5 h-5 text-amber-500 animate-pulse" />;
                        medalBadge = "🥇 1º Líder de Ventas";
                        cardBorder = "border-amber-300 ring-2 ring-amber-100";
                        headerBg = "bg-gradient-to-r from-amber-50 to-amber-100/70 text-amber-900";
                        rankBadge = "bg-amber-500 text-white shadow-xs";
                      } else if (index === 1 && hasSales) {
                        medalIcon = <Award className="w-4 h-4 text-slate-400" />;
                        medalBadge = "🥈 2º Segundo Lugar";
                        cardBorder = "border-slate-300";
                        headerBg = "bg-slate-100/80 text-slate-800";
                        rankBadge = "bg-slate-400 text-white shadow-xs";
                      } else if (index === 2 && hasSales) {
                        medalIcon = <Award className="w-4 h-4 text-amber-700" />;
                        medalBadge = "🥉 3º Tercer Lugar";
                        cardBorder = "border-amber-200";
                        headerBg = "bg-amber-50/50 text-amber-800";
                        rankBadge = "bg-amber-700 text-white shadow-xs";
                      } else if (hasSales) {
                        medalIcon = <Award className="w-4 h-4 text-slate-400" />;
                        medalBadge = `${index + 1}º Lugar`;
                        cardBorder = "border-slate-200";
                        headerBg = "bg-slate-50 text-slate-700";
                        rankBadge = "bg-slate-200 text-slate-700";
                      }

                      const relativeProgress =
                        topSellerAmount > 0
                          ? Math.round((seller.totalVendidoPEN / topSellerAmount) * 100)
                          : 0;

                      return (
                        <div
                          key={seller.usuarioId}
                          className={`bg-white rounded-2xl border ${cardBorder} shadow-xs overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5`}
                        >
                          {/* Banner de Medalla y Posición */}
                          <div className={`px-3.5 py-2 flex items-center justify-between text-xs font-bold ${headerBg}`}>
                            <span className="flex items-center gap-1.5">{medalBadge}</span>
                            {medalIcon}
                          </div>

                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            {/* Información del Vendedor */}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${rankBadge}`}
                                >
                                  {index + 1}
                                </span>
                                <h4
                                  className="font-bold text-xs text-slate-900 leading-snug truncate"
                                  title={seller.nombre}
                                >
                                  {seller.nombre}
                                </h4>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block pl-8">
                                Rol: {seller.rol}
                              </span>
                            </div>

                            {/* Cifra de Ventas en Soles */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                                Total Recaudado (S/.)
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xl font-black text-[#081C6C] tabular-nums">
                                  {formatPEN(seller.totalVendidoPEN)}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {seller.porcentajeTotal}% del total
                                </span>
                              </div>

                              {/* Barra de progreso comparativa con el líder */}
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className="bg-[#081C6C] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${relativeProgress}%` }}
                                />
                              </div>
                            </div>

                            {/* Métricas Secundarias: Tickets y Ticket Promedio */}
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Tickets:</span>
                                <span className="font-bold text-slate-800 tabular-nums">
                                  {seller.totalTickets} ventas
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">Promedio:</span>
                                <span className="font-bold text-slate-800 tabular-nums font-mono text-[11px]">
                                  {formatPEN(seller.ticketPromedioPEN)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Tablas: Top Más Vendidos y Top Lenta Rotación (Huesos) */}
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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              Actualización en tiempo real &bull; Moneda Oficial: <strong>Soles Peruanos (S/.)</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            Cerrar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
