import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { procesarVentaDb } from "@/lib/sales/service";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }

    const body = await request.json();
    const result = await procesarVentaDb({
      ...body,
      usuarioId: session.userId,
    });

    if (!result.success) {
      const status = result.code === "STOCK_INSUFICIENTE" ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error procesando la venta",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}

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
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "30")));

    const ventas = await prisma.venta.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        usuario: { select: { id: true, nombre: true, rol: true } },
        anuladoPor: { select: { id: true, nombre: true } },
        detalles: {
          include: {
            variante: {
              include: { producto: { select: { nombre: true, codigoSku: true } } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      total: ventas.length,
      ventas: ventas.map((v) => ({
        id: v.id,
        numeroTicket: v.numeroTicket,
        cajero: v.usuario.nombre,
        rolCajero: v.usuario.rol,
        subtotal: Number(v.subtotal),
        descuento: Number(v.descuento),
        tipoDescuento: v.tipoDescuento,
        total: Number(v.total),
        metodoPago: v.metodoPago,
        montoRecibido: Number(v.montoRecibido),
        vuelto: Number(v.vuelto),
        estado: v.estado,
        anuladoPor: v.anuladoPor?.nombre,
        motivoAnulacion: v.motivoAnulacion,
        createdAt: v.createdAt,
        itemsCount: v.detalles.reduce((acc, d) => acc + d.cantidad, 0),
        detalles: v.detalles.map((d) => ({
          id: d.id,
          nombreProducto: d.variante.producto.nombre,
          sku: d.variante.sku,
          talla: d.variante.talla,
          color: d.variante.color,
          cantidad: d.cantidad,
          precioUnitario: Number(d.precioUnitario),
          subtotal: Number(d.subtotal),
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error al consultar historial de ventas",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
