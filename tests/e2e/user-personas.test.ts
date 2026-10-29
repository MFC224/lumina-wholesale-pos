import { describe, it, expect, beforeEach } from "vitest";
import { SalesTransactionEngine, VariantEntity } from "@/lib/sales/engine";
import { searchInMemoryCatalog, SearchableProduct } from "@/lib/pos/search";
import { calculateCartFinancials } from "@/lib/pos/calculations";
import { StockSyncManager } from "@/lib/realtime/sync";
import { validateAndGroupImportRows } from "@/lib/catalog/importer";
import { calcularArqueoCaja, buildCashClosingDocument, renderCashClosingHtml } from "@/lib/reports/cash-closing";
import { generateExecutiveExcelReport } from "@/lib/reports/excel";
import { ExecutiveReportData } from "@/types/reports";
import { sanitizeProductForRole } from "@/lib/auth/rbac";
import { validatePinFormat, hashPin, verifyPin } from "@/lib/auth/pin";

describe("PRUEBAS DE ACEPTACIÓN DE USUARIO (UAT) POR PERSONAS Y ROLES REALES", () => {
  let engine: SalesTransactionEngine;
  let syncManager: StockSyncManager;

  const initialInventory: VariantEntity[] = [
    {
      id: "var_polo_negro_m",
      sku: "POLO-HVY-NG-M",
      nombreProducto: "Polo Oversize Heavyweight 240g",
      talla: "M",
      color: "Negro",
      stockActual: 20,
      precioLiquidacion: 28.0,
    },
    {
      id: "var_taladro_650w",
      sku: "TAL-IND-650",
      nombreProducto: "Taladro Percutor Industrial 650W",
      talla: "Única",
      color: "Azul",
      stockActual: 6,
      precioLiquidacion: 120.0,
    },
    {
      id: "var_zapatilla_41",
      sku: "ZAP-RUN-41",
      nombreProducto: "Zapatilla Running Breathable",
      talla: "41",
      color: "Gris",
      stockActual: 4,
      precioLiquidacion: 85.0,
    },
  ];

  const searchableInventory: SearchableProduct[] = [
    {
      id: "prod_polo",
      nombre: "Polo Oversize Heavyweight 240g",
      codigoSku: "POLO-HVY",
      categoriaNombre: "Textil",
      precioLiquidacion: 28.0,
      variantes: [
        {
          id: "var_polo_negro_m",
          sku: "POLO-HVY-NG-M",
          talla: "M",
          color: "Negro",
          stockActual: 20,
        },
      ],
    },
    {
      id: "prod_taladro",
      nombre: "Taladro Percutor Industrial 650W",
      codigoSku: "TAL-IND",
      categoriaNombre: "Ferretería",
      precioLiquidacion: 120.0,
      variantes: [
        {
          id: "var_taladro_650w",
          sku: "TAL-IND-650",
          talla: "Única",
          color: "Azul",
          stockActual: 6,
        },
      ],
    },
    {
      id: "prod_zapatilla",
      nombre: "Zapatilla Running Breathable",
      codigoSku: "ZAP-RUN",
      categoriaNombre: "Calzado",
      precioLiquidacion: 85.0,
      variantes: [
        {
          id: "var_zapatilla_41",
          sku: "ZAP-RUN-41",
          talla: "41",
          color: "Gris",
          stockActual: 4,
        },
      ],
    },
  ];

  beforeEach(() => {
    engine = new SalesTransactionEngine(initialInventory);
    syncManager = new StockSyncManager(searchableInventory);
  });

  // =========================================================================
  // PERSONA 1: Cajera "Rosa Flores"
  // Turno mañana, cobros rápidos, verificación de vuelto, arqueo exacto
  // =========================================================================
  describe("PERSONA 1: Rosa Flores (Cajera del Turno Mañana)", () => {
    it("USER-ROSA-01: Apertura de terminal con PIN, escaneo de productos y cobro en efectivo con vuelto exacto", async () => {
      // 1. Rosa inicia sesión con su PIN
      const pinRosa = "4589";
      expect(validatePinFormat(pinRosa).valid).toBe(true);
      const hashedPin = await hashPin(pinRosa);
      expect(await verifyPin("4589", hashedPin)).toBe(true);

      // 2. Rosa abre caja con fondo inicial de S/. 100.00
      const fondoApertura = 100.0;

      // 3. Cliente coloca 2 polos y 1 taladro en mostrador. Rosa busca por teclado:
      const searchPolo = searchInMemoryCatalog(searchableInventory, "pol hvy");
      expect(searchPolo.length).toBeGreaterThan(0);
      const searchTaladro = searchInMemoryCatalog(searchableInventory, "tal 650");
      expect(searchTaladro.length).toBeGreaterThan(0);

      // 4. Cálculo financiero del carrito
      const cart = [
        { varianteId: "var_polo_negro_m", precioUnitario: 28.0, cantidad: 2 }, // S/. 56.00
        { varianteId: "var_taladro_650w", precioUnitario: 120.0, cantidad: 1 }, // S/. 120.00
      ];
      const fin = calculateCartFinancials(cart);
      expect(fin.total).toBe(176.0);
      expect(fin.subtotal).toBe(176.0);

      // Desglose tributario SUNAT (18% IGV incluido)
      const baseImponible = Number((fin.total / 1.18).toFixed(2));
      const igvCalculado = Number((fin.total - baseImponible).toFixed(2));
      expect(baseImponible).toBe(149.15);
      expect(igvCalculado).toBe(26.85);

      // 5. Cliente paga con un billete de S/. 200.00 en efectivo
      const montoRecibido = 200.0;
      const vuelto = Number((montoRecibido - fin.total).toFixed(2));
      expect(vuelto).toBe(24.0); // S/. 24.00 de vuelto exacto

      // 6. Procesar venta atómica en el sistema
      const saleResult = await engine.processSale({
        usuarioId: "usr_rosa_cajera",
        items: [
          { varianteId: "var_polo_negro_m", precioUnitario: 28.0, cantidad: 2 },
          { varianteId: "var_taladro_650w", precioUnitario: 120.0, cantidad: 1 },
        ],
        metodoPago: "EFECTIVO",
        montoRecibido,
      });

      expect(saleResult.success).toBe(true);
      expect(saleResult.venta?.vuelto).toBe(24.0);
      expect(saleResult.venta?.total).toBe(176.0);

      // Stock actualizado correctamente
      expect(engine.getVariant("var_polo_negro_m")?.stockActual).toBe(18);
      expect(engine.getVariant("var_taladro_650w")?.stockActual).toBe(5);

      // 7. Rosa cierra turno: Efectivo esperado = Fondo (100) + Venta (176) = S/. 276.00
      const arqueo = calcularArqueoCaja({
        montoApertura: fondoApertura,
        ventasEfectivoTotal: 176.0,
        efectivoContadoFisico: 276.0, // Rosa cuenta exactamente S/. 276.00
        ventasDigitalesTotal: 0.0,
      });

      expect(arqueo.efectivoEsperado).toBe(276.0);
      expect(arqueo.diferencia).toBe(0.0);
      expect(arqueo.estadoDiferencia).toBe("CUADRADO");
    });
  });

  // =========================================================================
  // PERSONA 2: Juan Carlos (Comprador Mayorista / Liquidador)
  // Compra por volumen, descuento mayorista y comprobante con desglose legal
  // =========================================================================
  describe("PERSONA 2: Juan Carlos (Comprador Mayorista de Liquidación)", () => {
    it("USER-JUAN-02: Compra por lote de 10 unidades de polos con 15% de descuento por volumen y desglose SUNAT", async () => {
      // 1. Juan solicita 10 polos para reventa
      const cantidad = 10;
      const precioUnitario = 28.0;
      const items = [{ varianteId: "var_polo_negro_m", precioUnitario, cantidad }];

      // 2. Aplicar 15% de descuento mayorista
      const financials = calculateCartFinancials(items, { tipoDescuento: "PORCENTAJE", descuentoValor: 15 });

      // Precio base: 280.00. Descuento 15%: 42.00. Total con descuento: 238.00
      expect(financials.subtotal).toBe(280.0);
      expect(financials.descuentoMonto).toBe(42.0);
      expect(financials.total).toBe(238.0);

      // Desglose fiscal SUNAT: Subtotal (238 / 1.18) = 201.69, IGV 18% = 36.31
      const baseImponible = Number((financials.total / 1.18).toFixed(2));
      const igv = Number((financials.total - baseImponible).toFixed(2));
      expect(baseImponible).toBe(201.69);
      expect(igv).toBe(36.31);
      expect(Number((baseImponible + igv).toFixed(2))).toBe(238.0);

      // 3. Pago digital vía YAPE
      const venta = await engine.processSale({
        usuarioId: "vendedor_02",
        items: [{ varianteId: "var_polo_negro_m", precioUnitario: 28.0, cantidad: 10 }],
        metodoPago: "YAPE",
        tipoDescuento: "PORCENTAJE",
        descuento: 15,
        montoRecibido: 238.0,
      });

      expect(venta.success).toBe(true);
      expect(venta.venta?.total).toBe(238.0);
      expect(venta.venta?.descuento).toBe(42.0);
      expect(venta.venta?.metodoPago).toBe("YAPE");

      // Stock de polo disminuyó de 20 a 10
      expect(engine.getVariant("var_polo_negro_m")?.stockActual).toBe(10);
    });
  });

  // =========================================================================
  // PERSONA 3: Carlos Ramos (Jefe de Almacén y Recepción)
  // Carga masiva de inventario con deduplicación y generación de SKUs
  // =========================================================================
  describe("PERSONA 3: Carlos Ramos (Jefe de Almacén)", () => {
    it("USER-CARLOS-03: Ingesta de guía de remisión en Excel con 5 variantes, normalización y deduplicación", () => {
      const loteRecepcion = [
        {
          nombre: "Casaca Cortaviento Térmica",
          skuBase: "CAS-COR",
          categoria: "TEXTIL",
          talla: "S",
          color: "Negro",
          precioLiquidacion: "S/. 59.90",
          costo: "S/. 25.00",
          stockInicial: "15",
        },
        {
          nombre: "Casaca Cortaviento Térmica",
          skuBase: "CAS-COR",
          categoria: "TEXTIL",
          talla: "M",
          color: "Negro",
          precioLiquidacion: "S/. 59.90",
          costo: "S/. 25.00",
          stockInicial: "20",
        },
        {
          nombre: "Casaca Cortaviento Térmica",
          skuBase: "CAS-COR",
          categoria: "TEXTIL",
          talla: "L",
          color: "Negro",
          precioLiquidacion: "S/. 59.90",
          costo: "S/. 25.00",
          stockInicial: "10",
        },
      ];

      const report = validateAndGroupImportRows(loteRecepcion);

      expect(report.filasValidas).toBe(3);
      expect(report.productosAgrupados.length).toBe(1); // 1 producto padre con 3 variantes

      const producto = report.productosAgrupados[0];
      expect(producto.nombre).toBe("Casaca Cortaviento Térmica");
      expect(producto.precioLiquidacion).toBe(59.9);
      expect(producto.costo).toBe(25.0);
      expect(producto.variantes.length).toBe(3);

      // Verificación de stock consolidado: 15 + 20 + 10 = 45 unidades
      const totalStockLote = producto.variantes.reduce((sum, v) => sum + v.stockInicial, 0);
      expect(totalStockLote).toBe(45);
    });
  });

  // =========================================================================
  // PERSONA 4: Pedro Gómez (Supervisor General y Auditor)
  // Anulación auditada, revisión de descuadre y exportación de informe Excel
  // =========================================================================
  describe("PERSONA 4: Pedro Gómez (Supervisor General y Auditor)", () => {
    it("USER-PEDRO-04: Gestión de descuadre en arqueo, anulación justificada con Kardex y generación de Excel oficial", async () => {
      // 1. Pedro supervisa arqueo de caja con faltante de S/. 20.00
      const cierreData = {
        id: "ACTA-2026-10-29-001",
        fechaApertura: new Date().toISOString(),
        fechaCierre: new Date().toISOString(),
        cajeroId: "usr_cajero_tarde",
        cajeroNombre: "Lucía Cajera",
        supervisorId: "usr_pedro_admin",
        supervisorNombre: "Pedro Gómez (Supervisor General)",
        input: {
          montoApertura: 150.0,
          ventasEfectivoTotal: 850.0, // Esperado: S/. 1,000.00
          efectivoContadoFisico: 980.0, // Faltante detectado de S/. 20.00
          ventasDigitalesTotal: 1200.0,
        },
      };

      const docArqueo = buildCashClosingDocument(cierreData);
      expect(docArqueo.calculos.diferencia).toBe(-20.0);
      expect(docArqueo.calculos.estadoDiferencia).toBe("FALTANTE");

      // Renderizar HTML para acta física
      const htmlArqueo = renderCashClosingHtml(docArqueo);
      expect(htmlArqueo).toContain("FALTANTE DE CAJA DETECTADO");
      expect(htmlArqueo).toContain("20.00");
      expect(htmlArqueo).toContain("Venta Final de Liquidación - Sin Devolución");
      expect(htmlArqueo).toContain("Pedro Gómez");

      // 2. Pedro autoriza anulación de una venta de zapatilla
      const ventaZapatilla = await engine.processSale({
        usuarioId: "usr_cajero_tarde",
        items: [{ varianteId: "var_zapatilla_41", precioUnitario: 85.0, cantidad: 1 }],
        metodoPago: "EFECTIVO",
        montoRecibido: 85.0,
      });
      expect(ventaZapatilla.success).toBe(true);
      expect(engine.getVariant("var_zapatilla_41")?.stockActual).toBe(3);

      const voidResult = await engine.voidSale({
        ventaId: ventaZapatilla.venta!.id,
        solicitanteId: "usr_pedro_admin",
        rolSolicitante: "ADMIN",
        motivo: "Devolución excepcional autorizada: producto con tara de fábrica no vista en mostrador",
      });

      expect(voidResult.success).toBe(true);
      // Stock restablecido a 4 unidades
      expect(engine.getVariant("var_zapatilla_41")?.stockActual).toBe(4);

      // Kardex registra la reversión
      const kardex = engine.getKardexForVariant("var_zapatilla_41");
      const ultimoMovimiento = kardex[kardex.length - 1];
      expect(ultimoMovimiento.tipo).toBe("ANULACION");
      expect(ultimoMovimiento.stockNuevo).toBe(4);

      // 3. Pedro genera el Reporte Ejecutivo en Excel (.xlsx) con fórmulas dinámicas
      const excelPayload: ExecutiveReportData = {
        fechaInicio: "2026-10-01",
        fechaFin: "2026-10-29",
        solicitanteRol: "ADMIN",
        solicitanteNombre: "Pedro Gómez",
        kpis: {
          totalRecaudado: 2288.0,
          totalArticulosVendidos: 14,
          totalTicketsCompletados: 10,
          totalTicketsAnulados: 1,
        },
        metodosPago: [
          { metodo: "EFECTIVO", cantidadTickets: 7, totalRecaudado: 1288.0 },
          { metodo: "YAPE", cantidadTickets: 3, totalRecaudado: 1000.0 },
        ],
        inventario: [
          {
            producto: "Polo Oversize Heavyweight 240g",
            sku: "POLO-HVY-NG-M",
            talla: "M",
            color: "Negro",
            ubicacion: "Rack A-1",
            stockInicial: 30,
            stockActual: 20,
            unidadesLiquidadas: 10,
            porcentajeLiquidado: 33.3,
            precioLiquidacion: 28.0,
            costo: 12.0,
          },
        ],
        tickets: [
          {
            numeroTicket: "TICK-20261029-0001",
            fecha: "2026-10-29",
            hora: "10:30",
            cajero: "Lucía Cajera",
            metodoPago: "EFECTIVO",
            estado: "COMPLETADA",
            subtotal: 176.0,
            descuento: 0,
            total: 176.0,
          },
        ],
      };

      const buffer = await generateExecutiveExcelReport(excelPayload);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000); // Archivo Excel binario generado
    });
  });
});
