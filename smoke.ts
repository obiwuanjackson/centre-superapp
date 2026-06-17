// Quick end-to-end engine check against the seed data in ./data.
// Run: npx tsx smoke.ts
import { summarize } from "./src/lib/engine";
import fs from "node:fs";
const j = (n:string)=>JSON.parse(fs.readFileSync(`./data/${n}.json`,"utf8"));
const input = {
  operaciones: j("operaciones"), caja: j("caja"), prestamos: j("prestamos"),
  abonos: j("abonos_prestamos"), inversiones: j("inversiones"), params: j("parametros"),
};
const s = summarize(input);
console.log("days:", s.series.length);
console.log("ops:", input.operaciones.length);
console.log("realizedProfitUSDT:", s.realizedProfitUSDT.toFixed(2));
console.log("inventarioUSDT:", s.inventarioUSDT.toFixed(2));
console.log("costRate:", s.costRate.toFixed(2));
console.log("totalCapital(COP):", Math.round(s.totalCapital*1000).toLocaleString());
