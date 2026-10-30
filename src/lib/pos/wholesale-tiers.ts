export interface WholesaleTier {
  minQty: number;
  maxQty?: number;
  discountPercentage: number;
  label: string;
  badgeText: string;
}

export const WHOLESALE_TIERS: WholesaleTier[] = [
  {
    minQty: 12,
    discountPercentage: 15,
    label: "Docena o Fardo Mayorista",
    badgeText: "15% Mayorista (12+ un.)",
  },
  {
    minQty: 6,
    maxQty: 11,
    discountPercentage: 10,
    label: "Media Docena Mayorista",
    badgeText: "10% Mayorista (6-11 un.)",
  },
  {
    minQty: 3,
    maxQty: 5,
    discountPercentage: 5,
    label: "Paquete por Lote",
    badgeText: "5% Lote (3-5 un.)",
  },
];

/**
 * Determina el nivel de escala mayorista elegible según el total de unidades compradas en el ticket.
 */
export function getEligibleWholesaleTier(totalItems: number): WholesaleTier | null {
  if (totalItems < 3) return null;

  for (const tier of WHOLESALE_TIERS) {
    if (totalItems >= tier.minQty) {
      if (tier.maxQty === undefined || totalItems <= tier.maxQty) {
        return tier;
      }
    }
  }

  return null;
}

/**
 * Calcula el ahorro en Soles si se aplica la escala mayorista al subtotal del ticket.
 */
export function calculateWholesaleSavings(subtotal: number, tier: WholesaleTier): number {
  if (subtotal <= 0) return 0;
  const savings = (subtotal * tier.discountPercentage) / 100;
  return Math.round(savings * 100) / 100;
}
