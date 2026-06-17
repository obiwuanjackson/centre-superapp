// Daily inventory + capital + profitability engine.
// Direct port of "Abonos calculadora & Cierres" (FORMULAS_SPEC.md section 9).
// Inventory method = daily Weighted-Average Cost with carry-forward (confirmed, column Z).
import type {
  Operacion, MovimientoCaja, Prestamo, AbonoPrestamo, InversionUSDT, Parametros,
} from "../types";
import { calcPropia, calcVenta } from "./operations";

export interface DayRow {
  fecha: string;
  efectivo: number;          // P
  cxcConRecibo: number;      // Q
  cxcSinRecibo: number;      // R
  cxcUSDT: number;           // S (USDT units)
  cxpCOP: number;            // T
  comprasNetas: number;      // U (USDT)
  rateDia: number;           // V  (USDT/COP * 1000)
  saldoWalletDia: number;    // W (USDT)
  saldoWalletAcum: number;   // X (USDT inventory qty)
  costRate: number;          // Z  (WAC carry-forward)
  valorInventarioCOP: number;// Y = Z*X/1000
  walletGananciaUSDT: number;// AA
  gananciasCOP: number;      // AB = Z*AA/1000
  cxcPersonas: number;       // AC
  totalCapital: number;      // AD
  incrementoK: number;       // AE
  promedioVenta: number;     // AF
  margenBruto: number;       // AG
  saldoAbierto: number;      // AI (USDT)
  variacionCapital: number;  // AJ
}

const day = (iso: string) => iso.slice(0, 10);

function sumBy<T>(rows: T[], pick: (r: T) => number): number {
  return rows.reduce((a, r) => a + (pick(r) || 0), 0);
}

export interface EngineInput {
  operaciones: Operacion[];
  caja: MovimientoCaja[];
  prestamos: Prestamo[];
  abonos: AbonoPrestamo[];
  inversiones: InversionUSDT[];
  params: Parametros;
}

export function runDailyEngine(input: EngineInput): DayRow[] {
  const { operaciones, caja, prestamos, params } = input;
  const propias = operaciones.filter((o) => o.flujo === "Propia");
  const ventas = operaciones.filter((o) => o.flujo === "Venta");

  // distinct sorted days across all sources
  const days = Array.from(
    new Set<string>([
      ...caja.map((c) => day(c.fecha)),
      ...operaciones.map((o) => day(o.fecha)),
      ...input.inversiones.map((i) => day(i.fecha)),
    ])
  ).sort();

  // loan balances are point-in-time (current saldo by tipo); recomputed each call
  const saldoByTipo = (tipo: "CxP" | "CxC") =>
    sumBy(
      prestamos.filter((p) => p.tipo === tipo),
      (p) => {
        const abonado = sumBy(
          input.abonos.filter((a) => a.prestamoCodigo === p.codigo),
          (a) => a.abono
        );
        return p.monto - abonado;
      }
    );
  const cxpCOP = saldoByTipo("CxP");
  const cxcPersonas = saldoByTipo("CxC");

  const rows: DayRow[] = [];
  let prev: DayRow | null = null;
  let lastCostRate = 0;

  for (const d of days) {
    const cajaD = caja.filter((c) => day(c.fecha) === d);
    const propiaD = propias.filter((o) => day(o.fecha) === d);
    const ventaD = ventas.filter((o) => day(o.fecha) === d);

    // P Efectivo (running)
    const efectivo =
      (prev?.efectivo ?? 0) +
      sumBy(cajaD, (c) => c.entradas) -
      sumBy(cajaD, (c) => c.salidas);

    // U Compras netas, V rate, W wallet day
    const propiaCalc = propiaD.map((o) => ({ o, c: calcPropia(o) }));
    const comprasNetas = sumBy(propiaCalc, (x) => x.c.comprasNetas);
    const totalComprasCOP = sumBy(propiaCalc, (x) => x.c.totalComprasCOP);
    const rateDia = comprasNetas !== 0 ? (totalComprasCOP / comprasNetas) * 1000 : 0;
    const saldoWalletDia =
      sumBy(propiaCalc, (x) => x.o.compras ?? 0) -
      sumBy(propiaCalc, (x) => x.c.usdtAPagador);
    const saldoWalletAcum = (prev?.saldoWalletAcum ?? 0) + saldoWalletDia;

    // Z cost rate (carry-forward WAC)
    const costRate = rateDia === 0 ? lastCostRate : rateDia;
    if (rateDia !== 0) lastCostRate = rateDia;

    const valorInventarioCOP = (costRate * saldoWalletAcum) / 1000;

    // AA/AB wallet profit (USDT col Y of propia, stored as op.gananciaUSDT if present)
    const walletGananciaDia = sumBy(propiaD, (o) => (o as any).gananciaUSDT ?? 0);
    const walletGananciaUSDT = (prev?.walletGananciaUSDT ?? 0) + walletGananciaDia;
    const gananciasCOP = (costRate * walletGananciaUSDT) / 1000;

    // Q/R/S receivables. CxC con recibo accumulates Total due minus abonos.
    const dueDia = sumBy(propiaCalc, (x) => x.c.totalDueCOP);
    const abonosDia = sumBy(propiaD, (o) => o.abonosCOP ?? 0);
    const cxcConRecibo = (prev?.cxcConRecibo ?? 0) + (dueDia - abonosDia);
    const cxcSinRecibo = 0; // requires RC=NO flag; defaults to 0 when not tracked
    const cxcUSDT = (prev?.cxcUSDT ?? 0) + 0;

    // AD total capital
    const totalCapital =
      efectivo + cxcConRecibo + cxcSinRecibo + cxcUSDT * costRate -
      cxpCOP + valorInventarioCOP + gananciasCOP + cxcPersonas;

    // AF promedio venta (rate), excluding codes 0T and 999
    const ventaForAvg = propiaCalc.filter(
      (x) => x.o.codigo !== "0T" && x.o.codigo !== 999
    );
    const sumDue = sumBy(ventaForAvg, (x) => x.c.totalDueCOP);
    const sumUSD = sumBy(ventaForAvg, (x) => x.o.pagoUSD ?? 0);
    const promedioVenta = sumUSD !== 0 ? (sumDue / sumUSD) * 1000 : 0;

    // AG margen bruto
    const margenBruto =
      promedioVenta === 0 ? 0 : promedioVenta - costRate * (1 + params.comisionBase);

    // AI saldo abierto (USDT) cumulative for non-OPO sales up to this day
    const ventasUpto = ventas.filter(
      (o) => day(o.fecha) <= d && o.clienteId !== params.clienteOPO
    );
    const saldoAbierto =
      sumBy(ventasUpto, (o) => o.ingresosUSDT ?? 0) -
      sumBy(ventasUpto, (o) => calcVenta(o, params).usdtEquivalente);

    const incrementoK = totalCapital - (prev?.totalCapital ?? totalCapital);
    const variacionCapital =
      prev && prev.totalCapital !== 0 ? totalCapital / prev.totalCapital - 1 : 0;

    const row: DayRow = {
      fecha: d, efectivo, cxcConRecibo, cxcSinRecibo, cxcUSDT, cxpCOP,
      comprasNetas, rateDia, saldoWalletDia, saldoWalletAcum, costRate,
      valorInventarioCOP, walletGananciaUSDT, gananciasCOP, cxcPersonas,
      totalCapital, incrementoK, promedioVenta, margenBruto, saldoAbierto,
      variacionCapital,
    };
    rows.push(row);
    prev = row;
  }
  return rows;
}

/** Headline KPIs from the latest day + cross-cutting sums. */
export function summarize(input: EngineInput) {
  const series = runDailyEngine(input);
  const last = series[series.length - 1];
  const ventas = input.operaciones.filter((o) => o.flujo === "Venta");
  const realizedProfitUSDT = ventas.reduce(
    (a, o) => a + calcVenta(o, input.params).utilidadUSDT, 0
  );
  return {
    series,
    last: last ?? null,
    realizedProfitUSDT,
    inventarioUSDT: last?.saldoWalletAcum ?? 0,
    costRate: last?.costRate ?? 0,
    inventarioValorCOP: last?.valorInventarioCOP ?? 0,
    totalCapital: last?.totalCapital ?? 0,
    efectivo: last?.efectivo ?? 0,
    margenBruto: last?.margenBruto ?? 0,
  };
}
