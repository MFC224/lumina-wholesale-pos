import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog/service";
import { verifySessionToken } from "@/lib/auth/session";
import { Role } from "@/types/auth";
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";
import { generateVariantSku } from "@/lib/catalog/variants";

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("lumina_session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let role: Role = "VENDEDOR";
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.rol) {
        role = payload.rol;
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const categoriaId = searchParams.get("categoriaId") || undefined;

    const catalog = await getCatalog({ role, search, categoriaId });

    return NextResponse.json({
      success: true,
      role,
      total: catalog.length,
      items: catalog,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error al consultar el catálogo",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get("lumina_session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado: Se requiere rol ADMINISTRADOR para crear productos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nombre,
      descripcion,
      codigoSku,
      categoriaId,
      categoriaNombre,
      precioOriginal,
      precioLiquidacion,
      costo,
      imagenUrl,
      variantes,
    } = body;

    if (!nombre || !precioLiquidacion) {
      return NextResponse.json(
        { error: "Nombre y Precio de Liquidación son obligatorios" },
        { status: 400 }
      );
    }

    // Resolver categoría
    let resolvedCatId = categoriaId;
    if (!resolvedCatId && categoriaNombre) {
      const cat = await prisma.categoria.upsert({
        where: { nombre: categoriaNombre },
        update: {},
        create: { nombre: categoriaNombre },
      });
      resolvedCatId = cat.id;
    }

    const baseSku = codigoSku || nombre.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

    const created = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          nombre,
          descripcion,
          codigoSku: baseSku,
          categoriaId: resolvedCatId,
          precioOriginal: Number(precioOriginal || precioLiquidacion),
          precioLiquidacion: Number(precioLiquidacion),
          costo: Number(costo || 0),
          imagenUrl,
          activo: true,
        },
      });

      const variantsList = Array.isArray(variantes) && variantes.length > 0
        ? variantes
        : [{ talla: "Única", color: "Estándar", ubicacion: "Almacén Central", stockInicial: 0 }];

      for (const v of variantsList) {
        const skuVar = v.sku || generateVariantSku(baseSku, v.color, v.talla);
        const inicial = Number(v.stockInicial || 0);

        const nuevaVariante = await tx.varianteStock.create({
          data: {
            productoId: prod.id,
            sku: skuVar,
            talla: v.talla || "Única",
            color: v.color || "Estándar",
            ubicacion: v.ubicacion || "Almacén Central",
            stockInicial: inicial,
            stockActual: inicial,
            stockMinimoAlerta: 3,
          },
        });

        if (inicial > 0) {
          await tx.movimientoKardex.create({
            data: {
              varianteId: nuevaVariante.id,
              tipo: TipoMovimiento.INGRESO,
              cantidad: inicial,
              stockAnterior: 0,
              stockNuevo: inicial,
              motivo: "Creación inicial de producto y variante",
              usuarioId: session.userId,
            },
          });
        }
      }

      return prod;
    });

    return NextResponse.json({ success: true, producto: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error creando producto",
        detail: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}
