"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    if (res.ok) {
      // Full document load so the root layout re-renders server-side with the new
      // session cookie and the sidebar shows immediately (no manual refresh needed).
      window.location.assign("/");
    } else setErr("Credenciales inválidas");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="card w-80 space-y-4">
        <div className="text-center">
          <div className="text-xl font-bold text-brand-dark">Maestro Operaciones USDT</div>
          <div className="text-xs text-slate-400">Acceso restringido</div>
        </div>
        <div>
          <label className="label">Usuario</label>
          <input className="input" value={user} onChange={(e) => setUser(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn w-full">Ingresar</button>
      </form>
    </div>
  );
}
