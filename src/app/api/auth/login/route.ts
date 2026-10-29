import { NextRequest, NextResponse } from "next/server";
import { authenticateByPin } from "@/lib/auth/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { success: false, error: "El PIN es obligatorio", code: "INVALID_FORMAT" },
        { status: 400 }
      );
    }

    const result = await authenticateByPin(pin);

    if (!result.success || !result.token) {
      const status = result.code === "INVALID_PIN" || result.code === "USER_NOT_FOUND" ? 401 : 400;
      return NextResponse.json(result, { status });
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });

    // Configurar cookie de sesión HTTP-Only segura
    response.cookies.set("lumina_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 horas
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
