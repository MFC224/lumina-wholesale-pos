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
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [voidMotivo, setVoidMotivo] = useState("");
  const [processingVoid, setProcessingVoid] = useState(false);
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
      // Error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSales();
      setSelectedSale(null);
      setVoidingSaleId(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, fetchSales]);

  if (!isOpen) return null;

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
                Consulta de ventas y anulación de tickets con restauración automática de stock
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
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario modal de anulación si se seleccionó un ticket */}
          {voidingSaleId && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Anulación de Ticket (Restaurará inventario en Kardex)</span>
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
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#081C6C]">
                          {sale.numeroTicket}
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
