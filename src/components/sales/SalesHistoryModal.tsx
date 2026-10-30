"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@/types/auth";
import { formatPEN } from "@/lib/utils";
import { printThermalReceipt } from "@/lib/pos/thermal-receipt";
import {
  Receipt,
  X,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Clock,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Printer,
  ChevronDown,
  ChevronUp,
  PackageMinus,
  Sparkles,
} from "lucide-react";

interface SaleDetail {
  id: string;
  nombreProducto: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface SaleItem {
  id: string;
  numeroTicket: string;
  cajero: string;
  rolCajero: string;
  total: number;
  subtotal: number;
  descuento: number;
  tipoDescuento?: string;
  metodoPago: string;
  montoRecibido: number;
  vuelto: number;
  estado: "COMPLETADA" | "ANULADA";
  anuladoPor?: string;
  motivoAnulacion?: string;
  createdAt: string;
  itemsCount: number;
  detalles: SaleDetail[];
}

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaleVoided?: () => void;
}

export function SalesHistoryModal({
  isOpen,
  onClose,
  currentUser,
  onSaleVoided,
}: SalesHistoryModalProps) {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

  // Anulación total
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [voidMotivo, setVoidMotivo] = useState("");
  const [processingVoid, setProcessingVoid] = useState(false);

  // Devolución parcial de ítem
  const [refundingItem, setRefundingItem] = useState<{
    sale: SaleItem;
    detail: SaleDetail;
  } | null>(null);
  const [refundQuantity, setRefundQuantity] = useState<number>(1);
  const [refundMotivo, setRefundMotivo] = useState<string>("");
  const [processingRefund, setProcessingRefund] = useState(false);
  const [lastRefundVoucher, setLastRefundVoucher] = useState<any | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSales(data.ventas || []);
        }
      }
    } catch {
      // Error silencioso en fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSales();
      setExpandedSaleIds(new Set());
      setVoidingSaleId(null);
      setRefundingItem(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setLastRefundVoucher(null);
    }
  }, [isOpen, fetchSales]);

  if (!isOpen) return null;

  const toggleExpand = (saleId: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingSaleId || !voidMotivo.trim()) return;

    setProcessingVoid(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/sales/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventaId: voidingSaleId,
          motivo: voidMotivo.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("¡Venta anulada con éxito! El inventario ha sido restaurado en Kardex.");
        setVoidingSaleId(null);
        setVoidMotivo("");
        fetchSales();
        if (onSaleVoided) onSaleVoided();
      } else {
        setErrorMsg(data.error || "No se pudo anular la venta");
      }
    } catch {
      setErrorMsg("Error de conexión al procesar la anulación");
    } finally {
      setProcessingVoid(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingItem || !refundMotivo.trim() || refundQuantity <= 0) return;

    setProcessingRefund(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/sales/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventaId: refundingItem.sale.id,
          detalleId: refundingItem.detail.id,
          cantidad: refundQuantity,
          motivo: refundMotivo.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const dev = data.devolucion;
        setSuccessMsg(
          `¡Devolución exitosa! Reembolso de ${formatPEN(dev.montoReembolso)} registrado. Stock restaurado a ${dev.nuevoStock} un.`
        );

        // Preparar voucher para imprimir
        setLastRefundVoucher({
          numeroTicket: refundingItem.sale.numeroTicket,
          cajeroNombre: currentUser.nombre,
          fecha: new Date(),
          metodoPago: refundingItem.sale.metodoPago,
          subtotal: dev.montoReembolso,
          total: dev.montoReembolso,
          esDevolucion: true,
          montoDevolucion: dev.montoReembolso,
          motivoDevolucion: refundMotivo.trim(),
          items: [
            {
              nombre: `[DEVOLUCIÓN] ${refundingItem.detail.nombreProducto}`,
              sku: refundingItem.detail.sku,
              talla: refundingItem.detail.talla,
              color: refundingItem.detail.color,
              cantidad: dev.cantidadDevuelta,
              precioUnitario: dev.precioUnitario,
              subtotal: dev.montoReembolso,
            },
          ],
        });

        setRefundingItem(null);
        setRefundMotivo("");
        setRefundQuantity(1);
        fetchSales();
        if (onSaleVoided) onSaleVoided();
      } else {
        setErrorMsg(data.error || "No se pudo procesar la devolución");
      }
    } catch {
      setErrorMsg("Error de conexión al procesar la devolución");
    } finally {
      setProcessingRefund(false);
    }
  };

  const handlePrintSale = (sale: SaleItem) => {
    printThermalReceipt({
      numeroTicket: sale.numeroTicket,
      cajeroNombre: sale.cajero,
      fecha: sale.createdAt,
      metodoPago: sale.metodoPago,
      subtotal: sale.subtotal,
      descuento: sale.descuento,
      tipoDescuento: sale.tipoDescuento,
      total: sale.total,
      montoRecibido: sale.montoRecibido,
      vuelto: sale.vuelto,
      anulada: sale.estado === "ANULADA",
      motivoAnulacion: sale.motivoAnulacion,
      items: (sale.detalles || []).map((d) => ({
        nombre: d.nombreProducto,
        sku: d.sku,
        talla: d.talla,
        color: d.color,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal,
      })),
    });
  };

  const handlePrintLastRefund = () => {
    if (lastRefundVoucher) {
      printThermalReceipt(lastRefundVoucher);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#081C6C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Historial de Tickets y Auditoría de Ventas</h2>
              <p className="text-xs text-slate-300">
                Consulta de tickets, anulación total y devoluciones parciales de ítems
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              {lastRefundVoucher && (
                <button
                  type="button"
                  onClick={handlePrintLastRefund}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprobante</span>
                </button>
              )}
            </div>
          )}

          {/* Formulario modal de anulación si se seleccionó un ticket */}
          {voidingSaleId && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Anulación de Ticket Completo (Restaurará inventario en Kardex)</span>
              </div>
              <form onSubmit={handleVoidSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo obligatorio de la anulación:
                  </label>
                  <input
                    type="text"
                    required
                    value={voidMotivo}
                    onChange={(e) => setVoidMotivo(e.target.value)}
                    placeholder="Ej. Error en forma de pago, cliente canceló en empaque, etc."
                    className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoidingSaleId(null);
                      setVoidMotivo("");
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processingVoid || !voidMotivo.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow disabled:opacity-50"
                  >
                    {processingVoid ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    Confirmar Anulación
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Formulario modal de Devolución Parcial de Ítem */}
          {refundingItem && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <PackageMinus className="w-4 h-4 text-[#081C6C]" />
                  <span>
                    Devolución Parcial de Ítem &bull; Ticket #{refundingItem.sale.numeroTicket}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {refundingItem.detail.sku}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs space-y-1">
                <p className="font-bold text-slate-800">{refundingItem.detail.nombreProducto}</p>
                <div className="flex items-center gap-4 text-slate-600 text-[11px]">
                  <span>
                    Variante: {refundingItem.detail.talla || "Estándar"} / {refundingItem.detail.color || "Único"}
                  </span>
                  <span>Compradas: <strong>{refundingItem.detail.cantidad} un.</strong></span>
                  <span>Precio Unitario: <strong>{formatPEN(refundingItem.detail.precioUnitario)}</strong></span>
                </div>
              </div>

              <form onSubmit={handleRefundSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cantidad a devolver:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={refundingItem.detail.cantidad}
                      value={refundQuantity}
                      onChange={(e) => setRefundQuantity(Math.max(1, Math.min(refundingItem.detail.cantidad, Number(e.target.value))))}
                      className="w-full text-xs p-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081C6C] font-bold text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Motivo obligatorio de devolución:
                    </label>
                    <input
                      type="text"
                      required
                      value={refundMotivo}
                      onChange={(e) => setRefundMotivo(e.target.value)}
                      placeholder="Ej. Talla inadecuada, costura defectuosa, etc."
                      className="w-full text-xs p-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-600">
                    Reembolso proporcional estimado:{" "}
                    <strong className="text-emerald-700 font-extrabold text-sm">
                      {formatPEN(
                        (refundQuantity * refundingItem.detail.precioUnitario) *
                          (refundingItem.sale.subtotal > 0
                            ? refundingItem.sale.total / refundingItem.sale.subtotal
                            : 1)
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRefundingItem(null);
                        setRefundMotivo("");
                        setRefundQuantity(1);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={processingRefund || !refundMotivo.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#081C6C] hover:bg-[#061552] rounded-lg shadow disabled:opacity-50"
                    >
                      {processingRefund ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PackageMinus className="w-3.5 h-3.5" />
                      )}
                      Procesar Devolución
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tabla de ventas */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#081C6C]" />
              <span>Cargando tickets de venta...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No hay ventas registradas aún en el sistema.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">N° Ticket</th>
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Cajero</th>
                    <th className="py-2.5 px-3">Método</th>
                    <th className="py-2.5 px-3">Total Soles</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => {
                    const isAnulada = sale.estado === "ANULADA";
                    const isExpanded = expandedSaleIds.has(sale.id);

                    return (
                      <React.Fragment key={sale.id}>
                        <tr className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => toggleExpand(sale.id)}
                              className="flex items-center gap-1 font-mono font-bold text-[#081C6C] hover:text-blue-800 transition"
                              title="Ver detalle de ítems comprados"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{sale.numeroTicket}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(sale.createdAt).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {sale.cajero}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">
                              {sale.metodoPago}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900 tabular-nums">
                            {formatPEN(sale.total)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAnulada ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                <Ban className="w-3 h-3" /> ANULADA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETADA
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handlePrintSale(sale)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-xs"
                                title="Reimprimir ticket térmico en 80mm/58mm"
                              >
                                <Printer className="w-3 h-3 text-slate-500" />
                                <span>Reimprimir</span>
                              </button>

                              {!isAnulada && (
                                currentUser.rol === "ADMIN" ? (
                                  <button
                                    onClick={() => {
                                      setVoidingSaleId(sale.id);
                                      setVoidMotivo("");
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition"
                                    title="Anular ticket completo y restituir todo el stock"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Anular
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Solo Admin
                                  </span>
                                )
                              )}
                              {isAnulada && sale.motivoAnulacion && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[120px] text-right" title={sale.motivoAnulacion}>
                                  {sale.motivoAnulacion}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Desglose de Ítems del Ticket al expandir */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={7} className="p-3 pl-8">
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold border-b pb-1.5">
                                  <span>Ítems en este ticket ({sale.detalles.length}):</span>
                                  <span>Subtotal: {formatPEN(sale.subtotal)} | Descuento: {formatPEN(sale.descuento)}</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {sale.detalles.map((det) => (
                                    <div
                                      key={det.id}
                                      className="py-2 flex items-center justify-between gap-4 text-xs"
                                    >
                                      <div className="flex-1">
                                        <p className="font-bold text-slate-900">{det.nombreProducto}</p>
                                        <span className="text-[11px] text-slate-500 font-mono">
                                          SKU: {det.sku} {det.talla ? `· Talla: ${det.talla}` : ""} {det.color ? `· Color: ${det.color}` : ""}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-extrabold text-slate-900">
                                          {det.cantidad} un. x {formatPEN(det.precioUnitario)}
                                        </span>
                                        <span className="block text-[11px] font-mono text-slate-500">
                                          = {formatPEN(det.subtotal)}
                                        </span>
                                      </div>

                                      {/* Acción de devolución parcial */}
                                      {!isAnulada && (
                                        <div>
                                          {currentUser.rol === "ADMIN" ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRefundingItem({ sale, detail: det });
                                                setRefundQuantity(1);
                                                setRefundMotivo("");
                                              }}
                                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition shadow-xs"
                                              title="Devolver este producto parcialmente al stock"
                                            >
                                              <PackageMinus className="w-3.5 h-3.5 text-amber-600" />
                                              <span>Devolver Ítem</span>
                                            </button>
                                          ) : (
                                            <span className="text-[10px] text-slate-400">Devolución solo Admin</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total tickets: <strong>{sales.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
