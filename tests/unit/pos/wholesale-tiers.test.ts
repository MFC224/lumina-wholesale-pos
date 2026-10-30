import { describe, it, expect } from "vitest";
import {
  getEligibleWholesaleTier,
  calculateWholesaleSavings,
  WHOLESALE_TIERS,
} from "@/lib/pos/wholesale-tiers";

describe("Módulo de Escalas Mayoristas y Remate por Lote (Sprint 4)", () => {
  it("debe retornar null si la cantidad de ítems es menor a 3 (no aplica tarifa mayorista)", () => {
    expect(getEligibleWholesaleTier(0)).toBeNull();
    expect(getEligibleWholesaleTier(1)).toBeNull();
    expect(getEligibleWholesaleTier(2)).toBeNull();
  });

  it("debe aplicar 5% de descuento para paquetes de 3 a 5 unidades", () => {
    const tier3 = getEligibleWholesaleTier(3);
    expect(tier3).not.toBeNull();
    expect(tier3?.discountPercentage).toBe(5);

    const tier5 = getEligibleWholesaleTier(5);
    expect(tier5).not.toBeNull();
    expect(tier5?.discountPercentage).toBe(5);
  });

  it("debe aplicar 10% de descuento para media docena (6 a 11 unidades)", () => {
    const tier6 = getEligibleWholesaleTier(6);
    expect(tier6).not.toBeNull();
    expect(tier6?.discountPercentage).toBe(10);

    const tier11 = getEligibleWholesaleTier(11);
    expect(tier11).not.toBeNull();
    expect(tier11?.discountPercentage).toBe(10);
  });

  it("debe aplicar 15% de descuento para fardos y lotes de 12 unidades o más (docena)", () => {
    const tier12 = getEligibleWholesaleTier(12);
    expect(tier12).not.toBeNull();
    expect(tier12?.discountPercentage).toBe(15);

    const tier50 = getEligibleWholesaleTier(50);
    expect(tier50).not.toBeNull();
    expect(tier50?.discountPercentage).toBe(15);
  });

  it("debe calcular el ahorro exacto en Soles para una compra con escala mayorista", () => {
    const tier = WHOLESALE_TIERS.find((t) => t.discountPercentage === 10)!;
    // Subtotal S/. 280.00 al 10% = S/. 28.00
    const savings = calculateWholesaleSavings(280, tier);
    expect(savings).toBe(28.0);
  });

  it("debe redondear adecuadamente los centavos en Soles", () => {
    const tier = WHOLESALE_TIERS.find((t) => t.discountPercentage === 15)!;
    // Subtotal S/. 345.50 al 15% = 51.825 -> 51.83 Soles
    const savings = calculateWholesaleSavings(345.5, tier);
    expect(savings).toBe(51.83);
  });
});
