import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { repo, FILES } from "@/lib/storage";
import { createOperacion } from "@/lib/services";
import { audit } from "@/lib/audit";
import { calcPropia, calcVenta } from "@/lib/engine";
import { loadParams } from "@/lib/load";
import type { Operacion } from "@/lib/types";

// GET: paginated list with computed columns attached (server-side calc).
export async function GET(req: Request) {
  if (!getSession()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const url = new URL(req.url);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const flujo = url.searchParams.get("flujo");
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const params = await loadParams();
  const { rows, total } = await repo().collection<Operacion>(FILES.operaciones).page({
    offset, limit,
    sort: (a, b) => b.fecha.localeCompare(a.fecha),
    where: (o) =>
      (!flujo || o.flujo === flujo) &&
      (!q || JSON.stringify(o).toLowerCase().includes(q)),
  });
  const enriched = rows.map((o) => ({
    ...o,
    calc: o.flujo === "Propia" ? calcPropia(o) : calcVenta(o, params),
  }));
  return NextResponse.json({ rows: enriched, total, offset, limit });
}

// POST: create — commissions are frozen at insert time (historical rule).
export async function POST(req: Request) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const body = await req.json();
  const rec = await createOperacion({ ...body, createdBy: s.user }, s.user);
  return NextResponse.json(rec, { status: 201 });
}

export async function DELETE(req: Request) {
  const s = getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const col = repo().collection<Operacion>(FILES.operaciones);
  const before = await col.get(id);
  await col.remove(id);
  await audit({ user: s.user, module: "operaciones", action: "delete", recordId: id, before, after: null });
  return NextResponse.json({ ok: true });
}
