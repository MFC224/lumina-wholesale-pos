import {
  ConnectionStatus,
  StockUpdatePayload,
  RealtimeStockAlert,
  RealtimeSyncStats,
} from "@/types/realtime";
import { SearchableProduct } from "@/lib/pos/search";
import { calculateProductMetrics } from "@/lib/catalog/variants";

export type StockChangeListener = (products: SearchableProduct[]) => void;
export type AlertListener = (alert: RealtimeStockAlert) => void;
export type ConnectionListener = (status: ConnectionStatus) => void;

/**
 * Gestor de sincronización en tiempo real vía WebSockets / Supabase Realtime CDC.
 * Actualiza los badges de stock en menos de 100ms y gestiona reconexiones transparentes por Wi-Fi.
 */
export class StockSyncManager {
  private products: SearchableProduct[] = [];
  private connectionStatus: ConnectionStatus = "DISCONNECTED";
  private stockListeners: Set<StockChangeListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();

  private stats: RealtimeSyncStats = {
    eventosRecibidos: 0,
    latenciaPromedioMs: 0,
    ultimaActualizacion: null,
    estadoConexion: "DISCONNECTED",
  };

  constructor(initialProducts: SearchableProduct[] = []) {
    this.products = JSON.parse(JSON.stringify(initialProducts));
  }

  /**
   * Carga o actualiza el catálogo base en memoria.
   */
  setProducts(products: SearchableProduct[]) {
    this.products = JSON.parse(JSON.stringify(products));
    this.notifyStockChange();
  }

  /**
   * Obtiene una copia del catálogo actual en memoria.
   */
  getProducts(): SearchableProduct[] {
    return JSON.parse(JSON.stringify(this.products));
  }

  /**
   * Obtiene el estado actual de la conexión.
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Obtiene estadísticas de sincronización en tiempo real.
   */
  getStats(): RealtimeSyncStats {
    return { ...this.stats };
  }

  /**
   * Cambia el estado de conexión y notifica a los oyentes de red.
   */
  setConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.stats.estadoConexion = status;
      for (const listener of this.connectionListeners) {
        listener(status);
      }
    }
  }

  /**
   * Aplica un evento de actualización de stock en tiempo real (<100ms).
   */
  applyStockUpdate(payload: StockUpdatePayload): boolean {
    const startTime = performance.now();
    let updated = false;

    for (const prod of this.products) {
      const variante = prod.variantes.find((v) => v.id === payload.varianteId);
      if (variante) {
        const stockPrevio = variante.stockActual;
        const nuevoStock = Math.max(0, payload.stockActual);
        variante.stockActual = nuevoStock;
        updated = true;

        // Registrar estadísticas
        const latency = performance.now() - startTime;
        this.stats.eventosRecibidos += 1;
        this.stats.latenciaPromedioMs = Math.round(latency * 100) / 100;
        this.stats.ultimaActualizacion = new Date();

        // 1. Evaluar si dispara alertas de stock crítico, agotado o restock
        if (nuevoStock <= 0 && stockPrevio > 0) {
          this.emitAlert({
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            severidad: "AGOTADO",
            varianteId: variante.id,
            nombreProducto: prod.nombre,
            sku: variante.sku,
            talla: variante.talla,
            color: variante.color,
            stockActual: 0,
            mensaje: `¡Producto Agotado! La variante ${variante.sku} (${prod.nombre}) se quedó sin stock.`,
            timestamp: Date.now(),
          });
        } else if (stockPrevio <= 0 && nuevoStock > 0) {
          this.emitAlert({
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            severidad: "RESTOCK",
            varianteId: variante.id,
            nombreProducto: prod.nombre,
            sku: variante.sku,
            talla: variante.talla,
            color: variante.color,
            stockActual: nuevoStock,
            mensaje: `Stock Restablecido: ${variante.sku} ahora tiene ${nuevoStock} unidades tras anulación/ingreso.`,
            timestamp: Date.now(),
          });
        } else if (nuevoStock >= 1 && nuevoStock <= 3 && stockPrevio > 3) {
          this.emitAlert({
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            severidad: "CRITICO",
            varianteId: variante.id,
            nombreProducto: prod.nombre,
            sku: variante.sku,
            talla: variante.talla,
            color: variante.color,
            stockActual: nuevoStock,
            mensaje: `Stock Crítico: Quedan solo ${nuevoStock} unidades de ${variante.sku}.`,
            timestamp: Date.now(),
          });
        }

        break;
      }
    }

    if (updated) {
      this.notifyStockChange();
    }

    return updated;
  }

  /**
   * Suscribe un listener para cambios en el stock del catálogo.
   */
  onStockChange(listener: StockChangeListener): () => void {
    this.stockListeners.add(listener);
    return () => {
      this.stockListeners.delete(listener);
    };
  }

  /**
   * Suscribe un listener para alertas críticas y de agotamiento.
   */
  onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  /**
   * Suscribe un listener para cambios en el estado de conexión Wi-Fi / WebSockets.
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Emite una alerta a todos los oyentes registrados.
   */
  private emitAlert(alert: RealtimeStockAlert) {
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch {
        // Ignorar errores en callbacks de UI
      }
    }
  }

  /**
   * Notifica el cambio de stock a todos los suscriptores.
   */
  private notifyStockChange() {
    const cloned = this.getProducts();
    for (const listener of this.stockListeners) {
      try {
        listener(cloned);
      } catch {
        // Ignorar errores en callbacks de UI
      }
    }
  }

  /**
   * Sincronización completa tras reconexión por pérdida de señal Wi-Fi.
   */
  async fullResync(fetchLatestFn: () => Promise<SearchableProduct[]>): Promise<void> {
    this.setConnectionStatus("CONNECTING");
    try {
      const freshProducts = await fetchLatestFn();
      this.products = JSON.parse(JSON.stringify(freshProducts));
      this.setConnectionStatus("CONNECTED");
      this.notifyStockChange();
    } catch {
      this.setConnectionStatus("ERROR");
    }
  }

  /**
   * Limpia todos los suscriptores para evitar fugas de memoria.
   */
  cleanup() {
    this.stockListeners.clear();
    this.alertListeners.clear();
    this.connectionListeners.clear();
    this.setConnectionStatus("DISCONNECTED");
  }
}
