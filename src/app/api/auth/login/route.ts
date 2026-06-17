import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, pass } = await req.json();
  const session = login(user, pass);
  if (!session) return NextResponse.json({ error: "invalid" }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
