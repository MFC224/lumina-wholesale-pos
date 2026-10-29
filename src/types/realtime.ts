export type ConnectionStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

export type StockAlertSeverity = "CRITICO" | "AGOTADO" | "RESTOCK";

export interface StockUpdatePayload {
  varianteId: string;
  productoId?: string;
  stockActual: number;
  stockAnterior?: number;
  timestamp: number;
}

export interface RealtimeStockAlert {
  id: string;
  severidad: StockAlertSeverity;
  varianteId: string;
  nombreProducto: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  stockActual: number;
  mensaje: string;
  timestamp: number;
}

export interface RealtimeSyncStats {
  eventosRecibidos: number;
  latenciaPromedioMs: number;
  ultimaActualizacion: Date | null;
  estadoConexion: ConnectionStatus;
}
