// Per-operation calculators. Direct ports of Operacion_propia and Operación columns.
// See FORMULAS_SPEC.md sections 3 and 4. NO rounding of intermediates (matches Excel).
import type { Operacion, Pagador, Cliente, Parametros } from "../types";

export interface PropiaCalc {
  comisionPagador: number;   // I
  usdtAPagador: number;      // J = PagoUSD*(1+comPagador)
  totalDueCOP: number;       // U = PagoUSD*PV/1000
  totalComprasCOP: number;   // V = PrecioCompra*Compras/1000
  saldoCorriente: number;    // W = Compras - usdtAPagador
  comprasNetas: number;      // X = IF(PrecioCompra=0,0,Compras)
  comisionFijaUSD: number;   // AC = 25 if OTC & <=10000 else 0
}

export interface VentaCalc {
  usdtEquivalente: number;   // F = PagoUSD*(1+comCliente)
  comisionPagador: number;   // M
  usdtAPagador: number;      // N = (Estado=Cancelado? '' : PagoUSD*(1+comPagador))
  utilidadUSDT: number;      // P = (Ingresos/(1+comCliente))*(comCliente-comPagador)
  comisionFijaUSD: number;   // X = 25 if OTC & <=10000 else 0
}

function rate(map: Map<string, number>, id?: string): number {
  if (!id) return 0;
  return map.get(id) ?? 0;
}

/** Operacion_propia (flujo = Propia). */
export function calcPropia(op: Operacion): PropiaCalc {
  const pagoUSD = op.pagoUSD ?? 0;
  const pv = op.pv ?? 0;
  const precioCompra = op.precioCompra ?? 0;
  const compras = op.compras ?? 0;
  // commission frozen at record time (historical commission rule)
  const comPagador = op.codigo === 999 ? 0 : op.comisionPagadorSnapshot;
  const usdtAPagador = pagoUSD * (1 + comPagador);
  const isOTC = op.pagadorId === "OTC";
  return {
    comisionPagador: comPagador,
    usdtAPagador,
    totalDueCOP: (pagoUSD * pv) / 1000,
    totalComprasCOP: (precioCompra * compras) / 1000,
    saldoCorriente: compras - usdtAPagador,
    comprasNetas: precioCompra === 0 ? 0 : compras,
    comisionFijaUSD: pagoUSD > 0 && isOTC && pagoUSD <= 10000 ? 25 : 0,
  };
}

/** Operación (flujo = Venta). */
export function calcVenta(op: Operacion, params: Parametros): VentaCalc {
  const pagoUSD = op.pagoUSD ?? 0;
  const ingresos = op.ingresosUSDT ?? 0;
  const comCliente = op.comisionClienteSnapshot;
  let comPagador = op.comisionPagadorSnapshot;
  // special clients OPO / AVON were given a fixed payer commission in some rows;
  // the workbook still VLOOKUPs by default, so we keep the snapshot unless flagged.
  const usdtEquivalente = op.clienteId ? pagoUSD * (1 + comCliente) : 0;
  const usdtAPagador = op.estado === "Cancelado" ? 0 : pagoUSD * (1 + comPagador);
  const isOPO = op.clienteId === params.clienteOPO;
  // P: for OPO the profit is taken from the paired USD utility (recorded), else spread.
  const utilidadUSDT = isOPO
    ? 0 // OPO profit handled via paired record; spread not applied
    : op.clienteId
    ? (ingresos / (1 + comCliente)) * (comCliente - comPagador)
    : 0;
  const isOTC = op.pagadorId === "OTC";
  return {
    usdtEquivalente,
    comisionPagador: comPagador,
    usdtAPagador,
    utilidadUSDT,
    comisionFijaUSD: pagoUSD > 0 && isOTC && pagoUSD <= 10000 ? 25 : 0,
  };
}

/** Resolve the commission snapshots to freeze on a new record (historical rule). */
export function freezeCommissions(
  clienteId: string,
  pagadorId: string | undefined,
  clientes: Cliente[],
  pagadores: Pagador[]
): { cliente: number; pagador: number } {
  const c = clientes.find((x) => x.id === clienteId)?.comision ?? 0;
  const p = pagadores.find((x) => x.id === pagadorId)?.comision ?? 0;
  return { cliente: c, pagador: p };
}
