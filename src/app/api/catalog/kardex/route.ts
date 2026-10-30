import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { consultarKardexDb } from "@/lib/kardex/service";
import { TipoMovimiento } from "@prisma/client";

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
    const varianteId = searchParams.get("varianteId") || undefined;
    const productoId = searchParams.get("productoId") || undefined;
    const tipo = (searchParams.get("tipo") as TipoMovimiento) || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const movimientos = await consultarKardexDb({
      varianteId,
      productoId,
      tipo,
      limit,
    });

    return NextResponse.json({
      success: true,
      total: movimientos.length,
      movimientos,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error al consultar bitácora de Kardex",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
