import { describe, it, expect } from "vitest";
import { searchInMemoryCatalog, SearchableProduct } from "@/lib/pos/search";

describe("HU-02: Búsqueda Difusa en Memoria de Navegador (0ms)", () => {
  const mockCatalog: SearchableProduct[] = [
    {
      id: "prod_1",
      nombre: "Polo Oversize Heavyweight Cotton",
      codigoSku: "POLO-HVY",
      categoriaNombre: "Ropa y Textiles",
      precioLiquidacion: 29.9,
      variantes: [
        { id: "v1_1", sku: "POLO-HVY-NEGRO-M", talla: "M", color: "Negro", ubicacion: "Rack A-1", stockActual: 10 },
        { id: "v1_2", sku: "POLO-HVY-NEGRO-L", talla: "L", color: "Negro", ubicacion: "Rack A-1", stockActual: 15 },
        { id: "v1_3", sku: "POLO-HVY-BLANCO-M", talla: "M", color: "Blanco", ubicacion: "Rack A-2", stockActual: 2 },
      ],
    },
    {
      id: "prod_2",
      nombre: "Casaca Térmica Militar con Capucha",
      codigoSku: "CAS-TERM",
      categoriaNombre: "Ropa y Textiles",
      precioLiquidacion: 79.9,
      variantes: [
        { id: "v2_1", sku: "CAS-TERM-AZUL-L", talla: "L", color: "Azul Eléctrico", ubicacion: "Rack B-3", stockActual: 4 },
      ],
    },
    {
      id: "prod_3",
      nombre: "Taladro Percutor Industrial 650W",
      codigoSku: "FERR-TAL-650",
      categoriaNombre: "Herramientas",
      precioLiquidacion: 119.0,
      variantes: [
        { id: "v3_1", sku: "TAL-650-STD", talla: "Única", color: "Azul/Negro", ubicacion: "Estante F-04", stockActual: 3 },
      ],
    },
    {
      id: "prod_4",
      nombre: "Botín de Seguridad con Punta de Acero",
      codigoSku: "CALZ-BOT-SEG",
      categoriaNombre: "Calzado Industrial",
      precioLiquidacion: 89.0,
      variantes: [
        { id: "v4_1", sku: "BOT-SEG-42", talla: "42", color: "Negro", ubicacion: "Estante C-01", stockActual: 0 },
      ],
    },
  ];

  // Test 1: Búsqueda exacta por SKU base
  it("1. Debe encontrar el producto inmediatamente buscando por SKU Base exacto", () => {
    const results = searchInMemoryCatalog(mockCatalog, "POLO-HVY");
    expect(results).toHaveLength(1);
    expect(results[0].nombre).toBe("Polo Oversize Heavyweight Cotton");
  });

  // Test 2: Búsqueda exacta por SKU de Variante específica
  it("2. Debe encontrar el producto buscando por el SKU de una variante", () => {
    const results = searchInMemoryCatalog(mockCatalog, "TAL-650-STD");
    expect(results).toHaveLength(1);
    expect(results[0].nombre).toBe("Taladro Percutor Industrial 650W");
  });

  // Test 3: Insensibilidad a mayúsculas y minúsculas
  it("3. Debe ser insensible a mayúsculas y minúsculas (ej. 'polo' encuentra 'POLO')", () => {
    const results = searchInMemoryCatalog(mockCatalog, "polo heavyweight");
    expect(results).toHaveLength(1);
    expect(results[0].codigoSku).toBe("POLO-HVY");
  });

  // Test 4: Insensibilidad a tildes y diacríticos (HU-02)
  it("4. Debe tolerar tildes buscando 'termica' o 'térmica' indistintamente", () => {
    const conTilde = searchInMemoryCatalog(mockCatalog, "térmica");
    const sinTilde = searchInMemoryCatalog(mockCatalog, "termica");

    expect(conTilde).toHaveLength(1);
    expect(sinTilde).toHaveLength(1);
    expect(conTilde[0].id).toBe(sinTilde[0].id);
  });

  // Test 5: Búsqueda multi-token combinando atributos de variantes (nombre + color + talla)
  it("5. Debe encontrar el producto al ingresar múltiples términos combinados ('polo negro m')", () => {
    const results = searchInMemoryCatalog(mockCatalog, "polo negro m");
    expect(results).toHaveLength(1);
    expect(results[0].nombre).toBe("Polo Oversize Heavyweight Cotton");
  });

  // Test 6: Búsqueda por ubicación física de almacén (Rack / Estante)
  it("6. Debe permitir localizar productos por su ubicación en estante o rack", () => {
    const results = searchInMemoryCatalog(mockCatalog, "Estante F-04");
    expect(results).toHaveLength(1);
    expect(results[0].nombre).toBe("Taladro Percutor Industrial 650W");
  });

  // Test 7: Ordenamiento por relevancia (coincidencia de SKU tiene mayor prioridad)
  it("7. Debe priorizar productos cuyo SKU coincide directamente sobre los que coinciden en descripción", () => {
    const results = searchInMemoryCatalog(mockCatalog, "CAS-TERM");
    expect(results).toHaveLength(1);
    expect(results[0].codigoSku).toBe("CAS-TERM");
  });

  // Test 8: Consulta vacía retorna todo el catálogo disponible
  it("8. Si la consulta está vacía o contiene solo espacios, debe devolver el catálogo completo", () => {
    const results = searchInMemoryCatalog(mockCatalog, "   ");
    expect(results).toHaveLength(mockCatalog.length);
  });

  // Test 9: Filtro por categoría combinado con búsqueda
  it("9. Debe permitir filtrar por categoría específica", () => {
    const results = searchInMemoryCatalog(mockCatalog, "", {
      categoriaNombre: "Herramientas",
    });
    expect(results).toHaveLength(1);
    expect(results[0].categoriaNombre).toBe("Herramientas");
  });

  // Test 10: Rendimiento de búsqueda difusa menor a 5ms en memoria (HU-02)
  it("10. [HU-02] La búsqueda difusa en memoria debe ejecutarse en menos de 5ms", () => {
    // Generar un catálogo simulado de 200 productos
    const largeCatalog: SearchableProduct[] = [];
    for (let i = 0; i < 200; i++) {
      largeCatalog.push({
        id: `prod_${i}`,
        nombre: `Producto de Liquidación Remate Lote ${i}`,
        codigoSku: `SKU-LOT-${i}`,
        categoriaNombre: i % 2 === 0 ? "Ropa y Textiles" : "Herramientas",
        precioLiquidacion: 20 + i,
        variantes: [
          { id: `v_${i}_1`, sku: `SKU-LOT-${i}-VAR1`, talla: "M", color: "Rojo", ubicacion: "Rack 1", stockActual: 5 },
          { id: `v_${i}_2`, sku: `SKU-LOT-${i}-VAR2`, talla: "L", color: "Azul", ubicacion: "Rack 2", stockActual: 10 },
        ],
      });
    }

    const start = performance.now();
    const results = searchInMemoryCatalog(largeCatalog, "lote 150 azul");
    const durationMs = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(5); // Menor a 5 milisegundos (0ms percibido)
  });
});
