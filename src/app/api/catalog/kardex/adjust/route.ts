import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { registrarAjusteInventarioDb } from "@/lib/kardex/service";

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
        { success: false, error: "Solo administradores pueden realizar ajustes manuales de Kardex" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = await registrarAjusteInventarioDb({
      varianteId: body.varianteId,
      cantidadAjuste: Number(body.cantidadAjuste),
      motivo: body.motivo,
      tipo: body.tipo,
      adminUserId: session.userId,
    });

    if (!result.success) {
      const status = result.code === "NO_AUTORIZADO" ? 403 : result.code === "STOCK_NEGATIVO" ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al registrar ajuste de inventario",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
