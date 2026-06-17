// Local filesystem driver for development. Writes JSON files under ./data.
// Mirrors the GitHub driver's behavior so dev == prod semantics.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Repository, Collection } from "./repository";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJSON<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
async function writeJSON(name: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(value, null, 2),
    "utf8"
  );
}

function makeCollection<T extends { id: string }>(name: string): Collection<T> {
  return {
    async all() {
      return readJSON<T[]>(name, []);
    },
    async page({ offset = 0, limit = 50, where, sort }) {
      let rows = await readJSON<T[]>(name, []);
      if (where) rows = rows.filter(where);
      if (sort) rows = [...rows].sort(sort);
      const total = rows.length;
      return { rows: rows.slice(offset, offset + limit), total };
    },
    async get(id) {
      return (await readJSON<T[]>(name, [])).find((r) => r.id === id);
    },
    async insert(row) {
      const rows = await readJSON<T[]>(name, []);
      rows.push(row);
      await writeJSON(name, rows);
      return row;
    },
    async update(id, patch) {
      const rows = await readJSON<T[]>(name, []);
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`${name}: id ${id} not found`);
      rows[i] = { ...rows[i], ...patch };
      await writeJSON(name, rows);
      return rows[i];
    },
    async remove(id) {
      const rows = await readJSON<T[]>(name, []);
      await writeJSON(name, rows.filter((r) => r.id !== id));
    },
    async replaceAll(rows) {
      await writeJSON(name, rows);
    },
  };
}

export const localRepository: Repository = {
  collection: makeCollection,
  readDoc: (name) => readJSON(name, undefined as any),
  writeDoc: (name, value) => writeJSON(name, value),
};
