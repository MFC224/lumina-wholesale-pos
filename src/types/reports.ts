import { Role } from "./auth";
import { PaymentMethod, SaleRecord } from "./sales";

export interface ExecutiveReportData {
  titulo?: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  solicitanteRol: Role;
  solicitanteNombre: string;
  kpis: {
    totalRecaudado: number;
    totalArticulosVendidos: number;
    totalTicketsCompletados: number;
    totalTicketsAnulados: number;
  };
  metodosPago: {
    metodo: PaymentMethod;
    cantidadTickets: number;
    totalRecaudado: number;
  }[];
  inventario: {
    producto: string;
    sku: string;
    talla?: string | null;
    color?: string | null;
    ubicacion?: string | null;
    stockInicial: number;
    stockActual: number;
    unidadesLiquidadas: number;
    porcentajeLiquidado: number;
    precioLiquidacion: number;
    costo?: number; // Solo si ADMIN
  }[];
  tickets: {
    numeroTicket: string;
    fecha: string;
    hora: string;
    cajero: string;
    metodoPago: PaymentMethod;
    estado: string;
    subtotal: number;
    descuento: number;
    total: number;
  }[];
}

export type CashDifferenceStatus = "CUADRADO" | "SOBRANTE" | "FALTANTE";

export interface CashClosingCalculationInput {
  montoApertura: number;
  ventasEfectivoTotal: number;
  efectivoContadoFisico: number;
  ventasDigitalesTotal?: number;
}

export interface CashClosingResult {
  montoApertura: number;
  ventasEfectivoTotal: number;
  efectivoEsperado: number;
  efectivoContadoFisico: number;
  diferencia: number;
  estadoDiferencia: CashDifferenceStatus;
  ventasDigitalesTotal: number;
  totalVentasGlobal: number;
}

export interface CashClosingReportDocument {
  id: string;
  fechaApertura: Date | string;
  fechaCierre: Date | string;
  cajeroNombre: string;
  cajeroId: string;
  supervisorNombre?: string;
  supervisorId?: string;
  observaciones?: string;
  calculos: CashClosingResult;
  leyendaLegal: string;
  firmas: {
    cajero: { nombre: string; firmado: boolean; fecha?: string };
    administrador: { nombre: string; firmado: boolean; fecha?: string };
  };
}
