/**
 * Mapeo curado de imágenes de alta resolución (cuadradas, estilo e-commerce)
 * para los productos del catálogo de liquidación Lumina Wholesale POS.
 */

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Herramientas y Ferretería":
    "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&h=400&q=80",
  "Ropa y Textiles":
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&h=400&q=80",
  "Calzado de Seguridad":
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&h=400&q=80",
  "Equipos de Protección (EPP)":
    "https://images.unsplash.com/photo-1578873375969-d60fa62c8b6e?auto=format&fit=crop&w=400&h=400&q=80",
  "Iluminación y Electricidad":
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&h=400&q=80",
  General:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&h=400&q=80",
};

/**
 * Catálogo visual curado por SKU o término clave de producto
 */
export const PRODUCT_SPECIFIC_IMAGES: Record<string, string> = {
  // --- Herramientas y Ferretería ---
  "TLD-20V-01": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&h=400&q=80", // Taladro
  "AMO-850-02": "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&h=400&q=80", // Amoladora
  "LLV-CRV-03": "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&h=400&q=80", // Llaves
  "SIE-1500-04": "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&w=400&h=400&q=80", // Sierra
  "MAR-16OZ-05": "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&h=400&q=80", // Martillo
  "DST-24PZ-06": "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&h=400&q=80", // Destornilladores
  "LSR-12L-07": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&h=400&q=80", // Nivel láser
  "WIN-8M-08": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&h=400&q=80", // Cinta métrica
  "PST-2000-09": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&h=400&q=80", // Pistola calor
  "ALI-8P-10": "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&h=400&q=80", // Alicate
  "REM-MAN-11": "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&h=400&q=80", // Remachadora
  "BRO-16PZ-12": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&h=400&q=80", // Brocas
  "CAJ-19P-13": "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&h=400&q=80", // Caja herramientas
  "SOL-200A-14": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=400&h=400&q=80", // Soldadora
  "TRN-4P-15": "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&h=400&q=80", // Tornillo banco

  // --- Ropa y Textiles ---
  "POL-HVY-16": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&h=400&q=80", // Polo oversize
  "PAN-CRG-17": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=400&h=400&q=80", // Pantalón cargo
  "CAS-CRV-18": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&h=400&q=80", // Casaca
  "POL-HOD-19": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=400&h=400&q=80", // Hoodie
  "CHA-REF-20": "https://images.unsplash.com/photo-1578873375969-d60fa62c8b6e?auto=format&fit=crop&w=400&h=400&q=80", // Chaleco reflectivo
  "CAM-TRB-21": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&h=400&q=80", // Camisa trabajo
  "PAN-DRL-22": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&h=400&q=80", // Pantalón drill
  "GOR-DRL-23": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&h=400&q=80", // Gorro
  "CHO-TRA-24": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=400&h=400&q=80", // Short trabajo
  "POL-MAN-25": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=400&h=400&q=80", // Polo manga larga
  "DEL-CUE-26": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&h=400&q=80", // Mandil cuero
  "POL-PIQ-27": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=400&h=400&q=80", // Polo piqué
  "CAS-TER-28": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&h=400&q=80", // Casaca térmica
  "FAJ-LUM-29": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&h=400&q=80", // Faja lumbar
  "BAN-TUB-30": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&h=400&q=80", // Bandana

  // --- Calzado de Seguridad ---
  "BOT-ACR-31": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&h=400&q=80", // Bota acero
  "BOT-DIE-32": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&h=400&q=80", // Botín dieléctrico
  "ZAP-IND-33": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&h=400&q=80", // Zapatilla industrial
  "BOT-JEB-34": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&h=400&q=80", // Bota jebe
  "PLA-GEL-35": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=400&h=400&q=80", // Plantilla gel
  "PAS-KEV-36": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&h=400&q=80", // Pasadores
  "BOT-SLD-37": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&h=400&q=80", // Bota soldador
  "GRA-CUE-38": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=400&h=400&q=80", // Grasa cuero

  // --- Equipos de Protección (EPP) ---
  "LEN-SEG-39": "https://images.unsplash.com/photo-1577741314755-048d8525d31e?auto=format&fit=crop&w=400&h=400&q=80", // Lentes
  "GUA-NIT-40": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=400&h=400&q=80", // Guantes nitrilo
  "CAS-SEG-41": "https://images.unsplash.com/photo-1578873375969-d60fa62c8b6e?auto=format&fit=crop&w=400&h=400&q=80", // Casco
  "RES-MED-42": "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=400&h=400&q=80", // Respirador
  "ORE-ANT-43": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&h=400&q=80", // Orejeras
  "GUA-BAD-44": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=400&h=400&q=80", // Guantes badana
  "ARN-SEG-45": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&h=400&q=80", // Arnés
  "TAP-OIDO-46": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&h=400&q=80", // Tapones oído

  // --- Iluminación y Electricidad ---
  "REF-100W-47": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&h=400&q=80", // Reflector
  "EXT-20M-48": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&h=400&q=80", // Extensión
  "LIN-CAB-49": "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=400&h=400&q=80", // Linterna frontal
  "FOC-50W-50": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&h=400&q=80", // Foco LED
  "MUL-RMS-51": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&h=400&q=80", // Multímetro
  "CIN-AIS-52": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&h=400&q=80", // Cinta aislante
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
  // 1. Imagen explícita si existe
  if (product.imagenUrl && product.imagenUrl.trim().length > 0) {
    return product.imagenUrl;
  }

  // 2. Mapeo específico por SKU
  if (product.codigoSku && PRODUCT_SPECIFIC_IMAGES[product.codigoSku]) {
    return PRODUCT_SPECIFIC_IMAGES[product.codigoSku];
  }

  // 3. Fallback por categoría
  if (product.categoriaNombre && CATEGORY_FALLBACK_IMAGES[product.categoriaNombre]) {
    return CATEGORY_FALLBACK_IMAGES[product.categoriaNombre];
  }

  // 4. Búsqueda por palabras clave en el nombre
  const name = (product.nombre || "").toLowerCase();
  if (name.includes("taladro") || name.includes("amoladora") || name.includes("herramienta")) {
    return CATEGORY_FALLBACK_IMAGES["Herramientas y Ferretería"];
  }
  if (name.includes("polo") || name.includes("pantalon") || name.includes("casaca") || name.includes("camisa")) {
    return CATEGORY_FALLBACK_IMAGES["Ropa y Textiles"];
  }
  if (name.includes("bota") || name.includes("botin") || name.includes("zapatilla") || name.includes("calzado")) {
    return CATEGORY_FALLBACK_IMAGES["Calzado de Seguridad"];
  }
  if (name.includes("lente") || name.includes("guante") || name.includes("casco") || name.includes("epp")) {
    return CATEGORY_FALLBACK_IMAGES["Equipos de Protección (EPP)"];
  }
  if (name.includes("led") || name.includes("foco") || name.includes("extension") || name.includes("multimetro")) {
    return CATEGORY_FALLBACK_IMAGES["Iluminación y Electricidad"];
  }

  return CATEGORY_FALLBACK_IMAGES["General"];
}
