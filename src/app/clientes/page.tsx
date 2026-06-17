import CrudManager from "@/components/CrudManager";

export default function ClientesPage() {
  return (
    <CrudManager
      endpoint="/api/clientes"
      title="Clientes"
      idField="id"
      fields={[
        { key: "id", label: "ID", required: true },
        { key: "nombre", label: "Nombre", required: true },
        { key: "comision", label: "Comisión (dec)", type: "number" },
        { key: "externa", label: "Externa", type: "checkbox" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "nombre", label: "Nombre" },
        { key: "comision", label: "Comisión", fmt: (v) => `${(v * 100).toFixed(3)}%` },
        { key: "externa", label: "Externa", fmt: (v) => (v ? "Sí" : "No") },
      ]}
    />
  );
}
