import { describe, it, expect } from "vitest";
import { validatePinFormat, hashPin, verifyPin } from "@/lib/auth/pin";
import {
  hasPermission,
  canViewCosts,
  canVoidSale,
  canAdjustInventory,
  canViewFinancialReports,
  sanitizeProductForRole,
  sanitizeProductsForRole,
  sanitizeUser,
} from "@/lib/auth/rbac";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { ProductWithCost } from "@/types/auth";

describe("HU-05: Autenticación por PIN y Control de Acceso Basado en Roles (RBAC)", () => {
  // Test 1: Validación estricta de longitud y formato de PIN (Rechazo)
  it("1. Debe rechazar PINs que no tengan exactamente 4 dígitos numéricos", () => {
    expect(validatePinFormat("12").valid).toBe(false);
    expect(validatePinFormat("12345").valid).toBe(false);
    expect(validatePinFormat("abcd").valid).toBe(false);
    expect(validatePinFormat("12a4").valid).toBe(false);
    expect(validatePinFormat("").valid).toBe(false);
    expect(validatePinFormat(" 123").valid).toBe(false);
  });

  // Test 2: Validación de PIN correcto (Aceptación)
  it("2. Debe aceptar PINs válidos de 4 dígitos numéricos", () => {
    expect(validatePinFormat("1234").valid).toBe(true);
    expect(validatePinFormat("0000").valid).toBe(true);
    expect(validatePinFormat("9999").valid).toBe(true);
    expect(validatePinFormat("5821").valid).toBe(true);
  });

  // Test 3: Encriptación con bcrypt y verificación de PIN
  it("3. Debe encriptar el PIN correctamente y verificar acierto vs error", async () => {
    const rawPin = "1234";
    const hashed = await hashPin(rawPin);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(rawPin);
    expect(hashed.startsWith("$2")).toBe(true);

    const matchValid = await verifyPin("1234", hashed);
    const matchInvalid = await verifyPin("9999", hashed);

    expect(matchValid).toBe(true);
    expect(matchInvalid).toBe(false);
  });

  // Test 4: Sanitización de usuario para nunca exponer el hash de PIN
  it("4. Debe sanitizar el objeto de usuario y eliminar el campo PIN antes de enviarlo a cliente", () => {
    const dbUser = {
      id: "usr_cuid_123",
      nombre: "Carlos Cajero",
      pin: "$2a$10$e8wE/J9Z6/abcdefghijklmnopq",
      rol: "VENDEDOR" as const,
      activo: true,
      createdAt: new Date(),
    };

    const sanitized = sanitizeUser(dbUser);
    expect(sanitized.id).toBe("usr_cuid_123");
    expect(sanitized.nombre).toBe("Carlos Cajero");
    expect(sanitized.rol).toBe("VENDEDOR");
    expect(sanitized).not.toHaveProperty("pin");
  });

  // Test 5: Matriz de permisos para ADMIN (Acceso total)
  it("5. El rol ADMIN debe contar con permisos críticos (costos, anulación, arqueo, ajustes)", () => {
    expect(canViewCosts("ADMIN")).toBe(true);
    expect(canVoidSale("ADMIN")).toBe(true);
    expect(canAdjustInventory("ADMIN")).toBe(true);
    expect(canViewFinancialReports("ADMIN")).toBe(true);
    expect(hasPermission("ADMIN", "MANAGE_USERS")).toBe(true);
    expect(hasPermission("ADMIN", "PROCESS_SALE")).toBe(true);
  });

  // Test 6: Matriz de permisos para VENDEDOR (Acceso restringido)
  it("6. El rol VENDEDOR debe tener denegado el acceso a costos, anulación y ajustes", () => {
    expect(canViewCosts("VENDEDOR")).toBe(false);
    expect(canVoidSale("VENDEDOR")).toBe(false);
    expect(canAdjustInventory("VENDEDOR")).toBe(false);
    expect(canViewFinancialReports("VENDEDOR")).toBe(false);
    expect(hasPermission("VENDEDOR", "MANAGE_USERS")).toBe(false);

    // Permisos operativos permitidos para Vendedor
    expect(hasPermission("VENDEDOR", "PROCESS_SALE")).toBe(true);
    expect(hasPermission("VENDEDOR", "VIEW_CATALOG")).toBe(true);
    expect(hasPermission("VENDEDOR", "SEARCH_PRODUCTS")).toBe(true);
  });

  // Test 7: Ocultamiento confidencial de costos para Vendedor (HU-05)
  it("7. [HU-05] Debe eliminar el campo 'costo' del producto cuando el rol es VENDEDOR", () => {
    const productoConCosto: ProductWithCost = {
      id: "prod-1",
      nombre: "Casaca Térmica Militar",
      codigoSku: "CAS-MIL-01",
      precioOriginal: 180.0,
      precioLiquidacion: 69.9, // Visible en Soles (S/.)
      costo: 32.5,             // Confidencial de compra
      activo: true,
    };

    const sanitizadoVendedor = sanitizeProductForRole(productoConCosto, "VENDEDOR");
    expect(sanitizadoVendedor.nombre).toBe("Casaca Térmica Militar");
    expect(sanitizadoVendedor.precioLiquidacion).toBe(69.9);
    expect(sanitizadoVendedor).not.toHaveProperty("costo");
    expect((sanitizadoVendedor as Record<string, unknown>).costo).toBeUndefined();
  });

  // Test 8: Transparencia de costos para Administrador (HU-05)
  it("8. [HU-05] Debe preservar el campo 'costo' cuando el rol autenticado es ADMIN", () => {
    const productoConCosto: ProductWithCost = {
      id: "prod-1",
      nombre: "Casaca Térmica Militar",
      codigoSku: "CAS-MIL-01",
      precioOriginal: 180.0,
      precioLiquidacion: 69.9,
      costo: 32.5,
      activo: true,
    };

    const sanitizadoAdmin = sanitizeProductForRole(productoConCosto, "ADMIN");
    expect(sanitizadoAdmin.costo).toBe(32.5);
    expect(sanitizadoAdmin.precioLiquidacion).toBe(69.9);
  });

  // Test 9: Sanitización masiva de catálogo en lote para Vendedores
  it("9. Debe sanitizar un catálogo entero de productos garantizando cero fuga de costos", () => {
    const catalogo: ProductWithCost[] = [
      { id: "1", nombre: "Polo Oversize", precioOriginal: 60, precioLiquidacion: 25, costo: 10, activo: true },
      { id: "2", nombre: "Pantalón Cargo", precioOriginal: 120, precioLiquidacion: 49, costo: 22, activo: true },
      { id: "3", nombre: "Zapatilla Urbana", precioOriginal: 220, precioLiquidacion: 99, costo: 45, activo: true },
    ];

    const catalogoParaVendedor = sanitizeProductsForRole(catalogo, "VENDEDOR");
    expect(catalogoParaVendedor).toHaveLength(3);

    catalogoParaVendedor.forEach((item) => {
      expect(item).not.toHaveProperty("costo");
      expect((item as Record<string, unknown>).costo).toBeUndefined();
    });

    const catalogoParaAdmin = sanitizeProductsForRole(catalogo, "ADMIN");
    expect(catalogoParaAdmin).toHaveLength(3);
    expect(catalogoParaAdmin[0].costo).toBe(10);
    expect(catalogoParaAdmin[1].costo).toBe(22);
    expect(catalogoParaAdmin[2].costo).toBe(45);
  });

  // Test 10: Creación y verificación de tokens de sesión JWT
  it("10. Debe generar y verificar tokens de sesión JWT con rol e ID válidos", async () => {
    const sessionData = {
      userId: "usr_admin_001",
      nombre: "Administrador de Turno",
      rol: "ADMIN" as const,
    };

    const token = await createSessionToken(sessionData, "2h");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("usr_admin_001");
    expect(decoded?.nombre).toBe("Administrador de Turno");
    expect(decoded?.rol).toBe("ADMIN");

    // Token adulterado debe ser rechazado
    const tampered = token + "xyz";
    const decodedInvalid = await verifySessionToken(tampered);
    expect(decodedInvalid).toBeNull();
  });
});
