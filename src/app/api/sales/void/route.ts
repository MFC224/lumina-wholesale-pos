import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { anularVentaDb } from "@/lib/sales/service";

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

    // Seguridad RBAC estricta (HU-08): Solo ADMIN puede anular ventas
    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Acceso denegado: Solo el Administrador tiene autorización para anular tickets de venta.",
          code: "FORBIDDEN_ROLE",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ventaId, motivo } = body;

    if (!ventaId) {
      return NextResponse.json({ error: "El ID de la venta es obligatorio" }, { status: 400 });
    }

    if (!motivo || !motivo.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe registrar un motivo formal para la anulación.",
          code: "MOTIVO_REQUERIDO",
        },
        { status: 400 }
      );
    }

    const result = await anularVentaDb(ventaId, session.userId, motivo.trim());

    if (!result.success) {
      const status = result.code === "VENTA_NO_ENCONTRADA" ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al anular la venta",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
