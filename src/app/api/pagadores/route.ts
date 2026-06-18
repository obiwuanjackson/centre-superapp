import { NextResponse } from "next/server";
import { crudRoutes } from "@/lib/crud";
import { updatePagadorComision, renamePagadorId, updateMasterFields } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { FILES } from "@/lib/storage";

export const dynamic = "force-dynamic";

const base = crudRoutes({ module: FILES.pagadores, writeRole: "admin" });
export const GET = base.GET;
export const POST = base.POST;
export const DELETE = base.DELETE;

// PATCH: id change cascades across operations (pagadorId); commission change applies only
// to future operations; other fields update normally.
export async function PATCH(req: Request) {
  const s = getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json();

  let targetId = body.id;
  if (body.newId && body.newId !== body.id) {
    await renamePagadorId(body.id, body.newId, s.user);
    targetId = body.newId;
  }
  const { id, newId, comision, ...rest } = body;
  if (typeof comision === "number") await updatePagadorComision(targetId, comision, s.user);
  const patch = { ...rest, id: targetId };
  if (Object.keys(rest).length) await updateMasterFields(FILES.pagadores, targetId, patch, s.user);
  return NextResponse.json({ ok: true, id: targetId });
}
