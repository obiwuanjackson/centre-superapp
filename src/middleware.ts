import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight gate: redirect to /login when the session cookie is absent.
// Full HMAC verification happens server-side in lib/auth.getSession().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";
  if (isPublic) return NextResponse.next();
  const hasCookie = req.cookies.has("usdt_session");
  if (!hasCookie) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
