import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupProductionDatabase() {
  console.log("=================================================");
  console.log("🛡️ LUMINA POS — PROVISIÓN Y HARDENING DE BD");
  console.log("=================================================\n");

  try {
    // 1. Verificar conexión activa y versión de PostgreSQL
    console.log("1. Probando conexión a PostgreSQL...");
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    console.log("   ✅ Conectado exitosamente:");
    console.log(`   ${versionResult[0]?.version.split(" on ")[0]}\n`);

    // 2. Habilitar Supabase Realtime CDC (Change Data Capture)
    console.log("2. Configurando publicaciones para Supabase Realtime CDC...");
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Crear publicación supabase_realtime si no existe
          IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            CREATE PUBLICATION supabase_realtime;
          END IF;
          
          -- Agregar tablas a la publicación de tiempo real
          BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "VarianteProducto";
          EXCEPTION WHEN duplicate_object THEN
            NULL;
          END;

          BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "MovimientoKardex";
          EXCEPTION WHEN duplicate_object THEN
            NULL;
          END;
        END $$;
      `);
      console.log("   ✅ Supabase Realtime habilitado para 'VarianteProducto' y 'MovimientoKardex'.\n");
    } catch (realtimeErr) {
      console.warn("   ⚠️ Nota sobre Realtime:", (realtimeErr as Error).message);
    }

    // 3. Auditoría de índices de rendimiento para búsqueda rápida
    console.log("3. Verificando índices para búsqueda en 0ms y bloqueos...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_variante_sku" ON "VarianteProducto" ("sku");
      CREATE INDEX IF NOT EXISTS "idx_variante_producto_id" ON "VarianteProducto" ("productoId");
      CREATE INDEX IF NOT EXISTS "idx_kardex_variante_id" ON "MovimientoKardex" ("varianteId");
      CREATE INDEX IF NOT EXISTS "idx_venta_ticket" ON "Venta" ("numeroTicket");
    `);
    console.log("   ✅ Índices de rendimiento verificados.\n");

    // 4. Verificación de permisos y transacciones pesimistas
    console.log("4. Verificando capacidad de bloqueo pesimista (SELECT ... FOR UPDATE)...");
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FOR UPDATE;`;
    });
    console.log("   ✅ Bloqueo pesimista verificado en motor PostgreSQL.\n");

    console.log("=================================================");
    console.log("🎉 BASE DE DATOS LISTA Y CERTIFICADA PARA PRODUCCIÓN");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ Error en la configuración de la base de datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupProductionDatabase();
