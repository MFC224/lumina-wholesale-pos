"use client";

import React from "react";
import { RealtimeStockAlert } from "@/types/realtime";
import { AlertCircle, Ban, Sparkles, X } from "lucide-react";

interface RealtimeAlertsBannerProps {
  alert: RealtimeStockAlert | null;
  onDismiss: () => void;
}

export function RealtimeAlertsBanner({ alert, onDismiss }: RealtimeAlertsBannerProps) {
  if (!alert) return null;

  const isAgotado = alert.severidad === "AGOTADO";
  const isCritico = alert.severidad === "CRITICO";

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-bounce-short">
      <div
        className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
          isAgotado
            ? "bg-slate-900/95 text-white border-red-500/50"
            : isCritico
            ? "bg-red-950/95 text-red-100 border-red-400/50"
            : "bg-emerald-950/95 text-emerald-100 border-emerald-400/50"
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isAgotado ? (
            <Ban className="w-5 h-5 text-red-400 animate-pulse" />
          ) : isCritico ? (
            <AlertCircle className="w-5 h-5 text-amber-400 animate-stock-critical" />
          ) : (
            <Sparkles className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-xs">
          <p className="font-bold text-sm tracking-tight text-white mb-0.5">
            {isAgotado ? "¡Stock Agotado!" : isCritico ? "¡Alerta de Stock Crítico!" : "Stock Restablecido"}
          </p>
          <p className="opacity-90 leading-relaxed font-medium">{alert.mensaje}</p>
          <p className="text-[10px] opacity-60 font-mono mt-1">
            Actualizado en vivo vía WebSockets &bull; {new Date(alert.timestamp).toLocaleTimeString("es-PE")}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
