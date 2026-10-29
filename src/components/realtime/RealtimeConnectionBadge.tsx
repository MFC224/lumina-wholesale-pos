"use client";

import React from "react";
import { ConnectionStatus } from "@/types/realtime";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface RealtimeConnectionBadgeProps {
  status: ConnectionStatus;
  latencyMs?: number;
}

export function RealtimeConnectionBadge({
  status,
  latencyMs = 12,
}: RealtimeConnectionBadgeProps) {
  if (status === "CONNECTED") {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-400/30 text-xs font-semibold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">En vivo (&lt;100ms)</span>
      </div>
    );
  }

  if (status === "CONNECTING") {
    return (
      <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-xl border border-amber-400/30 text-xs font-semibold">
        <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        <span>Reconectando Wi-Fi...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-xl border border-red-400/30 text-xs font-semibold">
      <WifiOff className="w-3.5 h-3.5 text-red-400" />
      <span>Desconectado</span>
    </div>
  );
}
