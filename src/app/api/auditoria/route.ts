import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const s = getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(req.url);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  return NextResponse.json(await auditLog({ offset, limit }));
}
