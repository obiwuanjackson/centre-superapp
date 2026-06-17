// Loads the full engine input from the repository. Server-side only.
import { repo, FILES } from "./storage";
import type {
  Operacion, MovimientoCaja, Prestamo, AbonoPrestamo, InversionUSDT, Parametros,
  Cliente, Pagador,
} from "./types";
import type { EngineInput } from "./engine";

const DEFAULT_PARAMS: Parametros = {
  trm: 3410, comisionBase: 0.008, clienteOPO: "OPO", clienteAVON: "AVON",
  cajas: ["BELGICA", "JUNIOR", "CAJA", "CAJA MENOR"],
  conceptos: ["COMPRAS", "GASTOS", "OTROS", "RECAUDOS", "DEVOLUCION CAPITAL", "INVERSIONES", "INGRESO PRESTAMO", "LIQUIDACION", "CAPITALIZACION"],
  detalles: [], estados: ["", "Pendiente dirección", "Pendiente producto", "Cancelado", "Pendiente de rebote", "Prueba de existencia"],
  empresas: [],
};

export async function loadParams(): Promise<Parametros> {
  return (await repo().readDoc<Parametros>(FILES.parametros)) ?? DEFAULT_PARAMS;
}

export async function loadEngineInput(): Promise<EngineInput> {
  const r = repo();
  const [operaciones, caja, prestamos, abonos, inversiones, params] = await Promise.all([
    r.collection<Operacion>(FILES.operaciones).all(),
    r.collection<MovimientoCaja>(FILES.caja).all(),
    r.collection<Prestamo>(FILES.prestamos).all(),
    r.collection<AbonoPrestamo>(FILES.abonos).all(),
    r.collection<InversionUSDT>(FILES.inversiones).all(),
    loadParams(),
  ]);
  return { operaciones, caja, prestamos, abonos, inversiones, params };
}

export async function loadMasters() {
  const r = repo();
  const [clientes, pagadores, params] = await Promise.all([
    r.collection<Cliente>(FILES.clientes).all(),
    r.collection<Pagador>(FILES.pagadores).all(),
    loadParams(),
  ]);
  return { clientes, pagadores, params };
}
