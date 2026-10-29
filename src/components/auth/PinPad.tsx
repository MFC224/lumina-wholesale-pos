"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lock, Delete, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { UserProfile } from "@/types/auth";

interface PinPadProps {
  onSuccess: (user: UserProfile, token: string) => void;
  title?: string;
  subtitle?: string;
}

export function PinPad({
  onSuccess,
  title = "Ingreso al Punto de Venta",
  subtitle = "Ingrese su PIN de 4 dígitos para desbloquear la terminal",
}: PinPadProps) {
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4 && !loading) {
        setError(null);
        setPin((prev) => prev + digit);
      }
    },
    [pin, loading]
  );

  const handleBackspace = useCallback(() => {
    if (!loading) {
      setError(null);
      setPin((prev) => prev.slice(0, -1));
    }
  }, [loading]);

  const handleClear = useCallback(() => {
    if (!loading) {
      setError(null);
      setPin("");
    }
  }, [loading]);

  const submitPin = useCallback(
    async (pinToSubmit: string) => {
      if (pinToSubmit.length !== 4) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinToSubmit }),
        });

        const data = await res.json();

        if (res.ok && data.success && data.user) {
          onSuccess(data.user, data.token);
        } else {
          setError(data.error || "PIN inválido");
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          setPin("");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPin("");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  // Auto-submit al completar 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      submitPin(pin);
    }
  }, [pin, submitPin]);

  // Soporte directo para teclado físico del laptop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear]);

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Encabezado */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 bg-[#081C6C]/10 rounded-2xl flex items-center justify-center text-[#081C6C]">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Indicador visual de los 4 dígitos */}
      <div
        className={`flex justify-center items-center gap-4 my-6 py-3 px-6 bg-slate-50 rounded-xl border ${
          error ? "border-red-400 bg-red-50/40" : "border-slate-200"
        } ${isShaking ? "animate-shake" : ""}`}
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-5 h-5 rounded-full transition-all duration-200 ${
                isFilled
                  ? "bg-[#081C6C] scale-110 shadow-sm"
                  : "bg-slate-300 border-2 border-slate-200"
              }`}
            />
          );
        })}
      </div>

      {/* Mensaje de error si falla */}
      {error && (
        <div className="text-center text-xs text-red-600 font-medium mb-4 bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Teclado numérico virtual táctil */}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={loading}
            onClick={() => handleDigit(num)}
            className="h-14 text-2xl font-semibold text-slate-700 bg-slate-50 hover:bg-[#081C6C] hover:text-white rounded-xl transition-colors duration-150 active:scale-95 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
          >
            {num}
          </button>
        ))}

        {/* Botón Limpiar (C) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleClear}
          className="h-14 text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors duration-150 active:scale-95 border border-slate-200 focus:outline-none"
        >
          LIMPIAR
        </button>

        {/* Cero (0) */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDigit("0")}
          className="h-14 text-2xl font-semibold text-slate-700 bg-slate-50 hover:bg-[#081C6C] hover:text-white rounded-xl transition-colors duration-150 active:scale-95 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#081C6C]"
        >
          0
        </button>

        {/* Botón Borrar (Backspace) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleBackspace}
          className="h-14 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors duration-150 active:scale-95 border border-slate-200 focus:outline-none"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Indicador de ayuda para atajos */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Usa el teclado numérico de tu laptop</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">Esc: Limpiar</span>
      </div>
    </div>
  );
}
