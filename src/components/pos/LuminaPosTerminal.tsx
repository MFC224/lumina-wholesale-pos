"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { UserProfile } from "@/types/auth";
import { PaymentMethod, DiscountType } from "@/types/sales";
import { formatPEN } from "@/lib/utils";
import {
  calculateCartFinancials,
  QUICK_DISCOUNTS,
  BILLETES_PERU,
} from "@/lib/pos/calculations";
import { searchInMemoryCatalog, SearchableProduct, SearchableVariant } from "@/lib/pos/search";
import { printThermalReceipt } from "@/lib/pos/thermal-receipt";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  X,
  Loader2,
  Tag,
} from "lucide-react";

export interface CartItem {
  varianteId: string;
  productoId: string;
  nombre: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  precioUnitario: number;
  cantidad: number;
  stockDisponible: number;
}

interface LuminaPosTerminalProps {
  currentUser: UserProfile;
  catalog: SearchableProduct[];
  onSaleCompleted?: () => void;
}

export function LuminaPosTerminal({
  currentUser,
  catalog,
  onSaleCompleted,
}: LuminaPosTerminalProps) {
  // Estado de búsqueda y catálogo
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estado del carrito de venta
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("NINGUNO");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Estado de procesamiento y modal de ticket
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState<string>("Público General");
  const [customerDoc, setCustomerDoc] = useState<string>("");

  const playScannerBeep = () => {
    try {
      if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Audio no permitido o silenciado
    }
  };

  const handlePrintReceipt = useCallback(() => {
    if (!completedSale) return;
    const items = (completedSale.detalles || completedSale.items || []).map((i: any) => ({
      nombre: i.nombre || i.nombreProducto || "Artículo",
      sku: i.sku || "SKU",
      talla: i.talla,
      color: i.color,
      cantidad: i.cantidad || 1,
      precioUnitario: i.precioUnitario || 0,
      subtotal: (i.cantidad || 1) * (i.precioUnitario || 0),
    }));

    printThermalReceipt({
      numeroTicket: completedSale.numeroTicket,
      cajeroNombre: currentUser.nombre,
      metodoPago: completedSale.metodoPago,
      subtotal: completedSale.subtotal || completedSale.total,
      descuento: completedSale.descuento || 0,
      tipoDescuento: completedSale.tipoDescuento,
      total: completedSale.total,
      montoRecibido: completedSale.montoRecibido ?? completedSale.financials?.montoRecibido,
      vuelto: completedSale.vuelto ?? completedSale.financials?.vuelto,
      clienteNombre: completedSale.clienteNombre || customerName,
      clienteDocumento: completedSale.clienteDocumento || customerDoc,
      items,
      fecha: completedSale.createdAt || new Date(),
    });
  }, [completedSale, currentUser, customerName, customerDoc]);

  // Filtrado difuso en memoria (0ms)
  const filteredProducts = searchInMemoryCatalog(catalog, searchQuery, {
    categoriaNombre: selectedCategory === "TODAS" ? undefined : selectedCategory,
  });

  // Extraer lista única de categorías para los filtros
  const categories = ["TODAS", ...Array.from(new Set(catalog.map((p) => p.categoriaNombre || "General")))];

  // Cálculos financieros en Soles (S/.)
  const financials = calculateCartFinancials(
    cart.map((c) => ({
      varianteId: c.varianteId,
      cantidad: c.cantidad,
      precioUnitario: c.precioUnitario,
    })),
    {
      descuentoValor: discountValue,
      tipoDescuento: discountType,
      metodoPago: paymentMethod,
      montoRecibido: cashReceived,
    }
  );

  // Auto-ajustar efectivo recibido al total si se cambia a efectivo y no se ha digitado nada
  useEffect(() => {
    if (cashReceived === 0 && financials.total > 0 && paymentMethod === "EFECTIVO") {
      setCashReceived(financials.total);
    }
  }, [financials.total, paymentMethod, cashReceived]);

  // Atajos globales de teclado (Keyboard-First POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 o P para imprimir ticket térmico si el modal de venta exitosa está visible
      if (completedSale && (e.key === "F11" || e.key.toLowerCase() === "p")) {
        e.preventDefault();
        handlePrintReceipt();
        return;
      }
      // F2 o '/' para enfocar buscador
      if (e.key === "F2" || (e.key === "/" && document.activeElement !== searchInputRef.current)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F4 para cobro directo
      else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0 && !isProcessing && financials.esMontoSuficiente) {
          handleExecuteSale();
        }
      }
      // F9 para seleccionar pago en Efectivo
      else if (e.key === "F9") {
        e.preventDefault();
        setPaymentMethod("EFECTIVO");
      }
      // F10 para seleccionar pago digital (Yape)
      else if (e.key === "F10") {
        e.preventDefault();
        setPaymentMethod("YAPE");
      }
      // Esc para limpiar búsqueda o cerrar modales
      else if (e.key === "Escape") {
        if (completedSale) {
          setCompletedSale(null);
        } else if (searchQuery) {
          setSearchQuery("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Agregar variante al carrito
  const addToCart = (product: SearchableProduct, variant: SearchableVariant) => {
    if (variant.stockActual <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.varianteId === variant.id);
      if (existing) {
        if (existing.cantidad >= variant.stockActual) {
          setErrorMessage(`No puedes añadir más de ${variant.stockActual} unidades disponibles de esta variante.`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.varianteId === variant.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            varianteId: variant.id,
            productoId: product.id,
            nombre: product.nombre,
            sku: variant.sku,
            talla: variant.talla,
            color: variant.color,
            precioUnitario: product.precioLiquidacion,
            cantidad: 1,
            stockDisponible: variant.stockActual,
          },
        ];
      }
    });
  };

  // Detección y adición por pistola lectora de código de barras o Enter directo
  const handleBarcodeOrEnter = (query: string) => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;

    let foundProd: SearchableProduct | null = null;
    let foundVar: SearchableVariant | null = null;

    for (const prod of catalog) {
      const v = prod.variantes.find(
        (vr) =>
          vr.sku.toUpperCase() === trimmed ||
          (prod.codigoSku && prod.codigoSku.toUpperCase() === trimmed)
      );
      if (v) {
        foundProd = prod;
        foundVar = v;
        break;
      }
    }

    if (!foundVar && filteredProducts.length === 1 && filteredProducts[0].variantes.length === 1) {
      foundProd = filteredProducts[0];
      foundVar = foundProd.variantes[0];
    }

    if (foundProd && foundVar) {
      if (foundVar.stockActual > 0) {
        playScannerBeep();
        addToCart(foundProd, foundVar);
        setSearchQuery("");
      } else {
        setErrorMessage(`El artículo ${foundVar.sku} está AGOTADO.`);
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  };

  // Modificar cantidad en carrito
  const updateQuantity = (varianteId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.varianteId === varianteId) {
            const newQty = item.cantidad + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stockDisponible) {
              setErrorMessage(`Stock máximo alcanzado (${item.stockDisponible} un.)`);
              setTimeout(() => setErrorMessage(null), 2500);
              return item;
            }
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Quitar ítem
  const removeFromCart = (varianteId: string) => {
    setCart((prev) => prev.filter((item) => item.varianteId !== varianteId));
  };

  // Limpiar carrito completo
  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType("NINGUNO");
    setCashReceived(0);
    setErrorMessage(null);
  };

  // Ejecutar venta transaccional
  const handleExecuteSale = async () => {
    if (cart.length === 0 || isProcessing) return;

    if (paymentMethod === "EFECTIVO" && !financials.esMontoSuficiente) {
      setErrorMessage(`El monto recibido (S/. ${cashReceived.toFixed(2)}) es insuficiente para cubrir S/. ${financials.total.toFixed(2)}.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map((c) => ({
          varianteId: c.varianteId,
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
        })),
        metodoPago: paymentMethod,
        descuento: financials.descuentoMonto,
        tipoDescuento: discountType,
        montoRecibido: financials.montoRecibido,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.venta) {
        setCompletedSale({
          ...data.venta,
          items: [...cart],
          financials: { ...financials },
          clienteNombre: customerName,
          clienteDocumento: customerDoc,
        });
        clearCart();
        if (onSaleCompleted) onSaleCompleted();
      } else {
        setErrorMessage(data.error || "Error al procesar la transacción.");
      }
    } catch {
      setErrorMessage("Error de conexión al procesar la venta.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* ========================================================================= */}
      {/* PANEL IZQUIERDO (7 Columnas): Catálogo y Búsqueda en 0ms                 */}
      {/* ========================================================================= */}
      <div className="lg:col-span-7 space-y-4 flex flex-col">
        {/* Buscador Universal F2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleBarcodeOrEnter(searchQuery);
                }
              }}
              placeholder="Escanear código de barras con pistola láser o buscar... (F2)"
              className="w-full pl-11 pr-24 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#081C6C] text-slate-900 font-medium"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
              F2 · Enter
            </span>
          </div>

          {/* Filtros de Categorías Rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-[#081C6C] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Productos y Variantes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1 min-h-[480px] max-h-[600px] overflow-y-auto space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No se encontraron coincidencias para la búsqueda.
            </div>
          ) : (
            filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition space-y-2.5"
              >
                {/* Cabecera del producto */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{prod.nombre}</h4>
                    <span className="text-[11px] font-mono text-slate-400">SKU: {prod.codigoSku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#081C6C] tabular-nums block">
                      {formatPEN(prod.precioLiquidacion)}
                    </span>
                    {prod.precioOriginal && prod.precioOriginal > prod.precioLiquidacion && (
                      <span className="text-[10px] text-slate-400 line-through tabular-nums">
                        {formatPEN(prod.precioOriginal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Variantes disponibles para agregar con 1 click */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {prod.variantes.map((v) => {
                    const isCritico = v.stockActual > 0 && v.stockActual <= 3;
                    const isAgotado = v.stockActual <= 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isAgotado}
                        onClick={() => addToCart(prod, v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                          isAgotado
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                            : isCritico
                            ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                            : "bg-white text-slate-700 border-slate-200 hover:border-[#081C6C] hover:text-[#081C6C]"
                        }`}
                      >
                        <span>
                          {v.talla && v.talla !== "Única" ? v.talla : ""}
                          {v.color && v.color !== "Estándar" ? ` · ${v.color}` : ""}
                          {!v.talla && !v.color ? "Unidad" : ""}
                        </span>

                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                            isAgotado
                              ? "bg-slate-200 text-slate-500"
                              : isCritico
                              ? "bg-red-200/80 text-red-800 animate-stock-critical"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {v.stockActual}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL DERECHO (5 Columnas): Carrito, Descuentos y Cobro (S/.)           */}
      {/* ========================================================================= */}
      <div className="lg:col-span-5 space-y-4 flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          {/* Header Carrito */}
          <div className="p-4 bg-[#081C6C] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm">Ticket de Venta Actual</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-lg text-slate-200 tabular-nums">
                {financials.totalArticulos} {financials.totalArticulos === 1 ? "artículo" : "artículos"}
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition"
                  title="Limpiar Carrito"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mensajes de Alerta */}
          {errorMessage && (
            <div className="m-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Lista de Ítems en Carrito */}
          <div className="p-4 overflow-y-auto flex-1 max-h-56 divide-y divide-slate-100 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Seleccione productos a la izquierda para iniciar la venta.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.varianteId} className="pt-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{item.nombre}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {item.talla ? `${item.talla} · ` : ""}
                      {item.color ? `${item.color} · ` : ""}
                      {formatPEN(item.precioUnitario)}
                    </p>
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.varianteId, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-800 tabular-nums">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.varianteId, 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-[#081C6C] w-16 text-right tabular-nums">
                    {formatPEN(item.precioUnitario * item.cantidad)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Descuentos Rápidos (Porcentaje % o Monto Fijo en Soles S/.) */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Descuento de Remate
                </span>
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType(discountValue > 0 ? "PORCENTAJE" : "NINGUNO");
                    }}
                    className={`px-2 py-0.5 rounded transition ${
                      discountType === "PORCENTAJE" || (discountType === "NINGUNO" && discountValue === 0)
                        ? "bg-white text-[#081C6C] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("MONTO_FIJO");
                      if (discountValue === 0) setDiscountValue(5);
                    }}
                    className={`px-2 py-0.5 rounded transition ${
                      discountType === "MONTO_FIJO"
                        ? "bg-white text-[#081C6C] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monto Fijo (S/.)
                  </button>
                </div>
              </div>

              {discountType === "MONTO_FIJO" ? (
                /* Selector de Monto Fijo en Soles */
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("NINGUNO");
                      setDiscountValue(0);
                    }}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition ${
                      discountValue === 0
                        ? "bg-[#081C6C] text-white border-[#081C6C]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Sin Desc.
                  </button>
                  {[5, 10, 15, 20, 50].map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() => {
                        setDiscountType("MONTO_FIJO");
                        setDiscountValue(monto);
                      }}
                      className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition ${
                        discountType === "MONTO_FIJO" && discountValue === monto
                          ? "bg-[#081C6C] text-white border-[#081C6C]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      -S/. {monto}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500 font-bold">S/.</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={discountType === "MONTO_FIJO" && discountValue > 0 ? discountValue : ""}
                      placeholder="Libre"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiscountType(val > 0 ? "MONTO_FIJO" : "NINGUNO");
                        setDiscountValue(val);
                      }}
                      className="w-16 px-1.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#081C6C]"
                    />
                  </div>
                </div>
              ) : (
                /* Selector de Porcentaje */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_DISCOUNTS.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        setDiscountType(d.type);
                        setDiscountValue(d.value);
                      }}
                      className={`py-1 px-2.5 rounded-lg text-xs font-bold border transition ${
                        discountType === d.type && discountValue === d.value
                          ? "bg-[#081C6C] text-white border-[#081C6C]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={discountType === "PORCENTAJE" && discountValue > 0 ? discountValue : ""}
                      placeholder="Libre"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiscountType(val > 0 ? "PORCENTAJE" : "NINGUNO");
                        setDiscountValue(Math.min(100, val));
                      }}
                      className="w-16 px-1.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#081C6C]"
                    />
                    <span className="text-[11px] text-slate-500 font-bold">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Método de Pago */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Método de Pago
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(["EFECTIVO", "YAPE", "PLIN", "TARJETA"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      paymentMethod === m
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Identificación de Cliente (Opcional) */}
            <div className="pt-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Cliente / Comprobante (Opcional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="DNI / RUC"
                  value={customerDoc}
                  onChange={(e) => setCustomerDoc(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#081C6C]"
                />
                <input
                  type="text"
                  placeholder="Nombre Cliente"
                  value={customerName === "Público General" && customerDoc ? "" : customerName}
                  onChange={(e) => setCustomerName(e.target.value || "Público General")}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#081C6C]"
                />
              </div>
            </div>

            {/* Billetes rápidos en Soles para pago en efectivo */}
            {paymentMethod === "EFECTIVO" && financials.total > 0 && (
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block mb-1">
                  Efectivo entregado por cliente:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCashReceived(financials.total)}
                    className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    Exacto
                  </button>
                  {BILLETES_PERU.map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setCashReceived(billete)}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${
                        cashReceived === billete
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      S/. {billete}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={cashReceived || ""}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    placeholder="Otro..."
                    className="w-20 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Desglose Contable y Vuelto */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums font-semibold">{formatPEN(financials.subtotal)}</span>
              </div>
              {financials.descuentoMonto > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento aplicado:</span>
                  <span className="tabular-nums font-bold">-{formatPEN(financials.descuentoMonto)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span className="tabular-nums text-[#081C6C] text-lg">{formatPEN(financials.total)}</span>
              </div>

              {paymentMethod === "EFECTIVO" && financials.total > 0 && (
                <div className="flex justify-between text-xs pt-1 text-slate-500">
                  <span>Vuelto a entregar:</span>
                  <span
                    className={`font-extrabold tabular-nums text-sm ${
                      financials.esMontoSuficiente ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {financials.esMontoSuficiente
                      ? formatPEN(financials.vuelto)
                      : `Faltan ${formatPEN(financials.total - cashReceived)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Botón Principal de Cobro [F4] */}
            <button
              type="button"
              disabled={
                cart.length === 0 ||
                isProcessing ||
                (paymentMethod === "EFECTIVO" && !financials.esMontoSuficiente)
              }
              onClick={handleExecuteSale}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando Venta...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>COBRAR {formatPEN(financials.total)}</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">F4</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE TICKET / COMPROBANTE DE VENTA GENERADO                           */}
      {/* ========================================================================= */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">¡Venta Exitosa!</h3>
              <p className="text-xs font-mono text-slate-500">Ticket: {completedSale.numeroTicket}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600 border border-slate-100">
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span className="font-semibold text-slate-800">{currentUser.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span>Método de Pago:</span>
                <span className="font-bold text-slate-800">{completedSale.metodoPago}</span>
              </div>
              {completedSale.descuento > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Descuento Aplicado:</span>
                  <span className="font-bold tabular-nums">-{formatPEN(completedSale.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5 font-bold">
                <span className="text-slate-900">Total Cobrado:</span>
                <span className="text-[#081C6C] text-sm tabular-nums">
                  {formatPEN(completedSale.total)}
                </span>
              </div>
              {completedSale.metodoPago === "EFECTIVO" && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <div className="flex justify-between text-slate-700">
                    <span>Dinero Recibido:</span>
                    <span className="font-bold tabular-nums">
                      {formatPEN(completedSale.montoRecibido ?? completedSale.financials?.montoRecibido ?? completedSale.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <span>Vuelto Entregado:</span>
                    <span className="tabular-nums text-sm">
                      {formatPEN(completedSale.vuelto ?? completedSale.financials?.vuelto ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                title="Imprimir ticket térmico en 80mm o 58mm (F11 / P)"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket Térmico (F11 / P)</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Nueva Venta (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
