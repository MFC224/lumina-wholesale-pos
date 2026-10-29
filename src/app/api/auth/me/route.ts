import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("lumina_session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, error: "Token inválido o expirado" }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ authenticated: false, error: "Usuario inactivo o no encontrado" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "Error interno verificando sesión",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
