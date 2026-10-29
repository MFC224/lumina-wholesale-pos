export type Role = "ADMIN" | "VENDEDOR";

export interface UserProfile {
  id: string;
  nombre: string;
  rol: Role;
  activo: boolean;
  createdAt?: Date | string;
}

export type Permission =
  | "VIEW_COSTS"
  | "VIEW_FINANCIAL_REPORTS"
  | "VOID_SALE"
  | "ADJUST_INVENTORY"
  | "MANAGE_USERS"
  | "PROCESS_SALE"
  | "VIEW_CATALOG"
  | "SEARCH_PRODUCTS";

export interface SessionPayload {
  userId: string;
  nombre: string;
  rol: Role;
  exp?: number;
  iat?: number;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  code?: "INVALID_FORMAT" | "USER_NOT_FOUND" | "USER_INACTIVE" | "INVALID_PIN" | "INTERNAL_ERROR";
}

export interface ProductWithCost {
  id: string;
  nombre: string;
  descripcion?: string | null;
  codigoSku?: string | null;
  categoriaId?: string | null;
  precioOriginal: number | string;
  precioLiquidacion: number | string;
  costo: number | string;
  activo: boolean;
  imagenUrl?: string | null;
  [key: string]: unknown;
}

export type SanitizedProduct<T extends ProductWithCost> = Omit<T, "costo"> & {
  costo?: number | string;
};
