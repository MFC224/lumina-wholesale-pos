import { prisma } from "@/lib/prisma";

export interface CategorySellThrough {
  categoriaId: string;
  categoriaNombre: string;
  stockInicial: number;
  stockActual: number;
  unidadesLiquidadas: number;
  porcentajeLiquidado: number;
}

export interface TopProductMetric {
  productoId: string;
  nombre: string;
  codigoSku: string | null;
  categoria: string;
  unidadesVendidas: number;
  totalRecaudadoPEN: number;
}

export interface SlowMovingProduct {
  productoId: string;
  nombre: string;
  codigoSku: string | null;
  categoria: string;
  stockActual: number;
  precioLiquidacion: number;
  unidadesVendidas: number;
  sugerenciaRemate: string;
}

export interface SellerSalesMetric {
  usuarioId: string;
  nombre: string;
  rol: string;
  totalVendidoPEN: number;
  totalTickets: number;
  ticketPromedioPEN: number;
  porcentajeTotal: number;
}

export interface LiquidationKpiSummary {
  // Desplome Global
  totalStockInicial: number;
  totalStockActual: number;
  totalUnidadesLiquidadas: number;
  porcentajeLiquidadoGlobal: number;

  // Financieros
  totalVentasPEN: number;
  totalDescuentosPEN: number;
  totalTickets: number;
  ticketPromedioPEN: number;
  ventasPorMetodo: Record<string, number>;

  // Desgloses
  porCategoria: CategorySellThrough[];
  topMasVendidos: TopProductMetric[];
  topLentaRotacion: SlowMovingProduct[];
  rankingVendedores: SellerSalesMetric[];
}

/**
 * Calcula las métricas avanzadas de liquidación, velocidad de desplome y KPIs ejecutivos.
 */
export async function obtenerMetricasLiquidacionDb(startDate?: Date, endDate?: Date): Promise<LiquidationKpiSummary> {
  // 1. Obtener todas las variantes con sus categorías
  const variantes = await prisma.varianteStock.findMany({
    include: {
      producto: {
        include: {
          categoria: true,
        },
      },
    },
  });

  let totalStockInicial = 0;
  let totalStockActual = 0;

  const categoryMap = new Map<
    string,
    {
      categoriaId: string;
      categoriaNombre: string;
      stockInicial: number;
      stockActual: number;
    }
  >();

  for (const v of variantes) {
    totalStockInicial += v.stockInicial;
    totalStockActual += v.stockActual;

    const catId = v.producto.categoriaId || "general";
    const catNombre = v.producto.categoria?.nombre || "General";

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoriaId: catId,
        categoriaNombre: catNombre,
        stockInicial: 0,
        stockActual: 0,
      });
    }

    const cat = categoryMap.get(catId)!;
    cat.stockInicial += v.stockInicial;
    cat.stockActual += v.stockActual;
  }

  const totalUnidadesLiquidadas = Math.max(0, totalStockInicial - totalStockActual);
  const porcentajeLiquidadoGlobal =
    totalStockInicial > 0 ? Math.round((totalUnidadesLiquidadas / totalStockInicial) * 1000) / 10 : 0;

  const porCategoria: CategorySellThrough[] = Array.from(categoryMap.values()).map((c) => {
    const unidades = Math.max(0, c.stockInicial - c.stockActual);
    const pct = c.stockInicial > 0 ? Math.round((unidades / c.stockInicial) * 1000) / 10 : 0;
    return {
      categoriaId: c.categoriaId,
      categoriaNombre: c.categoriaNombre,
      stockInicial: c.stockInicial,
      stockActual: c.stockActual,
      unidadesLiquidadas: unidades,
      porcentajeLiquidado: pct,
    };
  });

  // Ordenar categorías por mayor velocidad de desplome
  porCategoria.sort((a, b) => b.porcentajeLiquidado - a.porcentajeLiquidado);

  // 2. Obtener métricas financieras de ventas
  const salesWhere: any = {
    estado: "COMPLETADA",
  };

  if (startDate || endDate) {
    salesWhere.createdAt = {};
    if (startDate) salesWhere.createdAt.gte = startDate;
    if (endDate) salesWhere.createdAt.lte = endDate;
  }

  const ventas = await prisma.venta.findMany({
    where: salesWhere,
    include: {
      detalles: {
        include: {
          variante: {
            include: {
              producto: {
                include: { categoria: true },
              },
            },
          },
        },
      },
    },
  });

  let totalVentasPEN = 0;
  let totalDescuentosPEN = 0;
  const ventasPorMetodo: Record<string, number> = {
    EFECTIVO: 0,
    YAPE: 0,
    PLIN: 0,
    TARJETA: 0,
    TRANSFERENCIA: 0,
  };

  const productSalesMap = new Map<
    string,
    {
      productoId: string;
      nombre: string;
      codigoSku: string | null;
      categoria: string;
      unidadesVendidas: number;
      totalRecaudadoPEN: number;
    }
  >();

  for (const venta of ventas) {
    const total = Number(venta.total);
    const desc = Number(venta.descuento);
    totalVentasPEN += total;
    totalDescuentosPEN += desc;

    const metodo = venta.metodoPago.toUpperCase();
    ventasPorMetodo[metodo] = (ventasPorMetodo[metodo] || 0) + total;

    for (const d of venta.detalles) {
      const prod = d.variante.producto;
      if (!productSalesMap.has(prod.id)) {
        productSalesMap.set(prod.id, {
          productoId: prod.id,
          nombre: prod.nombre,
          codigoSku: prod.codigoSku,
          categoria: prod.categoria?.nombre || "General",
          unidadesVendidas: 0,
          totalRecaudadoPEN: 0,
        });
      }
      const pData = productSalesMap.get(prod.id)!;
      pData.unidadesVendidas += d.cantidad;
      pData.totalRecaudadoPEN += Number(d.subtotal);
    }
  }

  const totalTickets = ventas.length;
  const ticketPromedioPEN = totalTickets > 0 ? Math.round((totalVentasPEN / totalTickets) * 100) / 100 : 0;

  // 3. Top 5 Más Vendidos
  const topMasVendidos: TopProductMetric[] = Array.from(productSalesMap.values())
    .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
    .slice(0, 5);

  // 4. Top 5 Menor Rotación ("Huesos" de liquidación)
  // Productos activos que tengan mayor stock remanente y menos ventas
  const allProducts = await prisma.producto.findMany({
    where: { activo: true },
    include: {
      categoria: true,
      variantes: true,
    },
  });

  const slowMovingList: SlowMovingProduct[] = allProducts.map((p) => {
    const stockTotal = p.variantes.reduce((sum, v) => sum + v.stockActual, 0);
    const ventasInfo = productSalesMap.get(p.id);
    const vendidas = ventasInfo?.unidadesVendidas || 0;

    let sugerencia = "Rotación estable";
    if (vendidas === 0 && stockTotal > 15) {
      sugerencia = "Aplicar 20% extra de remate para acelerar salida";
    } else if (vendidas < 3 && stockTotal > 10) {
      sugerencia = "Sugerir paquete 2x1 o escala mayorista 15%";
    }

    return {
      productoId: p.id,
      nombre: p.nombre,
      codigoSku: p.codigoSku,
      categoria: p.categoria?.nombre || "General",
      stockActual: stockTotal,
      precioLiquidacion: Number(p.precioLiquidacion),
      unidadesVendidas: vendidas,
      sugerenciaRemate: sugerencia,
    };
  });

  const topLentaRotacion = slowMovingList
    .sort((a, b) => {
      // Priorizar los que tienen más stock y menos ventas
      if (a.unidadesVendidas !== b.unidadesVendidas) {
        return a.unidadesVendidas - b.unidadesVendidas;
      }
      return b.stockActual - a.stockActual;
    })
    .slice(0, 5);

  // 5. Ranking de Vendedores ("¿Quién vende más?")
  const usuariosVendedores = await prisma.usuario.findMany({
    where: {
      activo: true,
      OR: [
        { rol: "VENDEDOR" },
        { nombre: { contains: "Caja" } },
        { nombre: { contains: "Vendedor" } },
      ],
    },
    select: {
      id: true,
      nombre: true,
      rol: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });

  const sellerSalesMap = new Map<string, { total: number; tickets: number }>();
  for (const venta of ventas) {
    if (venta.usuarioId) {
      const prev = sellerSalesMap.get(venta.usuarioId) || { total: 0, tickets: 0 };
      prev.total += Number(venta.total);
      prev.tickets += 1;
      sellerSalesMap.set(venta.usuarioId, prev);
    }
  }

  const rankingVendedores: SellerSalesMetric[] = usuariosVendedores
    .map((usr) => {
      const stats = sellerSalesMap.get(usr.id) || { total: 0, tickets: 0 };
      const totalVendidoPEN = Math.round(stats.total * 100) / 100;
      const ticketPromedioPEN =
        stats.tickets > 0 ? Math.round((totalVendidoPEN / stats.tickets) * 100) / 100 : 0;
      const pct =
        totalVentasPEN > 0 ? Math.round((totalVendidoPEN / totalVentasPEN) * 1000) / 10 : 0;

      return {
        usuarioId: usr.id,
        nombre: usr.nombre,
        rol: usr.rol,
        totalVendidoPEN,
        totalTickets: stats.tickets,
        ticketPromedioPEN,
        porcentajeTotal: pct,
      };
    })
    .sort((a, b) => b.totalVendidoPEN - a.totalVendidoPEN);

  return {
    totalStockInicial,
    totalStockActual,
    totalUnidadesLiquidadas,
    porcentajeLiquidadoGlobal,
    totalVentasPEN: Math.round(totalVentasPEN * 100) / 100,
    totalDescuentosPEN: Math.round(totalDescuentosPEN * 100) / 100,
    totalTickets,
    ticketPromedioPEN,
    ventasPorMetodo,
    porCategoria,
    topMasVendidos,
    topLentaRotacion,
    rankingVendedores,
  };
}
