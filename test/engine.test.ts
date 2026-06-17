// Validates the engine against real values pulled from "Maestro operaciones USDT.xlsx".
// Run: npm test   (uses tsx). Fixtures are the exact Excel cell outputs.
import { calcPropia, calcVenta } from "../src/lib/engine/operations";
import type { Operacion, Parametros } from "../src/lib/types";

const params: Parametros = {
  trm: 3410, comisionBase: 0.008, clienteOPO: "OPO", clienteAVON: "AVON",
  cajas: [], conceptos: [], detalles: [], estados: [], empresas: [],
};

let pass = 0, fail = 0;
function near(name: string, got: number, exp: number, tol = 1e-3) {
  const ok = Math.abs(got - exp) <= tol;
  if (ok) { pass++; console.log(`  ok   ${name}: ${got}`); }
  else { fail++; console.log(`  FAIL ${name}: got ${got}, expected ${exp}`); }
}

// ---- Operación (venta) fixtures, from sheet rows ----
function venta(o: Partial<Operacion>): Operacion {
  return {
    id: "t", flujo: "Venta", tipoOperacion: "USDT", fecha: "2026-02-10",
    clienteId: o.clienteId!, codigo: 0, pagadorId: "OTC",
    comisionClienteSnapshot: o.comisionClienteSnapshot ?? 0,
    comisionPagadorSnapshot: o.comisionPagadorSnapshot ?? 0,
    createdAt: "", createdBy: "t", ...o,
  } as Operacion;
}

console.log("Operación (venta):");
let v = calcVenta(venta({ clienteId: "OPO", pagoUSD: 27248, ingresosUSDT: 29304, comisionClienteSnapshot: 0.006, comisionPagadorSnapshot: 0.004 }), params);
near("F usdtEquiv row13", v.usdtEquivalente, 27411.488);
near("N usdtPagador row13", v.usdtAPagador, 27356.992);

v = calcVenta(venta({ clienteId: "AVON", pagoUSD: 14000, ingresosUSDT: 85000, comisionClienteSnapshot: 0.006, comisionPagadorSnapshot: 0.004 }), params);
near("F usdtEquiv AVON r27", v.usdtEquivalente, 14084);
near("N usdtPagador AVON r27", v.usdtAPagador, 14056);
near("P utilUSDT AVON r27", v.utilidadUSDT, 168.9860835, 1e-3);

v = calcVenta(venta({ clienteId: "AVON", pagoUSD: 10000, ingresosUSDT: 71814, comisionClienteSnapshot: 0.006, comisionPagadorSnapshot: 0.004 }), params);
near("P utilUSDT AVON r28", v.utilidadUSDT, 142.7713718, 1e-3);

v = calcVenta(venta({ clienteId: "AVON", pagoUSD: 54500, ingresosUSDT: 11613, comisionClienteSnapshot: 0.006, comisionPagadorSnapshot: 0.004 }), params);
near("P utilUSDT AVON r29", v.utilidadUSDT, 23.08747515, 1e-3);

// ---- Operacion_propia fixtures ----
function propia(o: Partial<Operacion>): Operacion {
  return {
    id: "t", flujo: "Propia", tipoOperacion: "Efectivo", fecha: "2026-02-09",
    clienteId: o.clienteId!, codigo: o.codigo ?? 0, pagadorId: "OTC",
    comisionClienteSnapshot: 0, comisionPagadorSnapshot: o.comisionPagadorSnapshot ?? 0,
    createdAt: "", createdBy: "t", ...o,
  } as Operacion;
}
console.log("Operacion_propia:");
let p = calcPropia(propia({ clienteId: "SONY", pagoUSD: 27000, pv: 3660, precioCompra: 3620, compras: 29996, comisionPagadorSnapshot: 0.004 }));
near("J usdtPagador SONY", p.usdtAPagador, 27108);
near("U totalDue SONY", p.totalDueCOP, 98820);
near("V totalCompras SONY", p.totalComprasCOP, 108585.52);
near("W saldoCorriente SONY", p.saldoCorriente, 2888);
near("X comprasNetas SONY", p.comprasNetas, 29996);
near("AC comisionFija SONY (>10k)", p.comisionFijaUSD, 0);

p = calcPropia(propia({ clienteId: "LUNA", pagoUSD: 0.001, pv: 3600, comisionPagadorSnapshot: 0.004 }));
near("AC comisionFija LUNA (<=10k OTC)", p.comisionFijaUSD, 25);
near("U totalDue LUNA", p.totalDueCOP, 0.0036);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
