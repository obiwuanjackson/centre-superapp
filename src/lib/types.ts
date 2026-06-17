// Domain model. Mirrors the Excel sheets. All money in COP unless noted USDT/USD.

export type Role = "admin" | "operador";

export interface Cliente {
  id: string;            // business identifier (PARAMETROS!A). Globally synchronized.
  nombre: string;        // display name (often == id)
  externa: boolean;      // "Externa" Yes/No
  comision: number;      // client commission rate (PARAMETROS!L), decimal e.g. 0.008
}

export interface Pagador {
  id: string;            // PARAMETROS!G  (OTC, PARE, Propia, N/A, OTC_nocom)
  nombre: string;
  comision: number;      // PARAMETROS!H payer commission, decimal
}

export type TipoOperacion = "Efectivo" | "USDT";
export type TipoCliente = "Propia" | "Venta";
export type EstadoPago =
  | "Pendiente dirección" | "Pendiente producto" | "Cancelado"
  | "Pendiente de rebote" | "Prueba de existencia" | "";

// Unified operation record (covers Operacion_propia and Operación).
// `flujo` selects which formulas apply.
export interface Operacion {
  id: string;
  flujo: TipoCliente;          // Propia | Venta
  tipoOperacion: TipoOperacion;// Efectivo | USDT
  fecha: string;               // ISO date-time
  clienteId: string;
  codigo: string | number;
  // Propia fields
  pagoUSD?: number;            // D (propia) / E (venta) — USD amount
  pv?: number;                 // PV sale price (propia col E)
  transcribe?: boolean;
  envioPagador?: boolean;
  pagadorId?: string;
  precioCompra?: number;       // M (propia)
  compras?: number;            // N (propia) USDT bought
  abonosCOP?: number;          // T (propia)
  fechaAbono?: string;
  // Venta fields
  ingresosUSDT?: number;       // C (venta) USDT delivered by client
  estado?: EstadoPago;         // O (venta)
  empresaRecipient?: string;
  empresaGira?: string;
  operacionExterna?: string;
  // bookkeeping
  comisionClienteSnapshot: number; // commission frozen at record time
  comisionPagadorSnapshot: number; // payer commission frozen at record time
  createdAt: string;
  createdBy: string;
}

export type TipoPrestamo = "CxP" | "CxC";
export interface Prestamo {
  id: string;
  nombre: string;
  codigo: string | number;
  tipo: TipoPrestamo;
  monto: number;
  tasa: number;           // interest %
  fechaPago: string;
  detalle?: string;
  notas?: string;
}
export interface AbonoPrestamo {
  id: string;
  prestamoCodigo: string | number;
  fecha: string;
  abono: number;
  notas?: string;        // e.g. "Liquidación"
}

export interface MovimientoCaja {
  id: string;
  fecha: string;
  caja: string;          // BELGICA | JUNIOR | CAJA | CAJA MENOR
  entradas: number;
  salidas: number;
  concepto: string;      // COMPRAS | GASTOS | ...
  detalle?: string;
  nota?: string;
  gananciaOcasional: boolean; // H flag
}

export interface Wallet {
  id: string;
  nombre: string;
  red?: string;          // e.g. TRON
  direccion?: string;
  activo: boolean;
}
export interface TransferenciaUSDT {
  id: string;
  fecha: string;
  walletOrigen: string;
  walletDestino: string;
  clienteId?: string;
  montoUSDT: number;
  tasa?: number;
  comision?: number;
  estado: "Pendiente" | "Completada" | "Cancelada";
}

export interface InversionUSDT {
  id: string;
  fecha: string;
  inversionUSDT: number;
  tasaUSDT: number;
  inversionCOP: number;  // = inversionUSDT * tasaUSDT / 1000
  notas?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  module: string;
  action: "create" | "update" | "delete";
  recordId: string;
  before: unknown;
  after: unknown;
}

export interface Parametros {
  trm: number;                 // TRM USDT del día
  comisionBase: number;        // PARAMETROS!L2 (0.008)
  clienteOPO: string;          // cliente10 special
  clienteAVON: string;         // cliente13 special
  cajas: string[];
  conceptos: string[];
  detalles: string[];
  estados: EstadoPago[];
  empresas: string[];
}
