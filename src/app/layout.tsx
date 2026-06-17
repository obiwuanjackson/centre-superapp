import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Maestro Operaciones USDT",
  description: "Currency trading & USDT operations",
};

const nav = [
  ["/", "Dashboard"],
  ["/operaciones", "Operaciones"],
  ["/clientes", "Clientes"],
  ["/pagadores", "Pagadores"],
  ["/prestamos", "Préstamos"],
  ["/caja", "Caja"],
  ["/wallets", "Wallets"],
  ["/reportes", "Reportes"],
  ["/auditoria", "Auditoría"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  return (
    <html lang="es">
      <body>
        {session ? (
          <div className="flex min-h-screen">
            <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
              <div className="mb-6">
                <div className="text-lg font-bold text-brand-dark">USDT Ops</div>
                <div className="text-xs text-slate-400">{session.user} · {session.role}</div>
              </div>
              <nav className="space-y-1">
                {nav.map(([href, label]) => (
                  <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    {label}
                  </Link>
                ))}
              </nav>
              <form action="/api/auth/logout" method="post" className="mt-6">
                <button className="btn-ghost w-full">Cerrar sesión</button>
              </form>
            </aside>
            <main className="flex-1 p-6">{children}</main>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
