import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateExecutiveExcelReport } from "@/lib/reports/excel";
import { ExecutiveReportData } from "@/types/reports";
import { Role } from "@/types/auth";
import { PaymentMethod } from "@/types/sales";

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

    // 1. Obtener todas las ventas
    const ventas = await prisma.venta.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        usuario: { select: { nombre: true } },
        detalles: {
          include: {
            variante: {
              include: { producto: true },
            },
          },
        },
      },
    });

    // 2. Obtener todo el catálogo e inventario
    const productos = await prisma.producto.findMany({
      include: {
        variantes: true,
      },
      orderBy: { nombre: "asc" },
    });

    // 3. Métricas y KPIs
    const ventasCompletadas = ventas.filter((v) => v.estado === "COMPLETADA");
    const ventasAnuladas = ventas.filter((v) => v.estado === "ANULADA");

    const totalRecaudado = ventasCompletadas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalArticulosVendidos = ventasCompletadas.reduce(
      (sum, v) => sum + v.detalles.reduce((acc, d) => acc + d.cantidad, 0),
      0
    );

    // 4. Desglose por método de pago
    const metodos: PaymentMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA"];
    const desgloseMetodos = metodos.map((metodo) => {
      const ticketsMetodo = ventasCompletadas.filter((v) => v.metodoPago === metodo);
      const recaudado = ticketsMetodo.reduce((sum, v) => sum + Number(v.total), 0);
      return {
        metodo,
        cantidadTickets: ticketsMetodo.length,
        totalRecaudado: Math.round(recaudado * 100) / 100,
      };
    });

    // 5. Inventario
    const inventarioReport = productos.flatMap((p) =>
      p.variantes.map((v) => {
        const liquidadas = Math.max(0, v.stockInicial - v.stockActual);
        const pctLiquidado = v.stockInicial > 0 ? Math.round((liquidadas / v.stockInicial) * 10000) / 100 : 0;
        return {
          producto: p.nombre,
          sku: v.sku,
          talla: v.talla,
          color: v.color,
          ubicacion: v.ubicacion,
          stockInicial: v.stockInicial,
          stockActual: v.stockActual,
          unidadesLiquidadas: liquidadas,
          porcentajeLiquidado: pctLiquidado,
          precioLiquidacion: Number(p.precioLiquidacion),
          costo: Number(p.costo),
        };
      })
    );

    // 6. Tickets
    const ticketsReport = ventas.map((v) => ({
      numeroTicket: v.numeroTicket,
      fecha: new Date(v.createdAt).toLocaleDateString("es-PE"),
      hora: new Date(v.createdAt).toLocaleTimeString("es-PE"),
      cajero: v.usuario.nombre,
      metodoPago: v.metodoPago as PaymentMethod,
      estado: v.estado,
      subtotal: Number(v.subtotal),
      descuento: Number(v.descuento),
      total: Number(v.total),
    }));

    const reportData: ExecutiveReportData = {
      fechaInicio: ventas.length > 0 ? ventas[0].createdAt : new Date(),
      fechaFin: ventas.length > 0 ? ventas[ventas.length - 1].createdAt : new Date(),
      solicitanteRol: session.rol as Role,
      solicitanteNombre: session.nombre,
      kpis: {
        totalRecaudado: Math.round(totalRecaudado * 100) / 100,
        totalArticulosVendidos,
        totalTicketsCompletados: ventasCompletadas.length,
        totalTicketsAnulados: ventasAnuladas.length,
      },
      metodosPago: desgloseMetodos,
      inventario: inventarioReport,
      tickets: ticketsReport,
    };

    const excelBuffer = await generateExecutiveExcelReport(reportData);

    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `Reporte_Ejecutivo_Lumina_${nowStr}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error generando el reporte Excel",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
