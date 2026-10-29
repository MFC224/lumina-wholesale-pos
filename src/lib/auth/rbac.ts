import {
  Role,
  Permission,
  UserProfile,
  ProductWithCost,
  SanitizedProduct,
} from "@/types/auth";

/**
 * Matriz de Permisos por Rol en Lumina Wholesale POS
 */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "VIEW_COSTS",
    "VIEW_FINANCIAL_REPORTS",
    "VOID_SALE",
    "ADJUST_INVENTORY",
    "MANAGE_USERS",
    "PROCESS_SALE",
    "VIEW_CATALOG",
    "SEARCH_PRODUCTS",
  ] as const,
  VENDEDOR: [
    "PROCESS_SALE",
    "VIEW_CATALOG",
    "SEARCH_PRODUCTS",
  ] as const,
};

/**
 * Verifica si un rol cuenta con un permiso específico.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Helper para verificar si un rol puede ver los costos confidenciales.
 */
export function canViewCosts(role: Role): boolean {
  return hasPermission(role, "VIEW_COSTS");
}

/**
 * Helper para verificar si un rol puede anular ventas registradas.
 */
export function canVoidSale(role: Role): boolean {
  return hasPermission(role, "VOID_SALE");
}

/**
 * Helper para verificar si un rol puede realizar ajustes manuales de inventario (Kardex).
 */
export function canAdjustInventory(role: Role): boolean {
  return hasPermission(role, "ADJUST_INVENTORY");
}

/**
 * Helper para verificar si un rol puede ver reportes financieros ejecutivos.
 */
export function canViewFinancialReports(role: Role): boolean {
  return hasPermission(role, "VIEW_FINANCIAL_REPORTS");
}

/**
 * Sanitiza un producto según el rol del usuario autenticado.
 * REGLA HU-05: El vendedor NUNCA debe ver el costo de adquisición del producto.
 * Si el usuario es VENDEDOR, el campo 'costo' es eliminado del objeto.
 */
export function sanitizeProductForRole<T extends ProductWithCost>(
  product: T,
  role: Role
): SanitizedProduct<T> {
  if (!product) return product;

  if (canViewCosts(role)) {
    return { ...product };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { costo, ...sanitized } = product;
  return sanitized as SanitizedProduct<T>;
}

/**
 * Sanitiza una lista de productos según el rol.
 */
export function sanitizeProductsForRole<T extends ProductWithCost>(
  products: T[],
  role: Role
): SanitizedProduct<T>[] {
  if (!Array.isArray(products)) return [];
  return products.map((p) => sanitizeProductForRole(p, role));
}

/**
 * Sanitiza un usuario de base de datos para no exponer el hash del PIN.
 */
export function sanitizeUser(user: {
  id: string;
  nombre: string;
  rol: Role;
  activo: boolean;
  pin?: string;
  createdAt?: Date | string;
}): UserProfile {
  return {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    activo: user.activo,
    createdAt: user.createdAt,
  };
}
