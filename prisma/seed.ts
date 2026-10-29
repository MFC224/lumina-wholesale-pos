import { PrismaClient, Rol, TipoMovimiento } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

async function main() {
  console.log("🌱 Iniciando seed para Lumina Wholesale & Liquidation POS...");

  // 1. Limpieza inicial (opcional para desarrollo)
  await prisma.movimientoKardex.deleteMany();
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.sesionCaja.deleteMany();
  await prisma.varianteStock.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  // 2. Usuarios con PIN de 4 dígitos
  const adminPin = await hashPin("9999");
  const vendedor1Pin = await hashPin("1234");
  const vendedor2Pin = await hashPin("4321");

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Administrador General",
      pin: adminPin,
      rol: Rol.ADMIN,
      activo: true,
    },
  });

  const vendedor1 = await prisma.usuario.create({
    data: {
      nombre: "Caja 1 - Principal",
      pin: vendedor1Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Caja 2 - Almacén",
      pin: vendedor2Pin,
      rol: Rol.VENDEDOR,
      activo: true,
    },
  });

  console.log("✅ Usuarios creados:");
  console.log("   - Admin: PIN '9999' (Acceso total, costos, anulación)");
  console.log("   - Vendedor 1: PIN '1234' (Caja, sin costos)");
  console.log("   - Vendedor 2: PIN '4321' (Caja, sin costos)");

  // 3. Categorías iniciales
  const catTextil = await prisma.categoria.create({
    data: {
      nombre: "Ropa y Textiles",
      descripcion: "Prendas de vestir por tallas y colores",
    },
  });

  const catHerramientas = await prisma.categoria.create({
    data: {
      nombre: "Herramientas y Ferretería",
      descripcion: "Artículos individuales de ferretería en liquidación",
    },
  });

  // 4. Productos de muestra con variantes y stock
  // Producto con variantes de ropa (Polo Oversize Urbano)
  const polo = await prisma.producto.create({
    data: {
      nombre: "Polo Oversize Heavyweight Cotton",
      descripcion: "Algodón 100% 240g, liquidación por cambio de temporada",
      codigoSku: "POLO-HVY-01",
      categoriaId: catTextil.id,
      precioOriginal: 89.9,
      precioLiquidacion: 29.9, // Soles S/.
      costo: 14.5, // Confidencial S/.
      activo: true,
      variantes: {
        create: [
          {
            sku: "POLO-NG-M",
            talla: "M",
            color: "Negro",
            ubicacion: "Rack A-1",
            stockInicial: 25,
            stockActual: 25,
            stockMinimoAlerta: 3,
          },
          {
            sku: "POLO-NG-L",
            talla: "L",
            color: "Negro",
            ubicacion: "Rack A-1",
            stockInicial: 30,
            stockActual: 30,
            stockMinimoAlerta: 3,
          },
          {
            sku: "POLO-BL-M",
            talla: "M",
            color: "Blanco",
            ubicacion: "Rack A-2",
            stockInicial: 15,
            stockActual: 2, // Alerta crítica: <= 3
            stockMinimoAlerta: 3,
          },
        ],
      },
    },
    include: {
      variantes: true,
    },
  });

  // Registrar Kardex inicial para las variantes del polo
  for (const v of polo.variantes) {
    await prisma.movimientoKardex.create({
      data: {
        varianteId: v.id,
        tipo: TipoMovimiento.INGRESO,
        cantidad: v.stockInicial,
        stockAnterior: 0,
        stockNuevo: v.stockInicial,
        motivo: "Carga inicial de inventario para liquidación",
        usuarioId: admin.id,
      },
    });
  }

  // Producto simple de ferretería (Taladro Percutor 650W)
  const taladro = await prisma.producto.create({
    data: {
      nombre: "Taladro Percutor Industrial 650W",
      descripcion: "Últimas unidades de exhibición de remate",
      codigoSku: "FERR-TAL-650",
      categoriaId: catHerramientas.id,
      precioOriginal: 249.0,
      precioLiquidacion: 119.0, // Soles S/.
      costo: 65.0, // Confidencial S/.
      activo: true,
      variantes: {
        create: [
          {
            sku: "TAL-650-STD",
            talla: "Única",
            color: "Azul/Negro",
            ubicacion: "Estante F-04",
            stockInicial: 10,
            stockActual: 3, // Alerta crítica
            stockMinimoAlerta: 3,
          },
        ],
      },
    },
    include: {
      variantes: true,
    },
  });

  for (const v of taladro.variantes) {
    await prisma.movimientoKardex.create({
      data: {
        varianteId: v.id,
        tipo: TipoMovimiento.INGRESO,
        cantidad: v.stockInicial,
        stockAnterior: 0,
        stockNuevo: v.stockInicial,
        motivo: "Carga inicial de lote de herramientas",
        usuarioId: admin.id,
      },
    });
  }

  console.log("✅ Productos y variantes iniciales cargados en catálogo.");
  console.log("🌱 Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
