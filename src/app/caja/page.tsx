"use client";
import { useEffect, useState } from "react";
import CrudManager from "@/components/CrudManager";
import type { Parametros } from "@/lib/types";

export default function CajaPage() {
  const [p, setP] = useState<Parametros | null>(null);
  useEffect(() => { fetch("/api/parametros").then((r) => r.json()).then(setP); }, []);
  if (!p) return <div className="text-sm text-slate-400">Cargando…</div>;
  return (
    <CrudManager
      endpoint="/api/caja"
      title="Caja"
      fields={[
        { key: "fecha", label: "Fecha", type: "date", required: true },
        { key: "caja", label: "Caja", type: "select", options: p.cajas },
        { key: "entradas", label: "Entradas", type: "number" },
        { key: "salidas", label: "Salidas", type: "number" },
        { key: "concepto", label: "Concepto", type: "select", options: p.conceptos },
        { key: "detalle", label: "Detalle", type: "select", options: p.detalles },
        { key: "nota", label: "Nota" },
        { key: "gananciaOcasional", label: "Ganancia ocasional", type: "checkbox" },
      ]}
      columns={[
        { key: "fecha", label: "Fecha", fmt: (v) => String(v).slice(0, 10) },
        { key: "caja", label: "Caja" },
        { key: "entradas", label: "Entradas", fmt: (v) => Number(v ?? 0).toLocaleString("es-CO") },
        { key: "salidas", label: "Salidas", fmt: (v) => Number(v ?? 0).toLocaleString("es-CO") },
        { key: "concepto", label: "Concepto" },
        { key: "detalle", label: "Detalle" },
      ]}
    />
  );
}
