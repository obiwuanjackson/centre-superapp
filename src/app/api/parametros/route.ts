import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadParams } from "@/lib/load";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSession()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json(await loadParams());
}
