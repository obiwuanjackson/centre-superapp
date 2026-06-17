"use client";
import { useEffect, useState } from "react";

export default function AuditoriaPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    fetch("/api/auditoria?limit=200").then(async (r) => {
      if (r.status === 403) { setDenied(true); return; }
      const d = await r.json();
      setRows(d.rows ?? []);
    });
  }, []);

  if (denied) return <p className="text-sm text-red-600">Solo administradores.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Auditoría</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{["Fecha", "Usuario", "Módulo", "Acción", "Registro"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td">{String(r.ts).slice(0, 19).replace("T", " ")}</td>
                <td className="td">{r.user}</td>
                <td className="td">{r.module}</td>
                <td className="td">{r.action}</td>
                <td className="td font-mono text-xs">{r.recordId}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="td text-slate-400" colSpan={5}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
