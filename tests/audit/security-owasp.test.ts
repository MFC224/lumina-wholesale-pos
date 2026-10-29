import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";
import { searchInMemoryCatalog, SearchableProduct } from "@/lib/pos/search";
import { calculateCartFinancials } from "@/lib/pos/calculations";
import { sanitizeProductForRole, hasPermission, canViewCosts } from "@/lib/auth/rbac";
import { validatePinFormat, hashPin, verifyPin } from "@/lib/auth/pin";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { sanitizeImportReportForRole } from "@/lib/catalog/importer";

describe("AUDITORÍA DE SEGURIDAD Y RESILIENCIA OWASP TOP 10", () => {
  let engine: SalesTransactionEngine;

  const mockVariants: VariantEntity[] = [
    {
      id: "var_polo_audit",
      sku: "POLO-AUDIT-01",
      nombreProducto: "Polo Liquidación Test",
      talla: "L",
      color: "Blanco",
      stockActual: 10,
      precioLiquidacion: 25.0,
    },
  ];

  beforeEach(() => {
    engine = new SalesTransactionEngine(mockVariants);
  });

  // =========================================================================
  // OWASP A01: Broken Access Control & Privilege Escalation
  // =========================================================================
  describe("OWASP A01: Broken Access Control & Aislamiento de Roles", () => {
    it("SEC-01: Vendedor no tiene permiso para anular ventas ni acceder a reportes ejecutivos", () => {
      expect(hasPermission("VENDEDOR", "VOID_SALE")).toBe(false);
      expect(hasPermission("VENDEDOR", "VIEW_FINANCIAL_REPORTS")).toBe(false);
      expect(hasPermission("VENDEDOR", "VIEW_COSTS")).toBe(false);

      expect(hasPermission("ADMIN", "VOID_SALE")).toBe(true);
      expect(hasPermission("ADMIN", "VIEW_FINANCIAL_REPORTS")).toBe(true);
      expect(hasPermission("ADMIN", "VIEW_COSTS")).toBe(true);
    });

    it("SEC-02: Prevención de escalada de privilegios al anular ventas desde la API", async () => {
      // 1. Crear venta legítima
      const sale = await engine.processSale({
        usuarioId: "vendedor_01",
        items: [{ varianteId: "var_polo_audit", precioUnitario: 25.0, cantidad: 2 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 50.0,
      });
      expect(sale.success).toBe(true);

      // 2. Intento de anulación con rol VENDEDOR
      const voidAttempt = await engine.voidSale({
        ventaId: sale.venta!.id,
        solicitanteId: "vendedor_01",
        rolSolicitante: "VENDEDOR",
        motivo: "Intento no autorizado de anulación",
      });

      expect(voidAttempt.success).toBe(false);
      expect(voidAttempt.code).toBe("FORBIDDEN_ROLE");
      expect(engine.getVariant("var_polo_audit")?.stockActual).toBe(8); // Stock no alterado
    });

    it("SEC-03: Purgado de costos comerciales (Data Exposure Prevention) en productos e importaciones", () => {
      const productWithCost = {
        id: "prod_confidencial",
        nombre: "Lote Jeans Mayorista",
        precioOriginal: 89.9,
        precioLiquidacion: 49.9,
        costo: 18.5, // Costo confidencial de adquisición
        activo: true,
      };

      const sanitizedForVendedor = sanitizeProductForRole(productWithCost, "VENDEDOR");
      expect(sanitizedForVendedor).not.toHaveProperty("costo");
      expect(canViewCosts("VENDEDOR")).toBe(false);

      const sanitizedForAdmin = sanitizeProductForRole(productWithCost, "ADMIN");
      expect(sanitizedForAdmin).toHaveProperty("costo", 18.5);
      expect(canViewCosts("ADMIN")).toBe(true);
    });
  });

  // =========================================================================
  // OWASP A02: Cryptographic Failures & Authentication
  // =========================================================================
  describe("OWASP A02: Cryptographic Failures & PIN Security", () => {
    it("SEC-04: Validación estricta de formato PIN numérico de 4 dígitos", () => {
      // Casos inválidos que deben ser rechazados
      expect(validatePinFormat("").valid).toBe(false);
      expect(validatePinFormat("123").valid).toBe(false);
      expect(validatePinFormat("12345").valid).toBe(false);
      expect(validatePinFormat("12a4").valid).toBe(false);
      expect(validatePinFormat(" 123").valid).toBe(false);
      expect(validatePinFormat("' OR").valid).toBe(false);
      expect(validatePinFormat("null").valid).toBe(false);

      // Casos válidos
      expect(validatePinFormat("0000").valid).toBe(true);
      expect(validatePinFormat("1234").valid).toBe(true);
      expect(validatePinFormat("9999").valid).toBe(true);
    });

    it("SEC-05: Criptografía bcrypt resistente a ataques y sal única", async () => {
      const pin = "7412";
      const hash1 = await hashPin(pin);
      const hash2 = await hashPin(pin);

      // Cada hash debe tener una sal diferente (no determinista)
      expect(hash1).not.toBe(hash2);
      expect(hash1.startsWith("$2")).toBe(true); // Estructura bcrypt

      // Ambos hashes deben validar el mismo PIN correctamente
      expect(await verifyPin(pin, hash1)).toBe(true);
      expect(await verifyPin(pin, hash2)).toBe(true);
      expect(await verifyPin("7413", hash1)).toBe(false);
    });

    it("SEC-06: Verificación de firma y protección contra manipulación de Tokens JWT", async () => {
      const payload = {
        userId: "usr_rosa_123",
        nombre: "Rosa Flores",
        rol: "VENDEDOR" as const,
      };

      const token = await createSessionToken(payload);
      expect(typeof token).toBe("string");

      // Verificación legítima
      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("usr_rosa_123");
      expect(verified?.rol).toBe("VENDEDOR");

      // Intento de alteración de token (tampering con el payload base64)
      const tamperedToken = token.slice(0, -6) + "XXXXXX";
      const tamperedResult = await verifySessionToken(tamperedToken);
      expect(tamperedResult).toBeNull();
    });
  });

  // =========================================================================
  // OWASP A03: Injection & Parameter Tampering
  // =========================================================================
  describe("OWASP A03: Injection & Parameter Tampering", () => {
    it("SEC-07: Resistencia contra inyección SQL y XSS en motor de búsqueda en memoria", () => {
      const sampleCatalog: SearchableProduct[] = [
        {
          id: "prod_safe",
          nombre: "Casaca Impermeable Térmica",
          codigoSku: "CAS-IMP-001",
          categoriaNombre: "Textil",
          precioLiquidacion: 89.9,
          variantes: [],
        },
      ];

      // Payloads de ataque comunes
      const maliciousQueries = [
        "' OR '1'='1",
        "'; DROP TABLE productos; --",
        "<script>alert('xss')</script>",
        "admin' --",
        "../../etc/passwd",
        "%00",
      ];

      for (const query of maliciousQueries) {
        expect(() => {
          const results = searchInMemoryCatalog(sampleCatalog, query);
          expect(Array.isArray(results)).toBe(true);
        }).not.toThrow();
      }
    });

    it("SEC-08: Ataque de cantidades negativas o fraccionarias en transacción de venta", async () => {
      // 1. Intento de cantidad negativa (para incrementar stock fraudulentamente o generar saldo a favor)
      const negativeResult = await engine.processSale({
        usuarioId: "cajero_01",
        items: [{ varianteId: "var_polo_audit", precioUnitario: 25.0, cantidad: -5 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 100,
      });
      expect(negativeResult.success).toBe(false);
      expect(negativeResult.code).toBe("CANTIDAD_INVALIDA");

      // 2. Intento de cantidad 0
      const zeroResult = await engine.processSale({
        usuarioId: "cajero_01",
        items: [{ varianteId: "var_polo_audit", precioUnitario: 25.0, cantidad: 0 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 100,
      });
      expect(zeroResult.success).toBe(false);
      expect(zeroResult.code).toBe("CANTIDAD_INVALIDA");

      // 3. Intento de cantidad fraccionaria (ej. 2.5 unidades para artículos discretos)
      const fractionalResult = await engine.processSale({
        usuarioId: "cajero_01",
        items: [{ varianteId: "var_polo_audit", precioUnitario: 25.0, cantidad: 2.5 as unknown as number }],
        metodoPago: "EFECTIVO",
        montoRecibido: 100,
      });
      expect(fractionalResult.success).toBe(false);
      expect(fractionalResult.code).toBe("CANTIDAD_INVALIDA");
    });

    it("SEC-09: Ataque de manipulación de precios o montos en cálculos financieros", () => {
      // Intento de descuento mayor al subtotal o descuento negativo
      const cart = [
        {
          varianteId: "item_1",
          precioUnitario: 50.0,
          cantidad: 1,
        },
      ];

      // Descuento negativo (intento de inflar total)
      const resNegativo = calculateCartFinancials(cart, { tipoDescuento: "MONTO_FIJO", descuentoValor: -20 });
      expect(resNegativo.descuentoMonto).toBe(0); // Forzado a 0

      // Descuento mayor al subtotal (intento de saldo negativo)
      const resExcesivo = calculateCartFinancials(cart, { tipoDescuento: "MONTO_FIJO", descuentoValor: 150 });
      expect(resExcesivo.total).toBe(0); // El total nunca puede ser negativo
    });
  });

  // =========================================================================
  // OWASP A04: Insecure Design & Replay / Double Anulación
  // =========================================================================
  describe("OWASP A04: Insecure Design & Replay Attacks", () => {
    it("SEC-10: Ataque de doble anulación para duplicar restitución de inventario en Kardex", async () => {
      // 1. Procesar venta de 3 polos
      const sale = await engine.processSale({
        usuarioId: "cajero_01",
        items: [{ varianteId: "var_polo_audit", precioUnitario: 25.0, cantidad: 3 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 75.0,
      });
      expect(sale.success).toBe(true);
      expect(engine.getVariant("var_polo_audit")?.stockActual).toBe(7);

      // 2. Primera anulación legítima por ADMIN
      const firstVoid = await engine.voidSale({
        ventaId: sale.venta!.id,
        solicitanteId: "admin_01",
        rolSolicitante: "ADMIN",
        motivo: "Cliente solicitó cambio antes de salir del almacén",
      });
      expect(firstVoid.success).toBe(true);
      expect(engine.getVariant("var_polo_audit")?.stockActual).toBe(10); // Restituido

      // 3. Intento de re-anular la misma venta (Replay Attack)
      const replayVoid = await engine.voidSale({
        ventaId: sale.venta!.id,
        solicitanteId: "admin_01",
        rolSolicitante: "ADMIN",
        motivo: "Segundo intento de anulación maliciosa",
      });
      expect(replayVoid.success).toBe(false);
      expect(replayVoid.code).toBe("VENTA_YA_ANULADA");

      // El stock permanece en 10 (cero duplicación de inventario)
      expect(engine.getVariant("var_polo_audit")?.stockActual).toBe(10);
    });
  });
});
