import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { obtenerMetricasLiquidacionDb } from "@/lib/reports/kpis";
import { getDateRangeBounds, DatePreset } from "@/lib/reports/date-ranges";

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("lumina_session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preset = (searchParams.get("preset") as DatePreset) || "HOY";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;

    const bounds = getDateRangeBounds(preset, customStart, customEnd);
    const kpis = await obtenerMetricasLiquidacionDb(bounds.startDate, bounds.endDate);

    return NextResponse.json({
      success: true,
      rangeLabel: bounds.label,
      kpis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error calculando métricas de liquidación",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
