// Service layer: business rules that span collections. Depends only on the Repository
// interface + engine. Enforces: commission freezing, historical-commission immutability,
// and globally-synchronized client IDs (cascade rename, no orphans).
import { repo, FILES } from "./storage";
import { audit } from "./audit";
import { freezeCommissions } from "./engine";
import type {
  Operacion, Cliente, Pagador, Prestamo, TransferenciaUSDT,
} from "./types";

const rid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Create an operation, freezing the commissions in effect right now. */
export async function createOperacion(
  data: Omit<Operacion, "id" | "createdAt" | "comisionClienteSnapshot" | "comisionPagadorSnapshot">,
  user: string
): Promise<Operacion> {
  const clientes = await repo().collection<Cliente>(FILES.clientes).all();
  const pagadores = await repo().collection<Pagador>(FILES.pagadores).all();
  const frozen = freezeCommissions(data.clienteId, data.pagadorId, clientes, pagadores);
  const rec: Operacion = {
    ...data,
    id: rid("op"),
    createdAt: new Date().toISOString(),
    comisionClienteSnapshot: frozen.cliente,
    comisionPagadorSnapshot: frozen.pagador,
  };
  await repo().collection<Operacion>(FILES.operaciones).insert(rec);
  await audit({ user, module: "operaciones", action: "create", recordId: rec.id, before: null, after: rec });
  return rec;
}

/** Change a payer's commission. Historical operations KEEP their snapshot; only future
 * operations use the new rate. We never recompute history. */
export async function updatePagadorComision(
  id: string, comision: number, user: string
): Promise<Pagador> {
  const col = repo().collection<Pagador>(FILES.pagadores);
  const before = await col.get(id);
  if (!before) throw new Error("pagador not found");
  const after = await col.update(id, { comision });
  await audit({ user, module: "pagadores", action: "update", recordId: id, before, after });
  return after;
}

/** Rename a client business ID and cascade across ALL related records so referential
 * integrity holds and no orphans remain. */
export async function renameClienteId(
  oldId: string, newId: string, user: string
): Promise<{ updated: number }> {
  if (!newId || oldId === newId) return { updated: 0 };
  const clientesCol = repo().collection<Cliente>(FILES.clientes);
  const opsCol = repo().collection<Operacion>(FILES.operaciones);
  const transCol = repo().collection<TransferenciaUSDT>(FILES.transfers);

  const existing = await clientesCol.get(newId);
  if (existing) throw new Error(`Client id ${newId} already exists`);

  const cliente = await clientesCol.get(oldId);
  if (!cliente) throw new Error("client not found");

  // 1) the master record (id is the key, so insert new + remove old)
  await clientesCol.insert({ ...cliente, id: newId, nombre: cliente.nombre === oldId ? newId : cliente.nombre });
  await clientesCol.remove(oldId);

  // 2) operations
  const ops = await opsCol.all();
  let updated = 0;
  const newOps = ops.map((o) => {
    if (o.clienteId === oldId) { updated++; return { ...o, clienteId: newId }; }
    return o;
  });
  if (updated) await opsCol.replaceAll(newOps);

  // 3) transfers
  const trans = await transCol.all();
  const newTrans = trans.map((t) => (t.clienteId === oldId ? (updated++, { ...t, clienteId: newId }) : t));
  await transCol.replaceAll(newTrans);

  await audit({
    user, module: "clientes", action: "update", recordId: newId,
    before: { id: oldId }, after: { id: newId, cascaded: updated },
  });
  return { updated };
}

/** Rename a payer id and cascade across operations (pagadorId). Commission snapshots on
 * historical operations are NOT touched — only the identifier propagates. */
export async function renamePagadorId(
  oldId: string, newId: string, user: string
): Promise<{ updated: number }> {
  if (!newId || oldId === newId) return { updated: 0 };
  const pagCol = repo().collection<Pagador>(FILES.pagadores);
  const opsCol = repo().collection<Operacion>(FILES.operaciones);

  if (await pagCol.get(newId)) throw new Error(`Payer id ${newId} already exists`);
  const pagador = await pagCol.get(oldId);
  if (!pagador) throw new Error("payer not found");

  await pagCol.insert({ ...pagador, id: newId, nombre: pagador.nombre === oldId ? newId : pagador.nombre });
  await pagCol.remove(oldId);

  const ops = await opsCol.all();
  let updated = 0;
  const newOps = ops.map((o) =>
    o.pagadorId === oldId ? (updated++, { ...o, pagadorId: newId }) : o
  );
  if (updated) await opsCol.replaceAll(newOps);

  await audit({
    user, module: "pagadores", action: "update", recordId: newId,
    before: { id: oldId }, after: { id: newId, cascaded: updated },
  });
  return { updated };
}

/** Apply non-id field edits to a master record (e.g. nombre, externa). Commission goes
 * through updatePagadorComision / direct update so history stays frozen. */
export async function updateMasterFields(
  module: string, id: string, patch: Record<string, unknown>, user: string
) {
  const col = repo().collection<{ id: string }>(module);
  const before = await col.get(id);
  if (!before) return;
  const after = await col.update(id, patch as any);
  await audit({ user, module, action: "update", recordId: id, before, after });
  return after;
}
