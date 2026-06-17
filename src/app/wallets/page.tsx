import CrudManager from "@/components/CrudManager";

export default function WalletsPage() {
  return (
    <div className="space-y-8">
      <CrudManager
        endpoint="/api/wallets"
        title="Wallets USDT"
        fields={[
          { key: "nombre", label: "Nombre", required: true },
          { key: "red", label: "Red", type: "select", options: ["TRON", "ETH", "BSC", "OTRA"] },
          { key: "direccion", label: "Dirección" },
          { key: "activo", label: "Activo", type: "checkbox" },
        ]}
        columns={[
          { key: "nombre", label: "Nombre" },
          { key: "red", label: "Red" },
          { key: "direccion", label: "Dirección" },
          { key: "activo", label: "Activo", fmt: (v) => (v ? "Sí" : "No") },
        ]}
      />
      <CrudManager
        endpoint="/api/transfers"
        title="Transferencias USDT"
        fields={[
          { key: "fecha", label: "Fecha", type: "date", required: true },
          { key: "walletOrigen", label: "Wallet origen" },
          { key: "walletDestino", label: "Wallet destino" },
          { key: "clienteId", label: "Cliente" },
          { key: "montoUSDT", label: "Monto USDT", type: "number" },
          { key: "tasa", label: "Tasa", type: "number" },
          { key: "comision", label: "Comisión", type: "number" },
          { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Completada", "Cancelada"] },
        ]}
        columns={[
          { key: "fecha", label: "Fecha", fmt: (v) => String(v).slice(0, 10) },
          { key: "walletOrigen", label: "Origen" },
          { key: "walletDestino", label: "Destino" },
          { key: "montoUSDT", label: "USDT", fmt: (v) => Number(v ?? 0).toLocaleString("es-CO") },
          { key: "estado", label: "Estado" },
        ]}
      />
    </div>
  );
}
