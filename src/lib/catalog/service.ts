import { prisma } from "@/lib/prisma";
import { Role } from "@/types/auth";
import { canViewCosts, sanitizeProductsForRole } from "@/lib/auth/rbac";
import { ImportProductGroup, ProductData } from "@/types/catalog";
import { calculateProductMetrics, generateVariantSku } from "./variants";
import { TipoMovimiento } from "@prisma/client";

/**
 * Consulta el catálogo de productos con sus variantes y calcula métricas en tiempo real.
 * Aplica filtro de seguridad RBAC: si el usuario es VENDEDOR, el campo 'costo' es eliminado.
 */
export async function getCatalog(options?: {
  role?: Role;
  search?: string;
  categoriaId?: string;
}) {
  const role: Role = options?.role || "VENDEDOR";

  const productsFromDb = await prisma.producto.findMany({
    where: {
      activo: true,
      ...(options?.categoriaId ? { categoriaId: options.categoriaId } : {}),
    },
    include: {
      categoria: true,
      variantes: {
        orderBy: [{ talla: "asc" }, { color: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedProducts = productsFromDb.map((p) => {
    const rawVariants = p.variantes.map((v) => ({
      id: v.id,
      sku: v.sku,
      talla: v.talla,
      color: v.color,
      ubicacion: v.ubicacion,
      stockInicial: v.stockInicial,
      stockActual: v.stockActual,
      stockMinimoAlerta: v.stockMinimoAlerta,
    }));

    const metrics = calculateProductMetrics(rawVariants);

    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      codigoSku: p.codigoSku,
      categoriaId: p.categoriaId,
      categoriaNombre: p.categoria?.nombre || "General",
      precioOriginal: Number(p.precioOriginal),
      precioLiquidacion: Number(p.precioLiquidacion),
      costo: Number(p.costo),
      imagenUrl: p.imagenUrl,
      activo: p.activo,
      variantes: rawVariants,
      metrics,
    };
  });

  // Ocultar confidencialmente los costos si no es ADMIN
  const sanitized = sanitizeProductsForRole(formattedProducts, role);

  // Filtrado difuso si se proporciona búsqueda
  if (options?.search && options.search.trim()) {
    const term = options.search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return sanitized.filter((p) => {
      const matchName = p.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(term);
      const matchSku = p.codigoSku?.toLowerCase().includes(term);
      const matchVariant = p.variantes.some(
        (v) =>
          v.sku.toLowerCase().includes(term) ||
          v.talla?.toLowerCase().includes(term) ||
          v.color?.toLowerCase().includes(term) ||
          v.ubicacion?.toLowerCase().includes(term)
      );
      return matchName || matchSku || matchVariant;
    });
  }

  return sanitized;
}

/**
 * Persiste en la base de datos un lote de productos agrupados provenientes del importador masivo.
 */
export async function persistImportedProducts(
  groups: ImportProductGroup[],
  adminUserId: string
) {
  const resultados = [];

  for (const group of groups) {
    // 1. Obtener o crear categoría
    let categoria = await prisma.categoria.findUnique({
      where: { nombre: group.categoria },
    });

    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: {
          nombre: group.categoria,
          descripcion: `Categoría creada automáticamente en importación masiva`,
        },
      });
    }

    // 2. Transacción atómica: Crear producto, variantes y Kardex inicial
    const productoCreado = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          nombre: group.nombre,
          codigoSku: group.codigoSku,
          categoriaId: categoria.id,
          precioOriginal: group.precioOriginal,
          precioLiquidacion: group.precioLiquidacion,
          costo: group.costo || 0,
          activo: true,
        },
      });

      for (const v of group.variantes) {
        const variante = await tx.varianteStock.create({
          data: {
            productoId: prod.id,
            sku: v.sku,
            talla: v.talla,
            color: v.color,
            ubicacion: v.ubicacion,
            stockInicial: v.stockInicial,
            stockActual: v.stockActual,
            stockMinimoAlerta: 3,
          },
        });

        // Registrar entrada en Kardex
        if (v.stockInicial > 0) {
          await tx.movimientoKardex.create({
            data: {
              varianteId: variante.id,
              tipo: TipoMovimiento.INGRESO,
              cantidad: v.stockInicial,
              stockAnterior: 0,
              stockNuevo: v.stockInicial,
              motivo: "Carga masiva de inventario (Importación Excel/CSV)",
              usuarioId: adminUserId,
            },
          });
        }
      }

      return prod;
    });

    resultados.push(productoCreado);
  }

  return resultados;
}
