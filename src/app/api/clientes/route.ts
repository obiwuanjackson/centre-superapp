import { NextResponse } from "next/server";
import { crudRoutes } from "@/lib/crud";
import { renameClienteId } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { FILES } from "@/lib/storage";

const base = crudRoutes({ module: FILES.clientes, writeRole: "admin" });
export const GET = base.GET;
export const POST = base.POST;
export const DELETE = base.DELETE;

// PATCH: if the id changes, cascade-rename across all related records (referential
// integrity). Otherwise normal field update.
export async function PATCH(req: Request) {
  const s = getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json();
  if (body.newId && body.newId !== body.id) {
    const res = await renameClienteId(body.id, body.newId, s.user);
    return NextResponse.json({ ok: true, ...res });
  }
  return base.PATCH(new Request(req.url, { method: "PATCH", body: JSON.stringify(body) }));
}
