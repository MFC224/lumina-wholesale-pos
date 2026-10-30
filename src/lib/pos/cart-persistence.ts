export interface PersistedCartItem {
  varianteId: string;
  productoId: string;
  nombre: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  precioUnitario: number;
  cantidad: number;
  stockDisponible: number;
}

export const CART_STORAGE_KEY = "lumina_active_cart_v1";

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    // Entorno sin storage
  }
  return null;
}

/**
 * Guarda el carrito activo en localStorage para prevenir pérdida de datos
 * ante refrescos de página (F5) o cierres involuntarios del navegador.
 */
export function saveCartToStorage(cart: PersistedCartItem[]): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    if (cart.length === 0) {
      storage.removeItem(CART_STORAGE_KEY);
    } else {
      storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  } catch {
    // Storage no disponible o cuota excedida
  }
}

/**
 * Recupera el carrito guardado en localStorage y valida su estructura.
 */
export function loadCartFromStorage(): PersistedCartItem[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          typeof item.varianteId === "string" &&
          typeof item.productoId === "string" &&
          typeof item.cantidad === "number" &&
          item.cantidad > 0
      );
    }
  } catch {
    // Formato corrupto en almacenamiento
  }
  return [];
}

/**
 * Limpia el borrador del carrito tras una venta exitosa o cancelación manual.
 */
export function clearCartStorage(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Silencioso
  }
}
