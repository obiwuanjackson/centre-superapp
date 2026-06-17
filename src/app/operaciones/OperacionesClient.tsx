"use client";
import { useEffect, useState, useCallback } from "react";
import type { Cliente, Pagador, Parametros, TipoOperacion, TipoCliente } from "@/lib/types";

interface Props { clientes: Cliente[]; pagadores: Pagador[]; params: Parametros; }

const today = () => new Date().toISOString().slice(0, 16);

export default function OperacionesClient({ clientes, pagadores, params }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [flujoFilter, setFlujoFilter] = useState("");
  const pageSize = 25;

  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacion>("Efectivo");
  const [flujo, setFlujo] = useState<TipoCliente>("Propia");
  const [f, setF] = useState<Record<string, any>>({ fecha: today() });
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/operaciones?offset=${offset}&limit=${pageSize}&flujo=${flujoFilter}`);
    const data = await res.json();
    setRows(data.rows ?? []); setTotal(data.total ?? 0);
  }, [offset, flujoFilter]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const body = { ...f, flujo, tipoOperacion };
    const res = await fetch("/api/operaciones", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { setF({ fecha: today() }); setOffset(0); load(); }
    else setErr((await res.json()).error ?? "Error");
  }

  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const num = (k: string) => (e: any) => set(k, Number(e.target.value));
  const txt = (k: string) => (e: any) => set(k, e.target.value);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Registro de Operaciones</h1>

      <form onSubmit={submit} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="label">Tipo de Operación</label>
            <select className="input" value={tipoOperacion} onChange={(e) => setTipoOperacion(e.target.value as TipoOperacion)}>
              <option>Efectivo</option><option>USDT</option>
            </select>
          </div>
          <div>
            <label className="label">Tipo de Cliente</label>
            <select className="input" value={flujo} onChange={(e) => setFlujo(e.target.value as TipoCliente)}>
              <option value="Propia">Propia</option><option value="Venta">Venta</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="datetime-local" value={f.fecha ?? today()} onChange={txt("fecha")} />
          </div>
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={f.clienteId ?? ""} onChange={txt("clienteId")} required>
              <option value="">—</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Código</label>
            <input className="input" value={f.codigo ?? ""} onChange={txt("codigo")} />
          </div>
          <div>
            <label className="label">Pagador</label>
            <select className="input" value={f.pagadorId ?? ""} onChange={txt("pagadorId")}>
              <option value="">—</option>
              {pagadores.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </div>
        </div>

        {flujo === "Propia" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><label className="label">Pago en USD</label><input className="input" type="number" value={f.pagoUSD ?? ""} onChange={num("pagoUSD")} /></div>
            <div><label className="label">Precio Venta (PV)</label><input className="input" type="number" value={f.pv ?? ""} onChange={num("pv")} /></div>
            <div><label className="label">Precio compra</label><input className="input" type="number" value={f.precioCompra ?? ""} onChange={num("precioCompra")} /></div>
            <div><label className="label">Compras (USDT)</label><input className="input" type="number" value={f.compras ?? ""} onChange={num("compras")} /></div>
            <div className="flex items-end gap-2"><label className="label">Transcribe</label><input type="checkbox" checked={!!f.transcribe} onChange={(e) => set("transcribe", e.target.checked)} /></div>
            <div className="flex items-end gap-2"><label className="label">Envío a Pagador</label><input type="checkbox" checked={!!f.envioPagador} onChange={(e) => set("envioPagador", e.target.checked)} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><label className="label">Ingresos USDT</label><input className="input" type="number" value={f.ingresosUSDT ?? ""} onChange={num("ingresosUSDT")} /></div>
            <div><label className="label">Pago en USD</label><input className="input" type="number" value={f.pagoUSD ?? ""} onChange={num("pagoUSD")} /></div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={f.estado ?? ""} onChange={txt("estado")}>
                {params.estados.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
              </select>
            </div>
            <div><label className="label">Empresa Recipient</label>
              <select className="input" value={f.empresaRecipient ?? ""} onChange={txt("empresaRecipient")}>
                <option value="">—</option>
                {params.empresas.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex items-center">
          <button className="btn">Registrar operación</button>
          {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          <span className="ml-3 text-xs text-slate-400">Las comisiones se congelan al registrar.</span>
        </div>
      </form>

      <div className="flex items-center gap-2">
        <select className="input max-w-xs" value={flujoFilter} onChange={(e) => { setOffset(0); setFlujoFilter(e.target.value); }}>
          <option value="">Todas</option><option value="Propia">Propia</option><option value="Venta">Venta</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>
            {["Fecha", "Flujo", "Cliente", "Pagador", "USD", "USDT", "USDT a pagador", "Utilidad USDT"].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td">{String(r.fecha).slice(0, 16).replace("T", " ")}</td>
                <td className="td">{r.flujo}</td>
                <td className="td">{r.clienteId}</td>
                <td className="td">{r.pagadorId ?? ""}</td>
                <td className="td text-right">{Number(r.pagoUSD ?? 0).toLocaleString("es-CO")}</td>
                <td className="td text-right">{Number(r.ingresosUSDT ?? 0).toLocaleString("es-CO")}</td>
                <td className="td text-right">{Number(r.calc?.usdtAPagador ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</td>
                <td className="td text-right">{Number(r.calc?.utilidadUSDT ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="td text-slate-400" colSpan={8}>Sin operaciones</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} operaciones</span>
        <div className="space-x-2">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Anterior</button>
          <button className="btn-ghost" disabled={offset + pageSize >= total} onClick={() => setOffset(offset + pageSize)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
