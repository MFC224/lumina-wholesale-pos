import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  calcularArqueoCaja,
  buildCashClosingDocument,
  renderCashClosingHtml,
} from "@/lib/reports/cash-closing";
import { getDateRangeBounds, DateRangePreset } from "@/lib/reports/date-ranges";
import { EstadoVenta, MetodoPago, EstadoSesionCaja } from "@prisma/client";

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

    const body = await request.json();
    const montoApertura = Number(body.montoApertura || 0);
    const efectivoContadoFisico = Number(body.efectivoContadoFisico || 0);
    const observaciones = body.observaciones ? String(body.observaciones).trim() : undefined;

    const rango = (body.rango as DateRangePreset) || "HOY";
    const bounds = getDateRangeBounds(rango, body.desde, body.hasta);

    // 1. Obtener ventas completadas dentro del rango seleccionado
    const ventasEfectivo = await prisma.venta.aggregate({
      where: {
        metodoPago: MetodoPago.EFECTIVO,
        estado: EstadoVenta.COMPLETADA,
        createdAt: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
      _sum: { total: true },
    });

    const ventasDigitales = await prisma.venta.aggregate({
      where: {
        metodoPago: { not: MetodoPago.EFECTIVO },
        estado: EstadoVenta.COMPLETADA,
        createdAt: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
      _sum: { total: true },
    });

    const ventasEfectivoTotal = Number(ventasEfectivo._sum.total || 0);
    const ventasDigitalesTotal = Number(ventasDigitales._sum.total || 0);

    // 2. Construir documento oficial de cierre
    const now = new Date();
    const docId = `CIERRE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;

    const doc = buildCashClosingDocument({
      id: docId,
      cajeroNombre: session.nombre,
      cajeroId: session.userId,
      supervisorNombre: session.rol === "ADMIN" ? session.nombre : undefined,
      supervisorId: session.rol === "ADMIN" ? session.userId : undefined,
      fechaApertura: bounds.startDate,
      fechaCierre: bounds.endDate,
      observaciones,
      input: {
        montoApertura,
        ventasEfectivoTotal,
        efectivoContadoFisico,
        ventasDigitalesTotal,
      },
    });

    const html = renderCashClosingHtml(doc);

    // 3. Registrar o persistir sesión de caja en Prisma si hay conexión
    try {
      await prisma.sesionCaja.create({
        data: {
          usuarioId: session.userId,
          montoApertura,
          efectivoEsperado: doc.calculos.efectivoEsperado,
          efectivoReal: doc.calculos.efectivoContadoFisico,
          diferencia: doc.calculos.diferencia,
          totalVentas: doc.calculos.totalVentasGlobal,
          estado: EstadoSesionCaja.CERRADA,
          observaciones,
          firmadoPorAdminId: session.rol === "ADMIN" ? session.userId : null,
          fechaCierre: new Date(),
        },
      });
    } catch {
      // Continuar si la sesión se genera en modo local
    }

    return NextResponse.json({
      success: true,
      document: doc,
      html,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error al generar el arqueo de caja",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
