import { normalizeText } from "../catalog/variants";

export interface SearchableVariant {
  id: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  ubicacion?: string | null;
  stockActual: number;
}

export interface SearchableProduct {
  id: string;
  nombre: string;
  codigoSku?: string | null;
  categoriaNombre?: string | null;
  precioLiquidacion: number;
  precioOriginal?: number;
  imagenUrl?: string | null;
  variantes: SearchableVariant[];
}

export interface SearchOptions {
  categoriaId?: string;
  categoriaNombre?: string;
  onlyInStock?: boolean;
  limit?: number;
}

export interface SearchResultItem {
  producto: SearchableProduct;
  score: number;
  varianteCoincidente?: SearchableVariant;
}

/**
 * Normaliza y tokeniza una cadena de consulta.
 */
function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Motor de búsqueda difusa en memoria local con latencia de 0ms y ordenamiento por relevancia.
 */
export function searchInMemoryCatalog(
  catalog: SearchableProduct[],
  query: string,
  options: SearchOptions = {}
): SearchableProduct[] {
  if (!Array.isArray(catalog) || catalog.length === 0) return [];

  const rawQuery = (query || "").trim();
  const tokens = tokenizeQuery(rawQuery);

  // 1. Filtrado previo de catálogo
  let workingCatalog = catalog;

  if (options.categoriaNombre) {
    const targetCat = normalizeText(options.categoriaNombre).toLowerCase();
    workingCatalog = workingCatalog.filter(
      (p) => normalizeText(p.categoriaNombre || "").toLowerCase() === targetCat
    );
  }

  if (options.onlyInStock) {
    workingCatalog = workingCatalog.filter((p) =>
      p.variantes.some((v) => v.stockActual > 0)
    );
  }

  // Si la consulta está vacía, retornar el catálogo filtrado
  if (tokens.length === 0) {
    return options.limit ? workingCatalog.slice(0, options.limit) : workingCatalog;
  }

  const cleanQuery = normalizeText(rawQuery).toLowerCase();
  const scoredResults: SearchResultItem[] = [];

  for (const prod of workingCatalog) {
    const normName = normalizeText(prod.nombre).toLowerCase();
    const normSku = normalizeText(prod.codigoSku || "").toLowerCase();
    const normCat = normalizeText(prod.categoriaNombre || "").toLowerCase();

    // Crear un string searchable con todas las variantes asociadas
    const variantStrings = prod.variantes.map((v) => ({
      variant: v,
      text: `${normalizeText(v.sku)} ${normalizeText(v.talla || "")} ${normalizeText(v.color || "")} ${normalizeText(v.ubicacion || "")}`.toLowerCase(),
    }));

    // El producto debe coincidir con TODOS los tokens buscados (AND lógico)
    const matchesAllTokens = tokens.every((token) => {
      const matchInProd = normName.includes(token) || normSku.includes(token) || normCat.includes(token);
      const matchInVariants = variantStrings.some((vs) => vs.text.includes(token));
      return matchInProd || matchInVariants;
    });

    if (!matchesAllTokens) continue;

    // Calcular puntaje de relevancia
    let score = 0;
    let bestVariant: SearchableVariant | undefined = undefined;

    // Coincidencia exacta de SKU Base
    if (normSku === cleanQuery) {
      score += 100;
    } else if (normSku.startsWith(cleanQuery)) {
      score += 60;
    }

    // Coincidencias en Variantes
    for (const { variant, text } of variantStrings) {
      const normVarSku = normalizeText(variant.sku).toLowerCase();
      if (normVarSku === cleanQuery) {
        score += 120;
        bestVariant = variant;
      } else if (normVarSku.startsWith(cleanQuery)) {
        score += 70;
        bestVariant = variant;
      } else if (cleanQuery.includes(normVarSku)) {
        score += 50;
        bestVariant = variant;
      }
    }

    // Coincidencias en Nombre
    if (normName === cleanQuery) {
      score += 80;
    } else if (normName.startsWith(cleanQuery)) {
      score += 50;
    } else if (normName.includes(cleanQuery)) {
      score += 35;
    }

    // Puntaje por token individual
    tokens.forEach((token) => {
      if (normName.includes(token)) score += 15;
      if (normSku.includes(token)) score += 20;
      variantStrings.forEach(({ text }) => {
        if (text.includes(token)) score += 10;
      });
    });

    // Bonificación si tiene stock disponible
    const hasAvailableStock = prod.variantes.some((v) => v.stockActual > 0);
    if (hasAvailableStock) {
      score += 10;
    }

    scoredResults.push({
      producto: prod,
      score,
      varianteCoincidente: bestVariant,
    });
  }

  // Ordenar por score descendente
  scoredResults.sort((a, b) => b.score - a.score);

  const finalProducts = scoredResults.map((r) => r.producto);
  return options.limit ? finalProducts.slice(0, options.limit) : finalProducts;
}
