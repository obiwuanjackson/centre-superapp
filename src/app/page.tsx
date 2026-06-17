// Dashboard (server component). KPIs computed server-side via the engine.
import { loadEngineInput } from "@/lib/load";
import { summarize, loanTotals, cajaBalances, payerBalances } from "@/lib/engine";
import { repo, FILES } from "@/lib/storage";
import type { Cliente } from "@/lib/types";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n * 1000);
const fmtN = (n: number, d = 2) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const input = await loadEngineInput();
  const s = summarize(input);
  const loans = loanTotals(input.prestamos, input.abonos);
  const cash = cajaBalances(input.caja);
  const payers = payerBalances(input.operaciones, input.params);
  const clientes = await repo().collection<Cliente>(FILES.clientes).all();
  const ventas = input.operaciones.filter((o) => o.flujo === "Venta");
  const totalUSD = input.operaciones.reduce((a, o) => a + (o.pagoUSD ?? 0), 0);
  const totalUSDT = ventas.reduce((a, o) => a + (o.ingresosUSDT ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">KPIs financieros</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI label="Capital total" value={`$${fmtCOP(s.totalCapital)}`} sub="COP" />
          <KPI label="Efectivo (cajas)" value={`$${fmtCOP(s.efectivo)}`} sub="COP" />
          <KPI label="Utilidad realizada" value={`${fmtN(s.realizedProfitUSDT)} USDT`} />
          <KPI label="Margen bruto" value={fmtN(s.margenBruto)} sub="COP/USDT" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">KPIs de inventario</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI label="Inventario USDT" value={`${fmtN(s.inventarioUSDT)} USDT`} />
          <KPI label="Costo prom. (WAC)" value={fmtN(s.costRate)} sub="USDT/COP×1000" />
          <KPI label="Valor inventario" value={`$${fmtCOP(s.inventarioValorCOP)}`} sub="COP" />
          <KPI label="TRM" value={fmtN(input.params.trm, 0)} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">KPIs operativos</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI label="Operaciones" value={fmtN(input.operaciones.length, 0)} />
          <KPI label="USD operado" value={`$${fmtN(totalUSD, 0)}`} />
          <KPI label="USDT operado" value={fmtN(totalUSDT, 0)} />
          <KPI label="Clientes" value={fmtN(clientes.length, 0)} />
          <KPI label="Préstamos vivos (CxP)" value={`$${fmtCOP(loans.cxp)}`} />
          <KPI label="Préstamos (CxC)" value={`$${fmtCOP(loans.cxc)}`} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 font-semibold">Saldo por caja</h3>
          <table className="w-full">
            <tbody>
              {Object.entries(cash).map(([k, v]) => (
                <tr key={k}><td className="td">{k}</td><td className="td text-right">${fmtN(v, 0)}</td></tr>
              ))}
              {Object.keys(cash).length === 0 && <tr><td className="td text-slate-400">Sin movimientos</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold">USDT enviado por pagador</h3>
          <table className="w-full">
            <tbody>
              {Object.entries(payers).map(([k, v]) => (
                <tr key={k}><td className="td">{k}</td><td className="td text-right">{fmtN(v)} USDT</td></tr>
              ))}
              {Object.keys(payers).length === 0 && <tr><td className="td text-slate-400">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
