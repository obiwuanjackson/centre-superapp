"use client";
import CrudManager from "@/components/CrudManager";

export default function PrestamosPage() {
  return (
    <CrudManager
      endpoint="/api/prestamos"
      title="Préstamos"
      fields={[
        { key: "nombre", label: "Nombre", required: true },
        { key: "codigo", label: "Código" },
        { key: "tipo", label: "Tipo", type: "select", options: ["CxP", "CxC"] },
        { key: "monto", label: "Monto", type: "number" },
        { key: "tasa", label: "Tasa %", type: "number" },
        { key: "fechaPago", label: "Fecha pago", type: "date" },
        { key: "detalle", label: "Detalle" },
        { key: "notas", label: "Notas" },
      ]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "codigo", label: "Código" },
        { key: "tipo", label: "Tipo" },
        { key: "monto", label: "Monto", fmt: (v) => Number(v ?? 0).toLocaleString("es-CO") },
        { key: "tasa", label: "Tasa", fmt: (v) => `${v}%` },
        { key: "fechaPago", label: "Fecha pago", fmt: (v) => String(v ?? "").slice(0, 10) },
      ]}
    />
  );
}
