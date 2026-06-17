import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { loadEngineInput } from "@/lib/load";
import { runDailyEngine, calcPropia, calcVenta } from "@/lib/engine";

// Server-side report export. ?type=operaciones|caja|inventory|prestamos|daily &format=xlsx
// PDF is generated client-side (jsPDF) to avoid server fonts; this route serves data/xlsx.
export async function GET(req: Request) {
  if (!getSession()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "daily";
  const input = await loadEngineInput();

  let rows: any[] = [];
  if (type === "daily") rows = runDailyEngine(input);
  else if (type === "operaciones")
    rows = input.operaciones.map((o) => ({
      fecha: o.fecha, flujo: o.flujo, cliente: o.clienteId, pagador: o.pagadorId,
      pagoUSD: o.pagoUSD, ingresosUSDT: o.ingresosUSDT,
      ...(o.flujo === "Propia" ? calcPropia(o) : calcVenta(o, input.params)),
    }));
  else if (type === "caja") rows = input.caja;
  else if (type === "prestamos") rows = input.prestamos;
  else if (type === "inventory")
    rows = runDailyEngine(input).map((d) => ({
      fecha: d.fecha, inventarioUSDT: d.saldoWalletAcum, costRate: d.costRate,
      valorCOP: d.valorInventarioCOP, margenBruto: d.margenBruto,
    }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_${type}.xlsx"`,
    },
  });
}
