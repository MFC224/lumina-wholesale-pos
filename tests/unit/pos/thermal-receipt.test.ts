import { describe, it, expect } from "vitest";
import {
  generateThermalReceiptHtml,
  LEYENDA_LIQUIDACION_TICKET,
  ThermalReceiptData,
} from "@/lib/pos/thermal-receipt";

describe("Thermal Receipt Generator (HU-Voucher 80mm/58mm)", () => {
  const sampleData: ThermalReceiptData = {
    numeroTicket: "TICK-20261030-001234",
    cajeroNombre: "Rosa Martínez",
    fecha: new Date("2026-10-30T10:30:00Z"),
    metodoPago: "EFECTIVO",
    subtotal: 100.0,
    descuento: 15.0,
    tipoDescuento: "PORCENTAJE",
    total: 85.0,
    montoRecibido: 100.0,
    vuelto: 15.0,
    clienteNombre: "Juan Pérez",
    clienteDocumento: "72849102",
    items: [
      {
        nombre: "Polo Oversize Heavyweight Cotton",
        sku: "POL-HVY-NG-M",
        talla: "M",
        color: "Negro",
        cantidad: 2,
        precioUnitario: 29.9,
        subtotal: 59.8,
      },
      {
        nombre: "Martillo de Uña Curva 16oz",
        sku: "MAR-16-AZ",
        cantidad: 1,
        precioUnitario: 19.9,
        subtotal: 19.9,
      },
    ],
  };

  it("debe contener el encabezado oficial de Import L&R y RUC", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain("IMPORT L&R");
    expect(html).toContain("IMPORTACIÓN & VENTAS AL POR MAYOR");
    expect(html).toContain("RUC: 20608945123");
    expect(html).toContain("SOLES (S/.)");
  });

  it("debe renderizar el número de ticket y datos del cajero", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain("TICK-20261030-001234");
    expect(html).toContain("Rosa Martínez");
    expect(html).toContain("EFECTIVO");
  });

  it("debe renderizar el cliente y documento de identidad", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("72849102");
  });

  it("debe desglosar los ítems con cantidades, tallas/colores y subtotales en Soles", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain("Polo Oversize Heavyweight Cotton");
    expect(html).toContain("POL-HVY-NG-M");
    expect(html).toContain("M / Negro");
    expect(html).toContain("Martillo de Uña Curva 16oz");
  });

  it("debe mostrar el desglose financiero exacto de Efectivo Recibido y Vuelto", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain("SUBTOTAL:");
    expect(html).toContain("DESCUENTO:");
    expect(html).toContain("TOTAL PAGADO:");
    expect(html).toContain("EFECTIVO RECIBIDO:");
    expect(html).toContain("VUELTO ENTREGADO:");
  });

  it("debe contener la leyenda legal obligatoria de liquidación", () => {
    const html = generateThermalReceiptHtml(sampleData);
    expect(html).toContain(LEYENDA_LIQUIDACION_TICKET);
  });

  it("debe soportar ancho térmico de 58mm adaptando estilos", () => {
    const html58 = generateThermalReceiptHtml(sampleData, "58mm");
    expect(html58).toContain("size: 58mm auto;");
    expect(html58).toContain("width: 58mm;");
  });

  it("debe mostrar marca de agua si el ticket está anulado", () => {
    const anuladoData: ThermalReceiptData = {
      ...sampleData,
      anulada: true,
      motivoAnulacion: "Error de digitación en caja",
    };
    const html = generateThermalReceiptHtml(anuladoData);
    expect(html).toContain("*** TICKET ANULADO ***");
    expect(html).toContain("Error de digitación en caja");
  });
});
