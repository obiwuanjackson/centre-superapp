import OperacionesClient from "./OperacionesClient";
import { loadMasters } from "@/lib/load";

export default async function OperacionesPage() {
  const { clientes, pagadores, params } = await loadMasters();
  return <OperacionesClient clientes={clientes} pagadores={pagadores} params={params} />;
}
