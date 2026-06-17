// Generic CRUD route factory: auth-guarded, audited, paginated. Used by simple
// collections. Complex flows (operaciones, cliente rename) use the service layer.
import { NextResponse } from "next/server";
import { repo } from "./storage";
import { audit } from "./audit";
import { getSession, type Session } from "./auth";
import type { Role } from "./types";

interface Opts {
  module: string;
  writeRole?: Role;        // role required to mutate (default admin)
  genId?: () => string;
}

const newId = (m: string) => `${m}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function crudRoutes<T extends { id: string }>(opts: Opts) {
  const writeRole: Role = opts.writeRole ?? "admin";
  const col = () => repo().collection<T>(opts.module);

  function guardWrite(): Session | NextResponse {
    const s = getSession();
    if (!s) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    if (writeRole === "admin" && s.role !== "admin")
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return s;
  }

  async function GET(req: Request) {
    if (!getSession()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    const url = new URL(req.url);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const where = q
      ? (row: T) => JSON.stringify(row).toLowerCase().includes(q)
      : undefined;
    const { rows, total } = await col().page({ offset, limit, where });
    return NextResponse.json({ rows, total, offset, limit });
  }

  async function POST(req: Request) {
    const s = guardWrite();
    if (s instanceof NextResponse) return s;
    const body = (await req.json()) as Partial<T>;
    const rec = { ...(body as T), id: (body.id as string) || (opts.genId?.() ?? newId(opts.module)) };
    await col().insert(rec);
    await audit({ user: s.user, module: opts.module, action: "create", recordId: rec.id, before: null, after: rec });
    return NextResponse.json(rec, { status: 201 });
  }

  async function PATCH(req: Request) {
    const s = guardWrite();
    if (s instanceof NextResponse) return s;
    const body = (await req.json()) as Partial<T> & { id: string };
    const before = await col().get(body.id);
    if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });
    const after = await col().update(body.id, body);
    await audit({ user: s.user, module: opts.module, action: "update", recordId: body.id, before, after });
    return NextResponse.json(after);
  }

  async function DELETE(req: Request) {
    const s = guardWrite();
    if (s instanceof NextResponse) return s;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const before = await col().get(id);
    await col().remove(id);
    await audit({ user: s.user, module: opts.module, action: "delete", recordId: id, before, after: null });
    return NextResponse.json({ ok: true });
  }

  return { GET, POST, PATCH, DELETE };
}
