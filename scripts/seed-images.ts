import { PrismaClient } from '@prisma/client';
import { getProductImageUrl } from '../src/lib/catalog/images';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando actualización de imágenes en la base de datos...");
  const products = await prisma.producto.findMany({
    include: { categoria: true }
  });

  let updated = 0;
  for (const prod of products) {
    const imgUrl = getProductImageUrl({
      codigoSku: prod.codigoSku,
      categoriaNombre: prod.categoria?.nombre,
      imagenUrl: null, // Forzar obtención de la nueva imagen específica por SKU
      nombre: prod.nombre
    });

    if (imgUrl && imgUrl !== prod.imagenUrl) {
      await prisma.producto.update({
        where: { id: prod.id },
        data: { imagenUrl: imgUrl }
      });
      updated++;
    }
  }

  console.log(`✅ ${updated} productos actualizados con imágenes cuadradas en alta definición.`);
}

main()
  .catch((e) => {
    console.error("Error al actualizar imágenes:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
