import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function POST(req: Request) {
  logout();
  return NextResponse.redirect(new URL("/login", req.url));
}
