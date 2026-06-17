// Pushes the local ./data/*.json seed files into the configured storage backend.
// Useful to initialize a fresh GitHub data repo:
//   STORAGE_DRIVER=github GITHUB_TOKEN=... GITHUB_REPO=user/usdt-data npx tsx scripts/seed-from-data.ts
import fs from "node:fs";
import path from "node:path";
import { repo, FILES } from "../src/lib/storage";

async function main() {
  const dir = path.join(process.cwd(), "data");
  const r = repo();
  for (const name of Object.values(FILES)) {
    const file = path.join(dir, `${name}.json`);
    if (!fs.existsSync(file)) continue;
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (name === FILES.parametros) await r.writeDoc(name, value);
    else await r.collection(name).replaceAll(value);
    console.log(`seeded ${name} (${Array.isArray(value) ? value.length + " rows" : "doc"})`);
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
