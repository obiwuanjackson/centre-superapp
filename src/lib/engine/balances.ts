// Cash-box, payer and loan balances. Ports of Caja and Saldos prov logic.
import type { MovimientoCaja, Operacion, Prestamo, AbonoPrestamo } from "../types";
import { calcPropia, calcVenta } from "./operations";
import type { Parametros } from "../types";

export function cajaBalances(mov: MovimientoCaja[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of mov) out[m.caja] = (out[m.caja] ?? 0) + m.entradas - m.salidas;
  return out;
}

/** Per-payer USDT balance: USDT sent (propia.J + venta.N) minus USDT received. */
export function payerBalances(
  operaciones: Operacion[],
  params: Parametros
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of operaciones) {
    if (!o.pagadorId) continue;
    const sent =
      o.flujo === "Propia"
        ? calcPropia(o).usdtAPagador
        : calcVenta(o, params).usdtAPagador;
    out[o.pagadorId] = (out[o.pagadorId] ?? 0) + sent;
  }
  return out;
}

export function loanBalance(p: Prestamo, abonos: AbonoPrestamo[]): number {
  const paid = abonos
    .filter((a) => a.prestamoCodigo === p.codigo)
    .reduce((s, a) => s + a.abono, 0);
  return p.monto - paid;
}

export function loanTotals(prestamos: Prestamo[], abonos: AbonoPrestamo[]) {
  let cxp = 0, cxc = 0;
  for (const p of prestamos) {
    const bal = loanBalance(p, abonos);
    if (p.tipo === "CxP") cxp += bal; else cxc += bal;
  }
  return { cxp, cxc, outstanding: cxp + cxc };
}
