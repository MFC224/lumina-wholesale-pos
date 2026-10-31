import { describe, it, expect } from "vitest";
import { getProductImageUrl, CATEGORY_FALLBACK_IMAGES, PRODUCT_SPECIFIC_IMAGES } from "@/lib/catalog/images";

describe("Módulo de Imágenes Curadas para Catálogo Cuadrado (3 por fila)", () => {
  it("debe retornar la imagen directa si el producto ya cuenta con imagenUrl", () => {
    const prod = {
      nombre: "Taladro de Prueba",
      codigoSku: "TEST-01",
      imagenUrl: "https://ejemplo.com/foto-taladro.webp",
    };
    expect(getProductImageUrl(prod)).toBe("https://ejemplo.com/foto-taladro.webp");
  });

  it("debe retornar la imagen específica por SKU registrado", () => {
    const prod = {
      nombre: "Taladro Percutor Inalámbrico 20V Brushless",
      codigoSku: "TLD-20V-01",
    };
    expect(getProductImageUrl(prod)).toBe(PRODUCT_SPECIFIC_IMAGES["TLD-20V-01"]);
  });

  it("debe retornar la imagen de la categoría si no hay SKU específico", () => {
    const prod = {
      nombre: "Producto Genérico de Seguridad",
      codigoSku: "SKU-DESCONOCIDO",
      categoriaNombre: "Calzado de Seguridad",
    };
    expect(getProductImageUrl(prod)).toBe(CATEGORY_FALLBACK_IMAGES["Calzado de Seguridad"]);
  });

  it("debe inferir imagen por palabras clave en el nombre si la categoría es null", () => {
    const prod1 = { nombre: "Casaca Impermeable de Invierno" };
    expect(getProductImageUrl(prod1)).toBe(PRODUCT_SPECIFIC_IMAGES["CAS-CRV-18"]);

    const prod2 = { nombre: "Guantes de protección dieléctrica" };
    expect(getProductImageUrl(prod2)).toBe(PRODUCT_SPECIFIC_IMAGES["GUA-NIT-40"]);
  });

  it("debe retornar la imagen general si ningún criterio coincide", () => {
    const prod = { nombre: "Artículo Inclasificable" };
    expect(getProductImageUrl(prod)).toBe(CATEGORY_FALLBACK_IMAGES["General"]);
  });
});
