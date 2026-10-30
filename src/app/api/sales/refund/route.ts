import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { procesarDevolucionItemDb } from "@/lib/sales/service";

export async function POST(request: NextRequest) {
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

    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado: solo el Administrador puede procesar devoluciones." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ventaId, detalleId, cantidad, motivo } = body;

    if (!ventaId || !detalleId) {
      return NextResponse.json(
        { error: "Los identificadores de venta y detalle son obligatorios." },
        { status: 400 }
      );
    }

    if (!motivo || !String(motivo).trim()) {
      return NextResponse.json(
        { error: "El motivo de la devolución es estrictamente obligatorio." },
        { status: 400 }
      );
    }

    const result = await procesarDevolucionItemDb({
      ventaId,
      detalleId,
      cantidad: Number(cantidad) || 1,
      motivo: String(motivo).trim(),
      adminUserId: session.userId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al procesar la devolución",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
