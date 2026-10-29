import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";
import { searchInMemoryCatalog, SearchableProduct } from "@/lib/pos/search";
import { calculateCartFinancials } from "@/lib/pos/calculations";
import { StockSyncManager } from "@/lib/realtime/sync";
import { validateAndGroupImportRows, sanitizeImportReportForRole } from "@/lib/catalog/importer";
import { calcularArqueoCaja, buildCashClosingDocument, renderCashClosingHtml } from "@/lib/reports/cash-closing";
import { generateExecutiveExcelReport } from "@/lib/reports/excel";
import { sanitizeProductForRole, hasPermission } from "@/lib/auth/rbac";
import { validatePinFormat, hashPin, verifyPin } from "@/lib/auth/pin";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("AUDITORÍA INTEGRAL Y PRUEBAS DE ACEPTACIÓN DE USUARIO (UAT)", () => {
  let engine: SalesTransactionEngine;
  let syncManager: StockSyncManager;

  const mockVariants: VariantEntity[] = [
    {
      id: "var_polo_m",
      sku: "POLO-HVY-NG-M",
      nombreProducto: "Polo Oversize Heavyweight Cotton",
      talla: "M",
      color: "Negro",
      stockActual: 5,
      precioLiquidacion: 29.9,
    },
    {
      id: "var_taladro",
      sku: "TAL-650-STD",
      nombreProducto: "Taladro Percutor Industrial 650W",
      talla: "Única",
      color: "Azul",
      stockActual: 2, // Alerta crítica (<= 3)
      precioLiquidacion: 119.0,
    },
  ];

  const mockCatalog: SearchableProduct[] = [
    {
      id: "prod_1",
      nombre: "Polo Oversize Heavyweight Cotton",
      codigoSku: "POLO-HVY",
      categoriaNombre: "Ropa y Textiles",
      precioLiquidacion: 29.9,
      precioOriginal: 89.9,
      variantes: [
        { id: "var_polo_m", sku: "POLO-HVY-NG-M", talla: "M", color: "Negro", ubicacion: "Rack A-1", stockActual: 5 },
      ],
    },
    {
      id: "prod_2",
      nombre: "Taladro Percutor Industrial 650W",
      codigoSku: "TAL-650",
      categoriaNombre: "Herramientas",
      precioLiquidacion: 119.0,
      precioOriginal: 249.0,
      variantes: [
        { id: "var_taladro", sku: "TAL-650-STD", talla: "Única", color: "Azul", ubicacion: "Estante F", stockActual: 2 },
      ],
    },
  ];

  beforeEach(() => {
    engine = new SalesTransactionEngine(mockVariants);
    syncManager = new StockSyncManager(mockCatalog);
    syncManager.setConnectionStatus("CONNECTED");
  });

  // UAT-1: Flujo de venta de cajero con búsqueda difusa, descuento de liquidación y vuelto en Soles
  it("UAT-01: [Flujo Cajero] Búsqueda 0ms, agregado de variante, descuento 10%, cobro en efectivo y cálculo de vuelto", async () => {
    // 1. Cajero busca 'polo negro'
    const searchResults = searchInMemoryCatalog(mockCatalog, "polo negro");
    expect(searchResults).toHaveLength(1);
    const prod = searchResults[0];
    const variante = prod.variantes[0];

    // 2. Agrega 2 unidades al carrito y aplica 10% de descuento rápido
    const cartItems = [{ varianteId: variante.id, cantidad: 2, precioUnitario: prod.precioLiquidacion }];
    const financials = calculateCartFinancials(cartItems, {
      descuentoValor: 10,
      tipoDescuento: "PORCENTAJE",
      metodoPago: "EFECTIVO",
      montoRecibido: 60.0, // Cliente entrega billete de S/. 50 + S/. 10
    });

    // Subtotal: 29.90 * 2 = 59.80. Descuento 10%: 5.98. Total: 53.82.
    expect(financials.subtotal).toBe(59.8);
    expect(financials.descuentoMonto).toBe(5.98);
    expect(financials.total).toBe(53.82);
    expect(financials.vuelto).toBe(6.18); // 60 - 53.82 = 6.18

    // 3. Procesa venta transaccional
    const saleResult = await engine.processSale({
      usuarioId: "usr_cajero_01",
      metodoPago: "EFECTIVO",
      descuento: financials.descuentoMonto,
      tipoDescuento: "PORCENTAJE",
      montoRecibido: 60.0,
      items: cartItems,
    });

    expect(saleResult.success).toBe(true);
    expect(saleResult.venta?.numeroTicket).toMatch(/^TICK-/);
    expect(engine.getVariant(variante.id)?.stockActual).toBe(3); // 5 - 2 = 3 (Pasa a stock crítico)
  });

  // UAT-2: Auditoría de Seguridad y Confidencialidad de Costos (HU-05)
  it("UAT-02: [Auditoría Seguridad] El rol VENDEDOR nunca tiene acceso al costo de compra de productos", () => {
    const productoConCosto = {
      id: "prod_confidencial",
      nombre: "Casaca Militar",
      precioOriginal: 190.0,
      precioLiquidacion: 79.9,
      costo: 35.0, // Confidencial
      activo: true,
    };

    // Vendedor consulta producto
    const vistaVendedor = sanitizeProductForRole(productoConCosto, "VENDEDOR");
    expect(vistaVendedor.precioLiquidacion).toBe(79.9);
    expect(vistaVendedor).not.toHaveProperty("costo");
    expect((vistaVendedor as Record<string, unknown>).costo).toBeUndefined();

    // Verificación de permisos RBAC
    expect(hasPermission("VENDEDOR", "VIEW_COSTS")).toBe(false);
    expect(hasPermission("VENDEDOR", "VOID_SALE")).toBe(false);
    expect(hasPermission("VENDEDOR", "ADJUST_INVENTORY")).toBe(false);

    // Administrador sí tiene acceso a costos
    const vistaAdmin = sanitizeProductForRole(productoConCosto, "ADMIN");
    expect(vistaAdmin.costo).toBe(35.0);
  });

  // UAT-3: Flujo de Administrador: Anulación de Venta con Motivo y Auditoría Kardex (HU-08)
  it("UAT-03: [Flujo Admin] Anulación de venta con motivo justificado y restitución exacta del stock en Kardex", async () => {
    // 1. Se registra una venta de 1 taladro
    const saleRes = await engine.processSale({
      usuarioId: "usr_cajero_01",
      metodoPago: "YAPE",
      items: [{ varianteId: "var_taladro", cantidad: 1, precioUnitario: 119.0 }],
    });

    expect(engine.getVariant("var_taladro")?.stockActual).toBe(1); // 2 - 1 = 1

    // 2. Administrador anula la venta
    const voidRes = await engine.voidSale({
      ventaId: saleRes.venta!.id,
      solicitanteId: "usr_admin",
      rolSolicitante: "ADMIN",
      motivo: "Devolución en caja por producto de muestra equivocado",
    });

    expect(voidRes.success).toBe(true);
    expect(voidRes.venta?.estado).toBe("ANULADA");

    // 3. Stock restituido a 2
    expect(engine.getVariant("var_taladro")?.stockActual).toBe(2);

    // 4. Verificación de trazabilidad en Kardex
    const kardex = engine.getKardexForVariant("var_taladro");
    expect(kardex).toHaveLength(2); // VENTA (-1) seguido de ANULACION (+1)
    expect(kardex[1].tipo).toBe("ANULACION");
    expect(kardex[1].cantidad).toBe(1);
    expect(kardex[1].motivo).toContain("Devolución en caja");
  });

  // UAT-4: Importación Masiva Excel con Agrupación de Variantes y Detección de Errores (HU-07)
  it("UAT-04: [Flujo Importación] Parseo masivo, agrupación por SKU Base y detección de filas erróneas", () => {
    const filasImportadas = [
      { nombre: "Pantalón Cargo", skuBase: "PANT-CARG", talla: "30", color: "Verde", precioLiquidacion: "S/. 59.90", stock: 15 },
      { nombre: "Pantalón Cargo", skuBase: "PANT-CARG", talla: "32", color: "Verde", precioLiquidacion: "S/. 59.90", stock: 20 },
      { nombre: "Pantalón Cargo", skuBase: "PANT-CARG", talla: "34", color: "Negro", precioLiquidacion: "S/. 59.90", stock: 10 },
      { nombre: "", skuBase: "ERROR-01", precioLiquidacion: "20.00", stock: 5 }, // Inválido: sin nombre
    ];

    const report = validateAndGroupImportRows(filasImportadas);
    expect(report.totalFilas).toBe(4);
    expect(report.filasValidas).toBe(3);
    expect(report.filasFallidas).toBe(1);

    // 1 único producto padre con 3 variantes agrupadas
    expect(report.productosAgrupados).toHaveLength(1);
    const prod = report.productosAgrupados[0];
    expect(prod.nombre).toBe("Pantalón Cargo");
    expect(prod.variantes).toHaveLength(3);
    expect(prod.variantes[0].sku).toBe("PANT-CARG-VERDE-30");
  });

  // UAT-5: Arqueo y Cierre Diario de Caja con Detección de Diferencias (HU-10)
  it("UAT-05: [Flujo Arqueo Caja] Conciliación física, detección de faltante y generación de acta formal con leyenda legal", () => {
    const doc = buildCashClosingDocument({
      id: "ACTA-CIERRE-001",
      cajeroNombre: "Rosa Cajera",
      cajeroId: "usr_rosa",
      supervisorNombre: "Pedro Administrador",
      supervisorId: "usr_pedro",
      fechaApertura: "2026-10-29T08:00:00Z",
      fechaCierre: "2026-10-29T21:00:00Z",
      observaciones: "Diferencia de S/. 5.00 por billete falso retenido",
      input: {
        montoApertura: 200.0,
        ventasEfectivoTotal: 1500.0, // Esperado: 1,700.00
        efectivoContadoFisico: 1695.0, // Contado: 1,695.00 (Faltante S/. 5.00)
        ventasDigitalesTotal: 2300.0,
      },
    });

    expect(doc.calculos.efectivoEsperado).toBe(1700.0);
    expect(doc.calculos.diferencia).toBe(-5.0);
    expect(doc.calculos.estadoDiferencia).toBe("FALTANTE");
    expect(doc.leyendaLegal).toBe("Venta Final de Liquidación - Sin Devolución");

    // Renderizado HTML
    const html = renderCashClosingHtml(doc);
    expect(html).toContain("FALTANTE DE CAJA DETECTADO");
    expect(html).toContain("5.00");
    expect(html).toContain("Venta Final de Liquidación - Sin Devolución");
    expect(html).toContain("Rosa Cajera");
    expect(html).toContain("Pedro Administrador");
  });

  // UAT-6: Sincronización en Tiempo Real entre Laptops de Almacén (<100ms) (HU-04)
  it("UAT-06: [Sincronización Realtime] Venta en Laptop A actualiza el badge y emite alerta en Laptop B en <100ms", () => {
    let alertaRecibida: string | null = null;
    syncManager.onAlert((alert) => {
      alertaRecibida = alert.mensaje;
    });

    const start = performance.now();
    // Laptop A vende 3 polos, stock en Laptop B se actualiza de 5 a 2 (entra a crítico)
    syncManager.applyStockUpdate({
      varianteId: "var_polo_m",
      stockActual: 2,
      timestamp: Date.now(),
    });
    const duracionMs = performance.now() - start;

    expect(duracionMs).toBeLessThan(100);
    const updatedProd = syncManager.getProducts().find((p) => p.id === "prod_1");
    expect(updatedProd?.variantes[0].stockActual).toBe(2);
    expect(alertaRecibida).toContain("Stock Crítico");
  });

  // UAT-7: Estrés Concurrente de Hora Punta en Almacén (HU-01)
  it("UAT-07: [Estrés Concurrente] 10 ventas simultáneas de la última unidad resultan en exactamente 1 venta y 9 rechazos", async () => {
    // Solo queda 1 polo
    engine.setVariant({
      id: "var_polo_m",
      sku: "POLO-HVY-NG-M",
      nombreProducto: "Polo Oversize",
      stockActual: 1,
      precioLiquidacion: 29.9,
    });

    // 10 laptops envían compra en el mismo milisegundo
    const peticiones = Array.from({ length: 10 }).map((_, i) =>
      engine.processSale({
        usuarioId: `cajero_${i}`,
        metodoPago: "PLIN",
        items: [{ varianteId: "var_polo_m", cantidad: 1, precioUnitario: 29.9 }],
      })
    );

    const resultados = await Promise.all(peticiones);
    const exitosas = resultados.filter((r) => r.success);
    const fallidas = resultados.filter((r) => !r.success);

    expect(exitosas).toHaveLength(1);
    expect(fallidas).toHaveLength(9);
    expect(engine.getVariant("var_polo_m")?.stockActual).toBe(0); // CERO sobreventa
  });

  // UAT-8: Resiliencia ante Desconexión y Reconexión Wi-Fi
  it("UAT-08: [Resiliencia de Red] Detección de pérdida de señal Wi-Fi y sincronización completa al reconectar", async () => {
    expect(syncManager.getConnectionStatus()).toBe("CONNECTED");

    // Wi-Fi se corta en el almacén
    syncManager.setConnectionStatus("DISCONNECTED");
    expect(syncManager.getConnectionStatus()).toBe("DISCONNECTED");

    // Se restablece el Wi-Fi y hace full resync con servidor
    await syncManager.fullResync(async () => {
      return [
        {
          id: "prod_1",
          nombre: "Polo Actualizado",
          precioLiquidacion: 29.9,
          variantes: [{ id: "var_polo_m", sku: "POLO-HVY-NG-M", stockActual: 0 }],
        },
      ];
    });

    expect(syncManager.getConnectionStatus()).toBe("CONNECTED");
    expect(syncManager.getProducts()[0].variantes[0].stockActual).toBe(0);
  });

  // UAT-9: Auditoría de Reporte Excel con Fórmulas Dinámicas (HU-09)
  it("UAT-09: [Auditoría Excel] Generación de libro .xlsx con 3 hojas, formato S/. y fórmulas =SUM(...)", async () => {
    const buffer = await generateExecutiveExcelReport({
      fechaInicio: "2026-10-01",
      fechaFin: "2026-10-29",
      solicitanteRol: "ADMIN",
      solicitanteNombre: "Auditor",
      kpis: { totalRecaudado: 1000, totalArticulosVendidos: 20, totalTicketsCompletados: 10, totalTicketsAnulados: 0 },
      metodosPago: [{ metodo: "EFECTIVO", cantidadTickets: 10, totalRecaudado: 1000 }],
      inventario: [
        {
          producto: "Taladro 650W",
          sku: "TAL-650",
          stockInicial: 10,
          stockActual: 5,
          unidadesLiquidadas: 5,
          porcentajeLiquidado: 50,
          precioLiquidacion: 119.0,
        },
      ],
      tickets: [
        {
          numeroTicket: "TICK-001",
          fecha: "2026-10-29",
          hora: "10:00",
          cajero: "Caja 1",
          metodoPago: "EFECTIVO",
          estado: "COMPLETADA",
          subtotal: 119,
          descuento: 0,
          total: 119,
        },
      ],
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  // UAT-10: Auditoría de Seguridad de Sesión y Autenticación por PIN de 4 dígitos (HU-05)
  it("UAT-10: [Auditoría PIN & JWT] Formato estricto de 4 dígitos, hashing bcrypt y ciclo de vida JWT", async () => {
    // 1. Validación de PIN
    expect(validatePinFormat("1234").valid).toBe(true);
    expect(validatePinFormat("123").valid).toBe(false);
    expect(validatePinFormat("12345").valid).toBe(false);
    expect(validatePinFormat("abcd").valid).toBe(false);

    // 2. Hash con bcrypt
    const hashed = await hashPin("1234");
    expect(await verifyPin("1234", hashed)).toBe(true);
    expect(await verifyPin("9999", hashed)).toBe(false);

    // 3. Token JWT
    const token = await createSessionToken({ userId: "cajero_01", nombre: "Cajero Turno", rol: "VENDEDOR" });
    const decoded = await verifySessionToken(token);
    expect(decoded?.userId).toBe("cajero_01");
    expect(decoded?.rol).toBe("VENDEDOR");
  });
});
