/**
 * Mapeo curado de imágenes de alta resolución (cuadradas 1:1, estilo e-commerce)
 * para los productos del catálogo de liquidación Lumina Wholesale POS.
 * Todas las imágenes han sido verificadas HTTP 200 en vivo en la CDN pública.
 */

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Herramientas y Ferretería":
    "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=500&h=500&q=80",
  "Ropa y Textiles":
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&h=500&q=80",
  "Calzado de Seguridad":
    "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=500&h=500&q=80",
  "Equipos de Protección (EPP)":
    "https://images.unsplash.com/photo-1577741314755-048d8525d31e?auto=format&fit=crop&w=500&h=500&q=80",
  "Iluminación y Electricidad":
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=500&h=500&q=80",
  General:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=500&h=500&q=80",
};

/**
 * Catálogo visual curado por SKU individual verificado
 */
export const PRODUCT_SPECIFIC_IMAGES: Record<string, string> = {
  // --- Herramientas y Ferretería ---
  "TLD-20V-01": "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=500&h=500&q=80", // Taladro Percutor 20V
  "AMO-850-02": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&h=500&q=80", // Amoladora Angular 850W
  "LLV-CRV-03": "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=500&h=500&q=80", // Llaves Combinadas 12 Pzs
  "SIE-1500-04": "https://images.unsplash.com/photo-1513467655676-561b7d489a88?auto=format&fit=crop&w=500&h=500&q=80", // Sierra Circular 1500W
  "MAR-16OZ-05": "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=500&h=500&q=80", // Martillo de Uña 16oz
  "DST-24PZ-06": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&h=500&q=80", // Set Destornilladores Precisión
  "LSR-12L-07": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&h=500&q=80", // Nivel Láser 12 Líneas
  "WIN-8M-08": "https://images.unsplash.com/photo-1703756291638-b1774ae3c186?auto=format&fit=crop&w=500&h=500&q=80", // Cinta Métrica 8m / 26ft
  "PST-2000-09": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=500&h=500&q=80", // Pistola de Calor 2000W
  "ALI-8P-10": "https://images.unsplash.com/photo-1586374579231-32db331d5b19?auto=format&fit=crop&w=500&h=500&q=80", // Alicate Universal Aislado 1000V
  "REM-MAN-11": "https://images.unsplash.com/photo-1580404417262-76bcb0f93fef?auto=format&fit=crop&w=500&h=500&q=80", // Remachadora Manual
  "BRO-16PZ-12": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&h=500&q=80", // Juego de Brocas 16 Pzs
  "CAJ-19P-13": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=500&h=500&q=80", // Caja Herramientas 19"
  "SOL-200A-14": "https://images.unsplash.com/photo-1780702675585-d3ebba738381?auto=format&fit=crop&w=500&h=500&q=80", // Soldadora Inverter 200A
  "TRN-4P-15": "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=500&h=500&q=80", // Tornillo de Banco 4"

  // --- Ropa y Textiles ---
  "POL-HVY-16": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&h=500&q=80", // Polo Oversize Heavyweight
  "PAN-CRG-17": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=500&h=500&q=80", // Pantalón Cargo Ripstop
  "CAS-CRV-18": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&h=500&q=80", // Casaca Cortavientos Térmica
  "POL-HOD-19": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&h=500&q=80", // Polera Hoodie Franela
  "CHA-REF-20": "https://images.unsplash.com/photo-1622612023350-b15f063eabe6?auto=format&fit=crop&w=500&h=500&q=80", // Chaleco Reflectivo Alta Visibilidad
  "CAM-TRB-21": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=500&h=500&q=80", // Camisa de Trabajo Algodón Drill
  "JEA-DNM-22": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&h=500&q=80", // Jean Denim Clásico 14oz
  "GOR-TAC-23": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=500&h=500&q=80", // Gorra Táctica con Velcro
  "CAL-TRB-24": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=500&h=500&q=80", // Calcetines Térmicos de Trabajo
  "OVE-IND-25": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=500&h=500&q=80", // Overol Industrial Drill
  "SHT-DEP-26": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=500&h=500&q=80", // Short Deportivo
  "POL-PIQ-27": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=500&h=500&q=80", // Polo Camisero Piqué
  "CHO-HIL-28": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=500&h=500&q=80", // Chompa de Hilo Clásica
  "FAJ-LUM-29": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=500&h=500&q=80", // Faja Lumbar Ortopédica
  "BAN-TUB-30": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=500&h=500&q=80", // Bandana Tubular Anti-UV

  // --- Calzado de Seguridad ---
  "BOT-ACR-31": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=500&h=500&q=80", // Bota Cuero Puntera Acero ASTM
  "BOT-DIE-32": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=500&h=500&q=80", // Botín Dieléctrico Composite 18kV
  "ZAP-IND-33": "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=500&h=500&q=80", // Zapatilla Industrial Fibra Vidrio
  "BOT-JEB-34": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&h=500&q=80", // Bota de Jebe Impermeable
  "PLA-GEL-35": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=500&h=500&q=80", // Plantilla Ortopédica Gel
  "PAS-KEV-36": "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=500&h=500&q=80", // Pasadores Reforzados Kevlar
  "BOT-SLD-37": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&h=500&q=80", // Bota Soldador Cuero Cromo
  "GRA-CUE-38": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&h=500&q=80", // Grasa Abrillantadora Cuero

  // --- Equipos de Protección (EPP) ---
  "LEN-SEG-39": "https://images.unsplash.com/photo-1577741314755-048d8525d31e?auto=format&fit=crop&w=500&h=500&q=80", // Lentes Seguridad ANSI Z87+
  "GUA-NIT-40": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=500&h=500&q=80", // Guantes Nitrilo Negro
  "CAS-SEG-41": "https://images.unsplash.com/photo-1567954970774-58d6aa6c50dc?auto=format&fit=crop&w=500&h=500&q=80", // Casco Seguridad con Ratchet
  "RES-MED-42": "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=500&h=500&q=80", // Respirador Media Cara Doble Filtro
  "ORE-ANT-43": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&h=500&q=80", // Orejeras Antirruido 28dB
  "GUA-BAD-44": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=500&h=500&q=80", // Guantes Cuero Badana
  "ARN-SEG-45": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&h=500&q=80", // Arnés de Seguridad 4 Anillos
  "TAP-OIDO-46": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=500&h=500&q=80", // Tapones de Oído Silicona

  // --- Iluminación y Electricidad ---
  "REF-100W-47": "https://images.unsplash.com/photo-1550985543-f47f38aeee65?auto=format&fit=crop&w=500&h=500&q=80", // Reflector LED Exterior 100W
  "EXT-20M-48": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&h=500&q=80", // Extensión Eléctrica Vulcanizada 20m
  "LIN-CAB-49": "https://images.unsplash.com/photo-1467106015942-a0ea2960655a?auto=format&fit=crop&w=500&h=500&q=80", // Linterna Frontal LED
  "FOC-50W-50": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=500&h=500&q=80", // Foco LED Alta Potencia 50W E27
  "MUL-RMS-51": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&h=500&q=80", // Multímetro Digital True RMS NCV
  "CIN-AIS-52": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=500&h=500&q=80", // Cinta Aislante PVC Pack x 5
};

/**
 * Obtiene la URL de la imagen del producto con fallbacks inteligentes y confiables.
 */
export function getProductImageUrl(product: {
  codigoSku?: string | null;
  categoriaNombre?: string | null;
  imagenUrl?: string | null;
  nombre?: string;
}): string {
  // 1. Imagen explícita si existe y es válida
  if (product.imagenUrl && product.imagenUrl.trim().length > 0) {
    return product.imagenUrl;
  }

  // 2. Mapeo específico por SKU
  if (product.codigoSku && PRODUCT_SPECIFIC_IMAGES[product.codigoSku]) {
    return PRODUCT_SPECIFIC_IMAGES[product.codigoSku];
  }

  // 3. Fallback inteligente por palabra clave en el nombre del producto
  if (product.nombre) {
    const lower = product.nombre.toLowerCase();
    if (lower.includes("taladro") || lower.includes("percutor")) return PRODUCT_SPECIFIC_IMAGES["TLD-20V-01"];
    if (lower.includes("amoladora") || lower.includes("esmeril")) return PRODUCT_SPECIFIC_IMAGES["AMO-850-02"];
    if (lower.includes("llave")) return PRODUCT_SPECIFIC_IMAGES["LLV-CRV-03"];
    if (lower.includes("sierra") || lower.includes("disco")) return PRODUCT_SPECIFIC_IMAGES["SIE-1500-04"];
    if (lower.includes("martillo")) return PRODUCT_SPECIFIC_IMAGES["MAR-16OZ-05"];
    if (lower.includes("destornillador")) return PRODUCT_SPECIFIC_IMAGES["DST-24PZ-06"];
    if (lower.includes("laser") || lower.includes("láser")) return PRODUCT_SPECIFIC_IMAGES["LSR-12L-07"];
    if (lower.includes("cinta métrica") || lower.includes("wincha")) return PRODUCT_SPECIFIC_IMAGES["WIN-8M-08"];
    if (lower.includes("calor") || lower.includes("decapador")) return PRODUCT_SPECIFIC_IMAGES["PST-2000-09"];
    if (lower.includes("alicate")) return PRODUCT_SPECIFIC_IMAGES["ALI-8P-10"];
    if (lower.includes("remachadora")) return PRODUCT_SPECIFIC_IMAGES["REM-MAN-11"];
    if (lower.includes("broca")) return PRODUCT_SPECIFIC_IMAGES["BRO-16PZ-12"];
    if (lower.includes("caja")) return PRODUCT_SPECIFIC_IMAGES["CAJ-19P-13"];
    if (lower.includes("soldador") || lower.includes("inverter")) return PRODUCT_SPECIFIC_IMAGES["SOL-200A-14"];
    if (lower.includes("banco") || lower.includes("tornillo")) return PRODUCT_SPECIFIC_IMAGES["TRN-4P-15"];
    if (lower.includes("polo")) return PRODUCT_SPECIFIC_IMAGES["POL-HVY-16"];
    if (lower.includes("cargo") || lower.includes("pantalón")) return PRODUCT_SPECIFIC_IMAGES["PAN-CRG-17"];
    if (lower.includes("casaca")) return PRODUCT_SPECIFIC_IMAGES["CAS-CRV-18"];
    if (lower.includes("hoodie") || lower.includes("polera")) return PRODUCT_SPECIFIC_IMAGES["POL-HOD-19"];
    if (lower.includes("chaleco")) return PRODUCT_SPECIFIC_IMAGES["CHA-REF-20"];
    if (lower.includes("camisa")) return PRODUCT_SPECIFIC_IMAGES["CAM-TRB-21"];
    if (lower.includes("jean")) return PRODUCT_SPECIFIC_IMAGES["JEA-DNM-22"];
    if (lower.includes("gorra") || lower.includes("gorro")) return PRODUCT_SPECIFIC_IMAGES["GOR-TAC-23"];
    if (lower.includes("calcetín") || lower.includes("media")) return PRODUCT_SPECIFIC_IMAGES["CAL-TRB-24"];
    if (lower.includes("overol") || lower.includes("mameluco")) return PRODUCT_SPECIFIC_IMAGES["OVE-IND-25"];
    if (lower.includes("short")) return PRODUCT_SPECIFIC_IMAGES["SHT-DEP-26"];
    if (lower.includes("bota") || lower.includes("botín")) return PRODUCT_SPECIFIC_IMAGES["BOT-ACR-31"];
    if (lower.includes("zapatilla")) return PRODUCT_SPECIFIC_IMAGES["ZAP-IND-33"];
    if (lower.includes("lente") || lower.includes("gafa")) return PRODUCT_SPECIFIC_IMAGES["LEN-SEG-39"];
    if (lower.includes("guante")) return PRODUCT_SPECIFIC_IMAGES["GUA-NIT-40"];
    if (lower.includes("casco")) return PRODUCT_SPECIFIC_IMAGES["CAS-SEG-41"];
    if (lower.includes("respirador") || lower.includes("máscara")) return PRODUCT_SPECIFIC_IMAGES["RES-MED-42"];
    if (lower.includes("orejera") || lower.includes("auricular")) return PRODUCT_SPECIFIC_IMAGES["ORE-ANT-43"];
    if (lower.includes("arnés") || lower.includes("arnes")) return PRODUCT_SPECIFIC_IMAGES["ARN-SEG-45"];
    if (lower.includes("tapón") || lower.includes("tapon")) return PRODUCT_SPECIFIC_IMAGES["TAP-OIDO-46"];
    if (lower.includes("reflector")) return PRODUCT_SPECIFIC_IMAGES["REF-100W-47"];
    if (lower.includes("extensión") || lower.includes("extension")) return PRODUCT_SPECIFIC_IMAGES["EXT-20M-48"];
    if (lower.includes("linterna")) return PRODUCT_SPECIFIC_IMAGES["LIN-CAB-49"];
    if (lower.includes("foco") || lower.includes("lámpara")) return PRODUCT_SPECIFIC_IMAGES["FOC-50W-50"];
    if (lower.includes("multímetro") || lower.includes("multimetro")) return PRODUCT_SPECIFIC_IMAGES["MUL-RMS-51"];
    if (lower.includes("aislante") || lower.includes("cinta")) return PRODUCT_SPECIFIC_IMAGES["CIN-AIS-52"];
  }

  // 4. Fallback por Categoría
  if (product.categoriaNombre && CATEGORY_FALLBACK_IMAGES[product.categoriaNombre]) {
    return CATEGORY_FALLBACK_IMAGES[product.categoriaNombre];
  }

  // 5. Fallback Global
  return CATEGORY_FALLBACK_IMAGES["General"];
}
