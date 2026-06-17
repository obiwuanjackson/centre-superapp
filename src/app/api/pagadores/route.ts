import { NextResponse } from "next/server";
import { crudRoutes } from "@/lib/crud";
import { updatePagadorComision } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { FILES } from "@/lib/storage";

const base = crudRoutes({ module: FILES.pagadores, writeRole: "admin", genId: undefined });
export const GET = base.GET;
export const POST = base.POST;
export const DELETE = base.DELETE;

// PATCH special-cased: commission change must NOT recompute history.
export async function PATCH(req: Request) {
  const s = getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id, comision, ...rest } = await req.json();
  if (typeof comision === "number") {
    const after = await updatePagadorComision(id, comision, s.user);
    return NextResponse.json(after);
  }
  return base.PATCH(new Request(req.url, { method: "PATCH", body: JSON.stringify({ id, ...rest }) }));
}
