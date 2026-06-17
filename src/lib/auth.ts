// Minimal credential auth with role-based permissions. Users come from APP_USERS env
// ("user:pass:role"). Session is a signed HMAC cookie — no external auth service needed.
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Role } from "./types";

export interface Session { user: string; role: Role; }

const COOKIE = "usdt_session";

function secret() {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}
function sign(payload: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}
function verify(token: string): Session | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const payload = Buffer.from(body, "base64url").toString();
  const expect = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  try { return JSON.parse(payload) as Session; } catch { return null; }
}

function users(): { user: string; pass: string; role: Role }[] {
  const raw = process.env.APP_USERS || "admin:admin:admin,operador:operador:operador";
  return raw.split(",").map((u) => {
    const [user, pass, role] = u.split(":");
    return { user, pass, role: (role as Role) || "operador" };
  });
}

export function login(user: string, pass: string): Session | null {
  const u = users().find((x) => x.user === user && x.pass === pass);
  if (!u) return null;
  const session: Session = { user: u.user, role: u.role };
  cookies().set(COOKIE, sign(JSON.stringify(session)), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return session;
}
export function logout() { cookies().delete(COOKIE); }

export function getSession(): Session | null {
  const tok = cookies().get(COOKIE)?.value;
  return tok ? verify(tok) : null;
}

export function requireRole(role: Role): Session {
  const s = getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  if (role === "admin" && s.role !== "admin") throw new Error("FORBIDDEN");
  return s;
}
