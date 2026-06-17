"use client";
import { useEffect, useState, useCallback } from "react";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "date" | "select";
  options?: string[];
  required?: boolean;
}
export interface ColDef { key: string; label: string; fmt?: (v: any, row: any) => string; }

export default function CrudManager({
  endpoint, title, fields, columns, idField = "id", pageSize = 25,
}: {
  endpoint: string;
  title: string;
  fields: FieldDef[];
  columns: ColDef[];
  idField?: string;
  pageSize?: number;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${endpoint}?offset=${offset}&limit=${pageSize}&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [endpoint, offset, pageSize, q]);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setForm({}); setOffset(0); load(); }
    else setErr((await res.json()).error ?? "Error");
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar registro?")) return;
    await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <input className="input max-w-xs" placeholder="Buscar..." value={q}
          onChange={(e) => { setOffset(0); setQ(e.target.value); }} />
      </div>

      <form onSubmit={add} className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === "checkbox" ? (
              <input type="checkbox" checked={!!form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
            ) : f.type === "select" ? (
              <select className="input" value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">—</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="input" type={f.type ?? "text"}
                value={form[f.key] ?? ""} required={f.required}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
            )}
          </div>
        ))}
        <div className="col-span-2 flex items-end md:col-span-4">
          <button className="btn">Agregar</button>
          {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>
            {columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}
            <th className="th"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[idField]}>
                {columns.map((c) => (
                  <td key={c.key} className="td">{c.fmt ? c.fmt(r[c.key], r) : String(r[c.key] ?? "")}</td>
                ))}
                <td className="td text-right">
                  <button className="text-xs text-red-600 hover:underline" onClick={() => del(r[idField])}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={columns.length + 1}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} registros</span>
        <div className="space-x-2">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Anterior</button>
          <button className="btn-ghost" disabled={offset + pageSize >= total} onClick={() => setOffset(offset + pageSize)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
