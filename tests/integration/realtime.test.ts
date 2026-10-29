import { describe, it, expect, beforeEach } from "vitest";
import { StockSyncManager } from "@/lib/realtime/sync";
import { SearchableProduct } from "@/lib/pos/search";
import { RealtimeStockAlert } from "@/types/realtime";

describe("HU-04: Sincronización en Tiempo Real entre Laptops vía WebSockets (<100ms)", () => {
  let syncManager: StockSyncManager;

  const mockCatalog: SearchableProduct[] = [
    {
      id: "prod_1",
      nombre: "Polo Oversize Urbano",
      codigoSku: "POLO-URB",
      categoriaNombre: "Ropa y Textiles",
      precioLiquidacion: 29.9,
      variantes: [
        { id: "var_1", sku: "POLO-URB-NG-M", talla: "M", color: "Negro", ubicacion: "Rack A-1", stockActual: 10 },
        { id: "var_2", sku: "POLO-URB-BL-L", talla: "L", color: "Blanco", ubicacion: "Rack A-1", stockActual: 5 },
      ],
    },
    {
      id: "prod_2",
      nombre: "Taladro Industrial 650W",
      codigoSku: "TAL-650",
      categoriaNombre: "Herramientas",
      precioLiquidacion: 119.0,
      variantes: [
        { id: "var_3", sku: "TAL-650-STD", talla: "Única", color: "Azul", ubicacion: "Estante F", stockActual: 4 },
      ],
    },
  ];

  beforeEach(() => {
    syncManager = new StockSyncManager(mockCatalog);
    syncManager.setConnectionStatus("CONNECTED");
  });

  // Test 1: Suscripción y recepción de evento de cambio de stock
  it("1. Debe recibir el evento de actualización y notificar a los suscriptores activos", () => {
    let notified = false;
    let latestProducts: SearchableProduct[] = [];

    syncManager.onStockChange((products) => {
      notified = true;
      latestProducts = products;
    });

    const updated = syncManager.applyStockUpdate({
      varianteId: "var_1",
      stockActual: 8,
      timestamp: Date.now(),
    });

    expect(updated).toBe(true);
    expect(notified).toBe(true);
    const var1 = latestProducts[0].variantes.find((v) => v.id === "var_1");
    expect(var1?.stockActual).toBe(8);
  });

  // Test 2: Latencia ultrarrápida en menos de 100ms (HU-04)
  it("2. [HU-04] La actualización de stock en el cache local debe completarse en menos de 100ms", () => {
    const start = performance.now();

    syncManager.applyStockUpdate({
      varianteId: "var_1",
      stockActual: 7,
      timestamp: Date.now(),
    });

    const latencyMs = performance.now() - start;
    expect(latencyMs).toBeLessThan(100);
  });

  // Test 3: Actualización exacta del stock de la variante
  it("3. Debe actualizar exactamente el stock de la variante afectada sin alterar las demás", () => {
    syncManager.applyStockUpdate({
      varianteId: "var_1",
      stockActual: 6,
      timestamp: Date.now(),
    });

    const products = syncManager.getProducts();
    const v1 = products[0].variantes.find((v) => v.id === "var_1");
    const v2 = products[0].variantes.find((v) => v.id === "var_2");

    expect(v1?.stockActual).toBe(6);
    expect(v2?.stockActual).toBe(5); // Intacta
  });

  // Test 4: Emisión de alerta crítica cuando el stock baja a <= 3 unidades
  it("4. [HU-04] Debe emitir alerta CRITICO cuando el stock disminuye a 3 o menos unidades", () => {
    let receivedAlert: RealtimeStockAlert | null = null;

    syncManager.onAlert((alert) => {
      receivedAlert = alert;
    });

    // Stock cae de 10 a 2 unidades
    syncManager.applyStockUpdate({
      varianteId: "var_1",
      stockActual: 2,
      timestamp: Date.now(),
    });

    expect(receivedAlert).not.toBeNull();
    const alert = receivedAlert as unknown as RealtimeStockAlert;
    expect(alert.severidad).toBe("CRITICO");
    expect(alert.varianteId).toBe("var_1");
    expect(alert.stockActual).toBe(2);
    expect(alert.mensaje).toContain("Stock Crítico");
  });

  // Test 5: Emisión de alerta de producto agotado cuando stock llega a 0
  it("5. [HU-04] Debe emitir alerta AGOTADO cuando el stock llega a 0", () => {
    let receivedAlert: RealtimeStockAlert | null = null;

    syncManager.onAlert((alert) => {
      receivedAlert = alert;
    });

    syncManager.applyStockUpdate({
      varianteId: "var_2",
      stockActual: 0,
      timestamp: Date.now(),
    });

    expect(receivedAlert).not.toBeNull();
    const alert = receivedAlert as unknown as RealtimeStockAlert;
    expect(alert.severidad).toBe("AGOTADO");
    expect(alert.stockActual).toBe(0);
    expect(alert.mensaje).toContain("Producto Agotado");
  });

  // Test 6: Emisión de alerta de restock tras anulación de venta
  it("6. Debe emitir alerta RESTOCK cuando una variante agotada vuelve a tener stock disponible", () => {
    // Primero agotar
    syncManager.applyStockUpdate({
      varianteId: "var_2",
      stockActual: 0,
      timestamp: Date.now(),
    });

    let restockAlert: RealtimeStockAlert | null = null;
    syncManager.onAlert((alert) => {
      if (alert.severidad === "RESTOCK") {
        restockAlert = alert;
      }
    });

    // Simular que otra laptop anuló la venta y restockea 2 unidades
    syncManager.applyStockUpdate({
      varianteId: "var_2",
      stockActual: 2,
      timestamp: Date.now(),
    });

    expect(restockAlert).not.toBeNull();
    const alert = restockAlert as unknown as RealtimeStockAlert;
    expect(alert.severidad).toBe("RESTOCK");
    expect(alert.stockActual).toBe(2);
  });

  // Test 7: Múltiples actualizaciones simultáneas sobre diferentes variantes sin colisiones
  it("7. Debe manejar múltiples actualizaciones concurrentes en diferentes productos sin inconsistencias", () => {
    syncManager.applyStockUpdate({ varianteId: "var_1", stockActual: 4, timestamp: Date.now() });
    syncManager.applyStockUpdate({ varianteId: "var_2", stockActual: 1, timestamp: Date.now() });
    syncManager.applyStockUpdate({ varianteId: "var_3", stockActual: 0, timestamp: Date.now() });

    const products = syncManager.getProducts();
    const v1 = products[0].variantes.find((v) => v.id === "var_1");
    const v2 = products[0].variantes.find((v) => v.id === "var_2");
    const v3 = products[1].variantes.find((v) => v.id === "var_3");

    expect(v1?.stockActual).toBe(4);
    expect(v2?.stockActual).toBe(1);
    expect(v3?.stockActual).toBe(0);
  });

  // Test 8: Gestión de estados de conexión (DISCONNECTED -> CONNECTED)
  it("8. Debe notificar cambios en el estado de conexión Wi-Fi / WebSockets", () => {
    const statusHistory: string[] = [];

    syncManager.onConnectionChange((status) => {
      statusHistory.push(status);
    });

    syncManager.setConnectionStatus("DISCONNECTED");
    syncManager.setConnectionStatus("CONNECTING");
    syncManager.setConnectionStatus("CONNECTED");

    expect(statusHistory).toEqual(["DISCONNECTED", "CONNECTING", "CONNECTED"]);
    expect(syncManager.getConnectionStatus()).toBe("CONNECTED");
  });

  // Test 9: Resincronización completa (Full Resync) tras reconexión
  it("9. Debe ejecutar un full resync para actualizar el catálogo completo tras reconectarse", async () => {
    // Simular que durante la desconexión el catálogo cambió en el servidor
    const updatedServerCatalog: SearchableProduct[] = [
      {
        id: "prod_1",
        nombre: "Polo Oversize Urbano",
        codigoSku: "POLO-URB",
        precioLiquidacion: 29.9,
        variantes: [
          { id: "var_1", sku: "POLO-URB-NG-M", stockActual: 1, talla: "M", color: "Negro" },
        ],
      },
    ];

    syncManager.setConnectionStatus("DISCONNECTED");

    await syncManager.fullResync(async () => {
      return updatedServerCatalog;
    });

    expect(syncManager.getConnectionStatus()).toBe("CONNECTED");
    const currentProds = syncManager.getProducts();
    expect(currentProds[0].variantes[0].stockActual).toBe(1);
  });

  // Test 10: Limpieza limpia de suscripciones sin fugas de memoria
  it("10. Debe permitir la desuscripción y limpieza total de listeners", () => {
    let callCount = 0;
    const unsubscribe = syncManager.onStockChange(() => {
      callCount += 1;
    });

    syncManager.applyStockUpdate({ varianteId: "var_1", stockActual: 9, timestamp: Date.now() });
    expect(callCount).toBe(1);

    // Desuscribirse
    unsubscribe();

    syncManager.applyStockUpdate({ varianteId: "var_1", stockActual: 8, timestamp: Date.now() });
    // No debe haberse incrementado
    expect(callCount).toBe(1);

    // Cleanup general
    syncManager.cleanup();
    expect(syncManager.getConnectionStatus()).toBe("DISCONNECTED");
  });
});
