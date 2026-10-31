"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PinPad } from "@/components/auth/PinPad";
import { LuminaPosTerminal } from "@/components/pos/LuminaPosTerminal";
import { CatalogViewer } from "@/components/catalog/CatalogViewer";
import { BulkImporterModal } from "@/components/catalog/BulkImporterModal";
import { SalesHistoryModal } from "@/components/sales/SalesHistoryModal";
import { UnifiedReportsModal } from "@/components/reports/UnifiedReportsModal";
import { LiquidationDashboardModal } from "@/components/analytics/LiquidationDashboardModal";
import { KardexAuditModal } from "@/components/kardex/KardexAuditModal";
import { RealtimeAlertsBanner } from "@/components/realtime/RealtimeAlertsBanner";
import { StockSyncManager } from "@/lib/realtime/sync";
import { initSupabaseStockChannel } from "@/lib/realtime/supabase";
import { ConnectionStatus, RealtimeStockAlert } from "@/types/realtime";
import { UserProfile } from "@/types/auth";
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Layers,
} from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"pos" | "catalog">("pos");
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState<boolean>(false);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [isKardexOpen, setIsKardexOpen] = useState<boolean>(false);
  const closeModal = useCallback((setter: (v: boolean) => void) => {
    setter(false);
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("lumina:focus-search")), 60);
    }
  }, []);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("CONNECTED");
  const [liveAlert, setLiveAlert] = useState<RealtimeStockAlert | null>(null);

  const syncManagerRef = useRef<StockSyncManager>(new StockSyncManager([]));

  // Verificar sesión existente en cookie al cargar
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Sin sesión activa
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, []);

  // Cargar catálogo de productos y sincronizar con StockSyncManager
  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/catalog");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setCatalogItems(data.items);
          syncManagerRef.current.setProducts(data.items);
        }
      }
    } catch {
      // Error de red
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Inicializar suscripción en tiempo real WebSockets
  useEffect(() => {
    if (!currentUser) return;

    const manager = syncManagerRef.current;

    // Escuchar actualizaciones de stock en vivo
    const unsubStock = manager.onStockChange((updatedProds: any[]) => {
      setCatalogItems(updatedProds);
    });

    // Escuchar alertas críticas
    const unsubAlert = manager.onAlert((alert: RealtimeStockAlert) => {
      setLiveAlert(alert);
      // Auto-descartar toast después de 6 segundos
      setTimeout(() => {
        setLiveAlert((curr) => (curr?.id === alert.id ? null : curr));
      }, 6000);
    });

    // Escuchar estado de conexión
    const unsubConn = manager.onConnectionChange((status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    // Inicializar canal Supabase CDC
    const unsubSupabase = initSupabaseStockChannel(manager);

    return () => {
      unsubStock();
      unsubAlert();
      unsubConn();
      unsubSupabase();
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadCatalog();
    }
  }, [currentUser, loadCatalog]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setCurrentUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#081C6C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Iniciando terminal Import L&amp;R...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar Institucional Lumina (Formato Limpio en 1 Sola Línea) */}
      <header className="bg-gradient-to-r from-[#061655] via-[#081C6C] to-[#0A2688] text-white shadow-md sticky top-0 z-40 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Isotipo & Tipografía de Marca */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-10 px-2 py-1 bg-white rounded-xl shadow-xs border border-white/20 flex items-center justify-center">
            <img
              src="/logo-lr.png"
              alt="Logo Import L&R"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-2 leading-tight">
              <span className="bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
                Import L&amp;R
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
                Producción
              </span>
            </h1>
            <p className="text-[11px] text-slate-300/85 font-normal leading-none mt-0.5">
              Sistema Interno de Inventario y Ventas
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Navegación por pestañas (POS y Catálogo) */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs shrink-0">
              <button
                onClick={() => setActiveTab("pos")}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  activeTab === "pos"
                    ? "bg-white text-[#081C6C] shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Punto de Venta (POS)
              </button>
              <button
                onClick={() => setActiveTab("catalog")}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  activeTab === "catalog"
                    ? "bg-white text-[#081C6C] shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Catálogo &amp; Variantes
              </button>
            </div>

            {/* Botón de Historial de Ventas / Tickets */}
            <button
              onClick={() => setIsSalesHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/15 transition whitespace-nowrap shrink-0"
              title="Historial de tickets emitidos y anulaciones"
            >
              <span>Tickets</span>
            </button>

            {/* Botón Unificado de Reportes (Excel + Arqueo PDF) */}
            <button
              onClick={() => setIsReportsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/25 hover:bg-emerald-500 text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl border border-emerald-400/40 transition whitespace-nowrap shadow-sm shrink-0"
              title="Arqueo diario de caja en PDF y libro contable en Excel .xlsx"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Reportes</span>
            </button>

            {/* Botón de Dashboard de Métricas y Velocidad de Desplome */}
            <button
              onClick={() => setIsDashboardOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-blue-500/25 hover:bg-blue-600 text-blue-200 hover:text-white px-3 py-1.5 rounded-xl border border-blue-400/40 transition whitespace-nowrap shadow-sm shrink-0"
              title="Dashboard ejecutivo de rotación, velocidad de desplome y KPIs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              <span>Métricas</span>
            </button>

            {/* Botón de Kardex y Ajustes de Stock (Exclusivo Admin) */}
            {currentUser.rol === "ADMIN" && (
              <button
                onClick={() => setIsKardexOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/25 hover:bg-amber-600 text-amber-200 hover:text-white px-3 py-1.5 rounded-xl border border-amber-400/40 transition whitespace-nowrap shadow-sm shrink-0"
                title="Bitácora inmutable de Kardex y regularización de existencias"
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>Kardex</span>
              </button>
            )}

            {/* Badge de Rol */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 shrink-0 whitespace-nowrap">
              {currentUser.rol === "ADMIN" ? (
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              )}
              <div className="text-right text-xs leading-none">
                <span className="font-bold text-white block leading-tight">{currentUser.nombre}</span>
                <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
                  {currentUser.rol === "ADMIN" ? "ADMIN" : "CAJERO"}
                </span>
              </div>
            </div>

            {/* Botón de Bloqueo / Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white px-3 py-1.5 rounded-xl transition-colors duration-150 border border-red-500/30 whitespace-nowrap shrink-0"
              title="Bloquear sesión de caja"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        {!currentUser ? (
          <div className="w-full max-w-md mx-auto my-auto py-12">
            <PinPad
              onSuccess={handleLoginSuccess}
              title="Terminal de Caja — Import L&R"
              subtitle="Ingrese PIN de 4 dígitos (Prueba: Admin '9999' o Vendedor '1234')"
            />
            <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
              <p>Seguridad RBAC activa con encriptación bcrypt.</p>
              <p>Moneda de operación: <strong className="text-slate-600">Soles (S/.)</strong></p>
            </div>
          </div>
        ) : activeTab === "pos" ? (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Punto de Venta Interactivo &mdash; Import L&amp;R
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Atajos: F2 Buscar · F4 Cobrar
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Caja ultrarrápida, descuentos dinámicos por volumen en Soles (S/.) y control de concurrencia atómico
                </p>
              </div>

              <button
                onClick={loadCatalog}
                disabled={loadingCatalog}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? "animate-spin" : ""}`} />
                <span>Refrescar Stock</span>
              </button>
            </div>

            <LuminaPosTerminal
              currentUser={currentUser}
              catalog={catalogItems}
              onSaleCompleted={() => {
                loadCatalog();
              }}
            />
          </div>
        ) : activeTab === "catalog" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Catálogo de Liquidación y Matriz de Variantes (HU-06)
                </h2>
                <p className="text-xs text-slate-500">
                  Visualización de stock en tiempo real, velocidad de desplome (% liquidado) y alertas críticas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadCatalog}
                  disabled={loadingCatalog}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 shadow-sm transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            <CatalogViewer currentUser={currentUser} initialProducts={catalogItems} />
          </div>
        ) : (
          <div className="w-full space-y-4">
            <LuminaPosTerminal
              currentUser={currentUser}
              catalog={catalogItems}
              onSaleCompleted={() => {
                loadCatalog();
              }}
            />
          </div>
        )}
      </main>

      {/* Modal de Importación Masiva (Oculto en espera de archivo definitivo) */}
      <BulkImporterModal
        isOpen={isImporterOpen}
        onClose={() => closeModal(setIsImporterOpen)}
        onImportCompleted={() => {
          loadCatalog();
        }}
      />

      {/* Modal de Historial de Ventas y Anulación */}
      {currentUser && (
        <SalesHistoryModal
          isOpen={isSalesHistoryOpen}
          onClose={() => closeModal(setIsSalesHistoryOpen)}
          currentUser={currentUser}
          onSaleVoided={() => {
            loadCatalog();
          }}
        />
      )}

      {/* Modal Unificado de Reportes (Excel .xlsx + Arqueo Diario PDF) */}
      {currentUser && (
        <UnifiedReportsModal
          isOpen={isReportsOpen}
          onClose={() => closeModal(setIsReportsOpen)}
          currentUser={currentUser}
        />
      )}

      {/* Modal de Dashboard de Liquidación & KPIs */}
      {currentUser && (
        <LiquidationDashboardModal
          isOpen={isDashboardOpen}
          onClose={() => closeModal(setIsDashboardOpen)}
        />
      )}

      {/* Modal de Auditoría de Kardex & Ajustes de Inventario */}
      {currentUser && (
        <KardexAuditModal
          isOpen={isKardexOpen}
          onClose={() => closeModal(setIsKardexOpen)}
          currentUser={currentUser}
          catalog={catalogItems}
          onInventoryAdjusted={() => {
            loadCatalog();
          }}
        />
      )}

      {/* Banner flotante de alertas en tiempo real (<100ms) */}
      <RealtimeAlertsBanner
        alert={liveAlert}
        onDismiss={() => setLiveAlert(null)}
      />

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        Import L&amp;R POS &copy; {new Date().getFullYear()} &mdash; Moneda Oficial: Soles (S/.)
      </footer>
    </div>
  );
}
