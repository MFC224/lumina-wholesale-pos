import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    select: { id: true, nombre: true, rol: true, activo: true },
  });

  const categories = await prisma.categoria.count();
  const products = await prisma.producto.count();
  const variants = await prisma.varianteStock.count();
  const stockAgg = await prisma.varianteStock.aggregate({
    _sum: { stockActual: true },
  });

  const sales = await prisma.venta.groupBy({
    by: ['estado'],
    _count: { id: true },
    _sum: { total: true },
  });

  const salesByPayment = await prisma.venta.groupBy({
    by: ['metodoPago'],
    _count: { id: true },
    _sum: { total: true },
  });

  const kardexCount = await prisma.movimientoKardex.count();
  const kardexByTipo = await prisma.movimientoKardex.groupBy({
    by: ['tipo'],
    _count: { id: true },
  });

  // Verificar si hay registros huérfanos o anomalías
  const negativeStockCount = await prisma.varianteStock.count({
    where: { stockActual: { lt: 0 } },
  });

  const variantsWithoutProduct = await prisma.varianteStock.count({
    where: { productoId: { equals: '' } },
  });

  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        usuarios: users,
        metricas: {
          categorias: categories,
          productos: products,
          variantes: variants,
          unidadesStockFisicoTotal: stockAgg._sum.stockActual,
          ventasPorEstado: sales,
          ventasPorMetodoPago: salesByPayment,
          totalMovimientosKardex: kardexCount,
          movimientosPorTipo: kardexByTipo,
        },
        integridad: {
          variantesConStockNegativo: negativeStockCount,
          variantesSinProducto: variantsWithoutProduct,
          estadoConsistenciaStock: negativeStockCount === 0 ? 'CONFORME (0 Stock Negativo)' : 'ERROR_DETECTADO',
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
