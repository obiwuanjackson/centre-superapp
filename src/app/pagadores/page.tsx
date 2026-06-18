"use client";
import CrudManager from "@/components/CrudManager";

export default function PagadoresPage() {
  return (
    <div className="space-y-2">
      <CrudManager
        endpoint="/api/pagadores"
        title="Pagadores"
        idField="id"
        idEditable
        fields={[
          { key: "id", label: "ID", required: true },
          { key: "nombre", label: "Nombre", required: true },
          { key: "comision", label: "Comisión (dec)", type: "number" },
        ]}
        columns={[
          { key: "id", label: "ID" },
          { key: "nombre", label: "Nombre" },
          { key: "comision", label: "Comisión", fmt: (v) => `${(v * 100).toFixed(3)}%` },
        ]}
      />
      <p className="text-xs text-slate-400">
        Nota: cambiar la comisión sólo afecta operaciones futuras. Las operaciones
        históricas conservan la comisión con la que fueron registradas.
      </p>
    </div>
  );
}
