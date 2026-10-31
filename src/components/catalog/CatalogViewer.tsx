"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types/auth";
import { formatPEN } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/catalog/images";
import {
  Search,
  Tag,
  AlertCircle,
  Package,
  Layers,
  Percent,
  CheckCircle2,
  TrendingDown,
  Sparkles,
} from "lucide-react";

interface VariantView {
  id?: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  ubicacion?: string | null;
  stockInicial: number;
  stockActual: number;
}

interface ProductView {
  id: string;
  nombre: string;
  descripcion?: string | null;
  codigoSku?: string | null;
  categoriaNombre?: string;
  precioOriginal: number;
  precioLiquidacion: number;
  costo?: number; // Solo si ADMIN
  imagenUrl?: string | null;
  variantes: VariantView[];
  metrics: {
    totalStockInicial: number;
    totalStockActual: number;
    unidadesLiquidadas: number;
    porcentajeLiquidado: number;
    estadoStockGlobal: string;
    tieneAlertaCritica: boolean;
  };
}

interface CatalogViewerProps {
  currentUser: UserProfile;
  initialProducts?: ProductView[];
}

export function CatalogViewer({ currentUser, initialProducts = [] }: CatalogViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);

  // Filtrado difuso en memoria (0ms)
  const filteredProducts = initialProducts.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const matchName = p.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(term);
    const matchSku = p.codigoSku?.toLowerCase().includes(term);
    const matchCategory = p.categoriaNombre?.toLowerCase().includes(term);
    const matchVariant = p.variantes.some(
      (v) =>
        v.sku.toLowerCase().includes(term) ||
        v.talla?.toLowerCase().includes(term) ||
        v.color?.toLowerCase().includes(term) ||
        v.ubicacion?.toLowerCase().includes(term)
    );

    return matchName || matchSku || matchCategory || matchVariant;
  });

  return (
    <div className="w-full space-y-6">
      {/* Barra de control y búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, SKU, talla, color o ubicación..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C] text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span>Mostrando <strong>{filteredProducts.length}</strong> productos</span>
          <span className="hidden md:inline text-slate-300">|</span>
          <span className="hidden md:inline">Búsqueda en memoria: <strong className="text-emerald-600">0ms</strong></span>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const isSelected = selectedProduct?.id === product.id;
          const { metrics } = product;

          return (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(isSelected ? null : product)}
              className={`cursor-pointer bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "ring-2 ring-[#081C6C] border-[#081C6C] shadow-md"
                  : "border-slate-200 hover:border-slate-300 shadow-sm hover:shadow"
              }`}
            >
              {/* Foto Cuadrada Fácil de Ver */}
              <div className="aspect-square w-full bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={getProductImageUrl(product)}
                  alt={product.nombre}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.classList.add("bg-gradient-to-br", "from-slate-100", "to-slate-200");
                    }
                  }}
                />
                <Package className="w-10 h-10 text-slate-300 absolute pointer-events-none -z-10" />

                <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold text-slate-900 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-xs">
                  {product.categoriaNombre || "Liquidación"}
                </span>

                {metrics.tieneAlertaCritica ? (
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-red-700 bg-white/95 px-2 py-0.5 rounded-full border border-red-300 animate-stock-critical shadow-xs">
                    <AlertCircle className="w-3 h-3 text-red-600" /> Stock Crítico (≤ 3)
                  </span>
                ) : metrics.totalStockActual === 0 ? (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-slate-600 bg-slate-200/95 px-2 py-0.5 rounded-full shadow-xs">
                    Agotado
                  </span>
                ) : (
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/95 px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {metrics.totalStockActual} un.
                  </span>
                )}
              </div>

              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                {/* Título y SKU */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                    {product.nombre}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    SKU Base: {product.codigoSku || "N/A"}
                  </p>
                </div>

                {/* Precios en Soles */}
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Remate Liquidación</span>
                    <span className="text-xl font-extrabold text-[#081C6C] tabular-nums">
                      {formatPEN(product.precioLiquidacion)}
                    </span>
                    {product.precioOriginal > product.precioLiquidacion && (
                      <span className="text-xs text-slate-400 line-through ml-2 tabular-nums">
                        {formatPEN(product.precioOriginal)}
                      </span>
                    )}
                  </div>

                  {/* Confidencial: Solo visible para ADMIN */}
                  {currentUser.rol === "ADMIN" && product.costo !== undefined && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block">
                        Costo Confidencial
                      </span>
                      <span className="text-xs font-bold text-slate-600 tabular-nums">
                        {formatPEN(product.costo)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barra de progreso de % Liquidado */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> % Liquidado:
                    </span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      {metrics.porcentajeLiquidado}% ({metrics.unidadesLiquidadas} de {metrics.totalStockInicial} un.)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, metrics.porcentajeLiquidado)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sección desplegable con matriz de variantes */}
              <div className="bg-slate-50 border-t border-slate-100 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-600 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {product.variantes.length} {product.variantes.length === 1 ? "Variante" : "Variantes"}
                  </span>
                  <span className="text-slate-400">Click para ver stock</span>
                </div>

                {isSelected && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-200">
                    {product.variantes.map((v) => (
                      <div
                        key={v.sku}
                        className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-slate-200/80 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">{v.sku}</span>
                          <span className="text-slate-700 font-medium">
                            {v.talla && v.talla !== "Única" ? `Talla: ${v.talla}` : ""}
                            {v.color && v.color !== "Estándar" ? ` · ${v.color}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">{v.ubicacion || "Almacén"}</span>
                          <span
                            className={`font-bold tabular-nums px-1.5 py-0.5 rounded text-[10px] ${
                              v.stockActual <= 0
                                ? "bg-slate-200 text-slate-600"
                                : v.stockActual <= 3
                                ? "bg-red-100 text-red-700 font-extrabold animate-stock-critical"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {v.stockActual} un.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron productos</h3>
          <p className="text-xs text-slate-400 mt-1">
            Intente con otro término de búsqueda o importe un lote en formato Excel/CSV.
          </p>
        </div>
      )}
    </div>
  );
}
