"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PinPad } from "@/components/auth/PinPad";
import { LuminaPosTerminal } from "@/components/pos/LuminaPosTerminal";
import { CatalogViewer } from "@/components/catalog/CatalogViewer";
import { BulkImporterModal } from "@/components/catalog/BulkImporterModal";
import { SalesHistoryModal } from "@/components/sales/SalesHistoryModal";
import { CashClosingModal } from "@/components/reports/CashClosingModal";
import { RealtimeConnectionBadge } from "@/components/realtime/RealtimeConnectionBadge";
import { RealtimeAlertsBanner } from "@/components/realtime/RealtimeAlertsBanner";
import { StockSyncManager } from "@/lib/realtime/sync";
import { initSupabaseStockChannel } from "@/lib/realtime/supabase";
import { ConnectionStatus, RealtimeStockAlert } from "@/types/realtime";
import { UserProfile } from "@/types/auth";
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Database,
  Lock,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  Terminal,
  RefreshCw,
  PlusCircle,
} from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"pos" | "catalog" | "terminal">("pos");
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState<boolean>(false);
  const [isCashClosingOpen, setIsCashClosingOpen] = useState<boolean>(false);
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
          <p className="text-sm font-medium text-slate-600">Iniciando terminal Lumina POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar Institucional Lumina */}
      <header className="bg-[#081C6C] text-white shadow-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-xl text-emerald-400 border border-white/15">
            L
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Lumina Wholesale & Liquidation
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Producción
              </span>
            </h1>
            <p className="text-xs text-slate-300 font-normal">
              Sistema Interno de Inventario y Caja de Remate
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            {/* Navegación por pestañas */}
            <div className="hidden md:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab("pos")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === "pos"
                    ? "bg-white text-[#081C6C] shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Punto de Venta (POS)
              </button>
              <button
                onClick={() => setActiveTab("catalog")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === "catalog"
                    ? "bg-white text-[#081C6C] shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Catálogo & Variantes
              </button>
              <button
                onClick={() => setActiveTab("terminal")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === "terminal"
                    ? "bg-white text-[#081C6C] shadow-sm"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Estado & RBAC
              </button>
            </div>

            {/* Botón de importación masiva (Admin) */}
            {currentUser.rol === "ADMIN" && (
              <button
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl shadow transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Excel/CSV</span>
              </button>
            )}

            {/* Botón de Historial de Ventas / Anulación */}
            <button
              onClick={() => setIsSalesHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/15 transition"
            >
              <span>Tickets</span>
            </button>

            {/* Botón de Arqueo y Cierre de Caja */}
            <button
              onClick={() => setIsCashClosingOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/15 transition"
            >
              <span>Arqueo (PDF)</span>
            </button>

            {/* Botón de Descarga Excel Contable */}
            <a
              href="/api/reports/excel"
              download
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl border border-emerald-500/40 transition"
              title="Descargar Reporte Ejecutivo en Excel .xlsx con fórmulas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </a>

            {/* Badge de Conexión en Tiempo Real Wi-Fi */}
            <RealtimeConnectionBadge status={connectionStatus} />

            {/* Badge de Rol */}
            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15">
              {currentUser.rol === "ADMIN" ? (
                <ShieldCheck className="w-4 h-4 text-amber-300" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-300" />
              )}
              <div className="text-right text-xs">
                <span className="font-bold text-white block leading-tight">{currentUser.nombre}</span>
                <span className="text-[10px] text-slate-300 font-medium">
                  {currentUser.rol === "ADMIN" ? "ADMINISTRADOR (Costos Visibles)" : "VENDEDOR (Modo Caja)"}
                </span>
              </div>
            </div>

            {/* Botón de Bloqueo / Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white px-3 py-1.5 rounded-xl transition-colors duration-150 border border-red-500/30"
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
              title="Terminal de Caja Lumina"
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
                  Punto de Venta Interactivo &mdash; Lumina Wholesale POS
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
          <div className="w-full space-y-6">
            {/* Panel de Estado y Resumen */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Terminal Activa: {currentUser.nombre}
                  </h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      currentUser.rol === "ADMIN"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    ROL: {currentUser.rol}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Sesión activa con token JWT seguro. Ocultamiento de costos vigente según perfil.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#081C6C] hover:bg-[#0E2A9E] rounded-xl transition"
                >
                  Ver Catálogo de Ventas
                </button>
              </div>
            </div>

            {/* Tarjetas de Cobertura de Fases */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Tarjeta 1 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fase 1 (10 Tests)
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">Prisma DB & PIN RBAC</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Modelado relacional completo, encriptación bcrypt y roles con aislamiento de costos.
                </p>
              </div>

              {/* Tarjeta 2 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fase 2 (20 Tests)
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">Variantes & Importador Excel</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Matriz de tallas/colores (HU-06), importador masivo (HU-07) y compresor WebP.
                </p>
              </div>

              {/* Tarjeta 3 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Siguiente: Fase 3
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">Motor Transaccional Atómico</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transacciones ACID con SELECT ... FOR UPDATE, Kardex inmutable y prevención de sobreventa.
                </p>
              </div>
            </div>

            {/* Panel de Políticas de Seguridad */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm tracking-wide text-white uppercase">
                  Políticas Activas de Seguridad para {currentUser.nombre} ({currentUser.rol})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1 font-sans font-semibold">Visualización de Costos:</span>
                  {currentUser.rol === "ADMIN" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      ✓ PERMITIDO (Costo de adquisición y margen visibles)
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1.5">
                      ✗ DENEGADO (Costos ocultos y eliminados de payloads)
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1 font-sans font-semibold">Importación Masiva Excel/CSV:</span>
                  {currentUser.rol === "ADMIN" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      ✓ HABILITADO (Carga y agrupación de variantes en base de datos)
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1.5">
                      ✗ DENEGADO (Función exclusiva de Administrador)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Importación Masiva */}
      <BulkImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportCompleted={() => {
          loadCatalog();
        }}
      />

      {/* Modal de Historial de Ventas y Anulación */}
      {currentUser && (
        <SalesHistoryModal
          isOpen={isSalesHistoryOpen}
          onClose={() => setIsSalesHistoryOpen(false)}
          currentUser={currentUser}
          onSaleVoided={() => {
            loadCatalog();
          }}
        />
      )}

      {/* Modal de Arqueo y Cierre Diario de Caja */}
      {currentUser && (
        <CashClosingModal
          isOpen={isCashClosingOpen}
          onClose={() => setIsCashClosingOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Banner flotante de alertas en tiempo real (<100ms) */}
      <RealtimeAlertsBanner
        alert={liveAlert}
        onDismiss={() => setLiveAlert(null)}
      />

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        Lumina Wholesale & Liquidation POS &copy; {new Date().getFullYear()} &mdash; Moneda Oficial: Soles (S/.)
      </footer>
    </div>
  );
}
