"use client";
import { useState } from "react";

const reports = [
  ["operaciones", "Operaciones"],
  ["caja", "Caja"],
  ["inventory", "Inventario"],
  ["prestamos", "Préstamos"],
  ["daily", "Balances diarios"],
];

export default function ReportesPage() {
  const [busy, setBusy] = useState("");

  async function pdf(type: string) {
    setBusy(type);
    const [{ jsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const res = await fetch(`/api/series`);
    const { series } = await res.json();
    const doc = new jsPDF();
    doc.text(`Reporte: ${type}`, 14, 16);
    (autoTable as any).default(doc, {
      startY: 22,
      head: [["Fecha", "Capital", "Inventario USDT", "Costo WAC", "Margen"]],
      body: (series ?? []).map((d: any) => [
        d.fecha,
        Math.round(d.totalCapital).toLocaleString("es-CO"),
        d.saldoWalletAcum.toFixed(2),
        d.costRate.toFixed(2),
        d.margenBruto.toFixed(2),
      ]),
      styles: { fontSize: 7 },
    });
    doc.save(`reporte_${type}.pdf`);
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reportes</h1>
      <p className="text-sm text-slate-500">Exporta a Excel o PDF. Cálculos del lado del servidor.</p>
      <div className="card divide-y divide-slate-100">
        {reports.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-3">
            <span className="font-medium">{label}</span>
            <div className="space-x-2">
              <a className="btn-ghost" href={`/api/report?type=${key}&format=xlsx`}>Excel</a>
              <button className="btn" disabled={busy === key} onClick={() => pdf(key)}>
                {busy === key ? "..." : "PDF"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
