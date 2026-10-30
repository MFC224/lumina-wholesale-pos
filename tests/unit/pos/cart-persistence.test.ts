import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveCartToStorage,
  loadCartFromStorage,
  clearCartStorage,
  CART_STORAGE_KEY,
  PersistedCartItem,
} from "@/lib/pos/cart-persistence";

describe("Módulo de Persistencia y Resiliencia del Carrito (Sprint 5)", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    });
  });

  const sampleItems: PersistedCartItem[] = [
    {
      varianteId: "var-1",
      productoId: "prod-1",
      nombre: "Taladro Inalámbrico 20V",
      sku: "TLD-20V",
      precioUnitario: 179.9,
      cantidad: 2,
      stockDisponible: 15,
    },
    {
      varianteId: "var-2",
      productoId: "prod-2",
      nombre: "Bota de Seguridad Dielectrica",
      sku: "BOT-DIE-42",
      talla: "42",
      precioUnitario: 89.9,
      cantidad: 1,
      stockDisponible: 8,
    },
  ];

  it("debe guardar los artículos en localStorage bajo la clave oficial", () => {
    saveCartToStorage(sampleItems);
    expect(mockStore[CART_STORAGE_KEY]).toBeDefined();

    const stored = JSON.parse(mockStore[CART_STORAGE_KEY]);
    expect(stored).toHaveLength(2);
    expect(stored[0].nombre).toBe("Taladro Inalámbrico 20V");
  });

  it("debe cargar y rehidratar el carrito desde localStorage", () => {
    saveCartToStorage(sampleItems);
    const restored = loadCartFromStorage();

    expect(restored).toHaveLength(2);
    expect(restored[0].varianteId).toBe("var-1");
    expect(restored[1].sku).toBe("BOT-DIE-42");
  });

  it("debe retornar arreglo vacío si no hay datos en localStorage", () => {
    const restored = loadCartFromStorage();
    expect(restored).toEqual([]);
  });

  it("debe descartar elementos corruptos o sin cantidad válida", () => {
    mockStore[CART_STORAGE_KEY] = JSON.stringify([
      { varianteId: "ok-1", productoId: "p-1", cantidad: 3 },
      { varianteId: null, cantidad: 0 }, // Inválido
      { soloTexto: "invalido" }, // Inválido
    ]);

    const restored = loadCartFromStorage();
    expect(restored).toHaveLength(1);
    expect(restored[0].varianteId).toBe("ok-1");
  });

  it("debe limpiar el almacenamiento con clearCartStorage()", () => {
    saveCartToStorage(sampleItems);
    expect(mockStore[CART_STORAGE_KEY]).toBeDefined();

    clearCartStorage();
    expect(mockStore[CART_STORAGE_KEY]).toBeUndefined();
    expect(loadCartFromStorage()).toEqual([]);
  });
});
