import { crudRoutes } from "@/lib/crud";
import { FILES } from "@/lib/storage";

const r = crudRoutes({ module: FILES.abonos, writeRole: "operador" });
export const GET = r.GET;
export const POST = r.POST;
export const PATCH = r.PATCH;
export const DELETE = r.DELETE;
