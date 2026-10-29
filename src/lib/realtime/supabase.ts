import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { StockSyncManager } from "./sync";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseInstance: SupabaseClient | null = null;
let activeChannel: RealtimeChannel | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

/**
 * Conecta el gestor de sincronización de stock con el canal de Supabase Realtime CDC.
 */
export function initSupabaseStockChannel(syncManager: StockSyncManager): () => void {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Si no hay credenciales de Supabase configuradas, mantener en modo local simulado
    syncManager.setConnectionStatus("CONNECTED");
    return () => {};
  }

  syncManager.setConnectionStatus("CONNECTING");

  activeChannel = supabase
    .channel("stock-changes-channel")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "VarianteStock" },
      (payload) => {
        const newRecord = payload.new as { id: string; stockActual: number; productoId?: string };
        const oldRecord = payload.old as { stockActual?: number };

        if (newRecord && newRecord.id) {
          syncManager.applyStockUpdate({
            varianteId: newRecord.id,
            productoId: newRecord.productoId,
            stockActual: newRecord.stockActual,
            stockAnterior: oldRecord?.stockActual,
            timestamp: Date.now(),
          });
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        syncManager.setConnectionStatus("CONNECTED");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        syncManager.setConnectionStatus("DISCONNECTED");
      } else if (status === "TIMED_OUT") {
        syncManager.setConnectionStatus("ERROR");
      }
    });

  return () => {
    if (activeChannel && supabase) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
