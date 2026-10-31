import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

export const CURATED_52_REAL_IMAGES: Record<string, string> = {
  // =========================================================================
  // 1. HERRAMIENTAS Y FERRETERÍA (15 Productos)
  // =========================================================================
  // Taladro Percutor Inalámbrico 20V Brushless
  "TLD-20V-01": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Craftsman_C3_19.2v_Impact_Driver_%285497647182%29.jpg/500px-Craftsman_C3_19.2v_Impact_Driver_%285497647182%29.jpg",
  // Amoladora Angular 4-1/2 Pulg 850W
  "AMO-850-02": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/AngleGrinder.jpg/500px-AngleGrinder.jpg",
  // Juego de Llaves Combinadas Cromo Vanadio (12 Pzs)
  "LLV-CRV-03": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/2008-04-14_Chrome-Vanadium_Wrenches.jpg/500px-2008-04-14_Chrome-Vanadium_Wrenches.jpg",
  // Sierra Circular de Mano 7-1/4 Pulg 1500W
  "SIE-1500-04": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Circular_Saw_-_unbranded.jpg/500px-Circular_Saw_-_unbranded.jpg",
  // Martillo de Uña Curva 16oz Mango Fibra de Vidrio
  "MAR-16OZ-05": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Hammer2.jpg/500px-Hammer2.jpg",
  // Set de Destornilladores de Precisión Imantados (24 Pzs)
  "DST-24PZ-06": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Jeweler%27s-screwdriver-set-bright.jpg/500px-Jeweler%27s-screwdriver-set-bright.jpg",
  // Nivel Láser Autonivelante de 12 Líneas 3D 360
  "LSR-12L-07": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Construction_laser.jpg/500px-Construction_laser.jpg",
  // Cinta Métrica de Alta Visibilidad 8 Metros / 26 Pies
  "WIN-8M-08": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Measuring-tape.jpg/500px-Measuring-tape.jpg",
  // Pistola de Calor Eléctrica 2000W 600°C
  "PST-2000-09": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Verfstripper.jpg/500px-Verfstripper.jpg",
  // Alicate Universal de Fuerza 8 Pulg Aislado 1000V
  "ALI-8P-10": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/05-02_combination_pliers_big.jpg/500px-05-02_combination_pliers_big.jpg",
  // Remachadora Manual Reforzada 10.5 Pulg
  "REM-MAN-11": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Pop_rivet_gun.jpeg/500px-Pop_rivet_gun.jpeg",
  // Juego de Brocas para Concreto y Metal (16 Pzs)
  "BRO-16PZ-12": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Another_collection_of_drill_bits.PNG/500px-Another_collection_of_drill_bits.PNG",
  // Caja de Herramientas Plástica de Alto Impacto 19 Pulg
  "CAJ-19P-13": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Transparent_plastic_box_with_tools_-_28_x_10_cm.jpg/500px-Transparent_plastic_box_with_tools_-_28_x_10_cm.jpg",
  // Soldadora Inverter Portátil 200A MMA / TIG LIFT
  "SOL-200A-14": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Creston_2026-08-12_products_01.jpg/500px-Creston_2026-08-12_products_01.jpg",
  // Tornillo de Banco Giratorio de Acero 4 Pulg
  "TRN-4P-15": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/An_engineer%27s_vise.jpg/500px-An_engineer%27s_vise.jpg",

  // =========================================================================
  // 2. ROPA Y TEXTILES (15 Productos)
  // =========================================================================
  // Polo Oversize Heavyweight 240g Cuello Redondo
  "POL-HVY-16": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ironed_black_T-shirt_%28001%29.JPG/500px-Ironed_black_T-shirt_%28001%29.JPG",
  // Pantalón Cargo Ripstop con 6 Bolsillos Reforzados
  "PAN-CRG-17": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Cargo_pants_001.jpg/500px-Cargo_pants_001.jpg",
  // Casaca Cortavientos Térmica Impermeable Softshell
  "CAS-CRV-18": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Windbreaker_Jacket%2C_Hood_Outside.jpg/500px-Windbreaker_Jacket%2C_Hood_Outside.jpg",
  // Polera Hoodie Franela Reactiva con Capucha
  "POL-HOD-19": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&h=500&q=80",
  // Chaleco Reflectivo Alta Visibilidad Tipo Ingeniero
  "CHA-REF-20": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Warnweste_gelb.jpg/500px-Warnweste_gelb.jpg",
  // Camisa de Trabajo Algodón Drill Manga Larga
  "CAM-TRB-21": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=500&h=500&q=80",
  // Jean Denim Clásico 14oz Doble Costura
  "JEA-DNM-22": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&h=500&q=80",
  // Gorra Táctica Ripstop con Velcro para Parche
  "GOR-TAC-23": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/C-SPAN_hat_Black.JPG/500px-C-SPAN_hat_Black.JPG",
  // Calcetines Térmicos de Trabajo con Puntera Reforzada (Pack x 3)
  "CAL-TRB-24": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Socks%2C_pair_of_%28AM_13364-2%29.jpg/500px-Socks%2C_pair_of_%28AM_13364-2%29.jpg",
  // Overol Industrial Manga Larga con Cierre Doble Vía Drill
  "OVE-IND-25": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Boilersuit2.jpg/500px-Boilersuit2.jpg",
  // Short Deportivo Transpirable Secado Rápido
  "SHT-DEP-26": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Running-shorts-black.png/500px-Running-shorts-black.png",
  // Polo Camisero Piqué 100% Algodón Manga Corta
  "POL-PIQ-27": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/WP_polo_shirt_FRONT_Merchandise_shots-24_cropped.jpg/500px-WP_polo_shirt_FRONT_Merchandise_shots-24_cropped.jpg",
  // Chompa de Hilo Clásica Cuello V Tejido Fino
  "CHO-HIL-28": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Grey_knitted_sweater.jpg/500px-Grey_knitted_sweater.jpg",
  // Faja Lumbar Ortopédica con Doble Ajuste y Ballenas
  "FAJ-LUM-29": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/LiftingBelt.JPG/500px-LiftingBelt.JPG",
  // Bandana Tubular Multifuncional con Protección UV
  "BAN-TUB-30": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Buff-wristband.JPG/500px-Buff-wristband.JPG",

  // =========================================================================
  // 3. CALZADO DE SEGURIDAD (8 Productos)
  // =========================================================================
  // Bota de Seguridad de Cuero con Puntera de Acero ASTM
  "BOT-ACR-31": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/S3_safety_footwear.jpg/500px-S3_safety_footwear.jpg",
  // Botín Dieléctrico de Seguridad Puntera Composite 18kV
  "BOT-DIE-32": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Caterpillar_Outline_steel_toe_work_boots.jpg/500px-Caterpillar_Outline_steel_toe_work_boots.jpg",
  // Zapatilla Industrial Ultraligera con Puntera Fibra de Vidrio
  "ZAP-IND-33": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/DeWalt_Newark_steel_toe_work_boots.jpg/500px-DeWalt_Newark_steel_toe_work_boots.jpg",
  // Bota de Jebe Impermeable Caña Alta Blanca Sanitaria
  "BOT-JEB-34": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Wellington_boots_in_Wellington_Road%2C_Oxton.JPG/500px-Wellington_boots_in_Wellington_Road%2C_Oxton.JPG",
  // Plantilla Ortopédica Antifatiga de Gel Termoplástico
  "PLA-GEL-35": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Rockport_shoe_insole._Torsion_system_technology_by_Adidas_printing.jpg/500px-Rockport_shoe_insole._Torsion_system_technology_by_Adidas_printing.jpg",
  // Pasadores Redondos Reforzados Kevlar 120cm (Pack x 2)
  "PAS-KEV-36": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Shoelaces_20050719_001.jpg/500px-Shoelaces_20050719_001.jpg",
  // Bota para Soldador Cuero Cromo con Polaina de Descarne
  "BOT-SLD-37": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Haix_boots.jpg/500px-Haix_boots.jpg",
  // Grasa Abrillantadora Nutritiva para Cuero 200ml
  "GRA-CUE-38": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Reutter_Kavallo_Horse_Shoe_Polish_Tin_1930s_picture_1.JPG/500px-Reutter_Kavallo_Horse_Shoe_Polish_Tin_1930s_picture_1.JPG",

  // =========================================================================
  // 4. EQUIPOS DE PROTECCIÓN (EPP) (8 Productos)
  // =========================================================================
  // Lentes de Seguridad Antirayadura y Antiempañante ANSI Z87+
  "LEN-SEG-39": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/2023_Okulary_ochronne_%281%29.jpg/500px-2023_Okulary_ochronne_%281%29.jpg",
  // Guantes de Nitrilo Negro Extra Resistente (Caja x 100)
  "GUA-NIT-40": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Disposable_nitrile_glove.jpg",
  // Casco de Seguridad Industrial Tipo Jockey con Ratchet ANSI
  "CAS-SEG-41": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Yellow_hard_hat.jpg/500px-Yellow_hard_hat.jpg",
  // Respirador de Media Cara de Silicona Doble Filtro
  "RES-MED-42": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/HEPA_half-face_respirator.jpg/500px-HEPA_half-face_respirator.jpg",
  // Orejeras Antirruido Tipo Copa Aislante NRR 28dB
  "ORE-ANT-43": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Ear_muff_white_bg.jpg/500px-Ear_muff_white_bg.jpg",
  // Guantes de Cuero Badana para Conductor y Maniobra
  "GUA-BAD-44": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Leather_work_gloves_composite_P1010224_copy.jpg/500px-Leather_work_gloves_composite_P1010224_copy.jpg",
  // Arnés de Seguridad de Cuerpo Entero 4 Anillos ANSI
  "ARN-SEG-45": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Worker_with_safety_harness_%289248564334%29.jpg/500px-Worker_with_safety_harness_%289248564334%29.jpg",
  // Tapones de Oído de Silicona Reutilizables con Cordón NRR 25dB
  "TAP-OIDO-46": "https://upload.wikimedia.org/wikipedia/commons/b/b8/Disposable_foam_earplugs.jpg",

  // =========================================================================
  // 5. ILUMINACIÓN Y ELECTRICIDAD (6 Productos)
  // =========================================================================
  // Reflector LED Exterior 100W IP66 Luz Blanca Fría
  "REF-100W-47": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Security_light.jpg/500px-Security_light.jpg",
  // Extensión Eléctrica Industrial Vulcanizada 20 Metros 3x14 AWG
  "EXT-20M-48": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Verlengsnoer_op_haspel_%28extension_cord%29.jpg/500px-Verlengsnoer_op_haspel_%28extension_cord%29.jpg",
  // Linterna Frontal de Cabeza LED Recargable USB 500 Lumens
  "LIN-CAB-49": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Petzl_LED_outdoor_headlamp%2C_off_position_in_Prague.jpg/500px-Petzl_LED_outdoor_headlamp%2C_off_position_in_Prague.jpg",
  // Foco LED Alta Potencia 50W Rosca E27 6500K
  "FOC-50W-50": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/GE_LED_Energy_Smart.JPG/500px-GE_LED_Energy_Smart.JPG",
  // Multímetro Digital Automático True RMS con Medición NCV
  "MUL-RMS-51": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Proster_VC99_Multimeter_%2824605584476%29.png/500px-Proster_VC99_Multimeter_%2824605584476%29.png",
  // Cinta Aislante Profesional de PVC 20 Metros (Pack x 5)
  "CIN-AIS-52": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Electrical-tape_black.jpg/500px-Electrical-tape_black.jpg",
};

async function testUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LuminaWholesalePOS/1.0",
        Range: "bytes=0-50",
      },
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Iniciando verificación en vivo de las 52 imágenes reales de productos...\n");
  const entries = Object.entries(CURATED_52_REAL_IMAGES);
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const [sku, url] = entries[i];
    const ok = await testUrl(url);
    if (!ok) {
      console.error(`❌ [${i + 1}/${entries.length}] Falla de red en ${sku}: ${url}`);
      failed++;
    } else {
      console.log(`✅ [${i + 1}/${entries.length}] ${sku} validada HTTP 200/206.`);
    }
  }

  if (failed > 0) {
    console.error(`\nSe encontraron ${failed} URLs con error. Abortando actualización.`);
    process.exit(1);
  }

  console.log(`\n🎉 ¡Las 52 imágenes fueron validadas exitosamente con HTTP 200 en vivo!`);

  // Actualizar base de datos Supabase PostgreSQL
  console.log("\nActualizando tabla Producto en la base de datos PostgreSQL...");
  let dbUpdated = 0;
  for (const [sku, url] of entries) {
    const res = await prisma.producto.updateMany({
      where: { codigoSku: sku },
      data: { imagenUrl: url },
    });
    dbUpdated += res.count;
  }
  console.log(`✅ Base de datos actualizada: ${dbUpdated} productos ahora tienen fotos reales verificadas.`);
}

main().finally(() => prisma.$disconnect());
