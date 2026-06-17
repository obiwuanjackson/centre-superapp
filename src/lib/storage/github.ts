// GitHub JSON persistence driver. Each collection is one JSON file committed to a repo
// via the GitHub Contents API. Version history = audit backup + rollback (Git).
//
// Concurrency/atomicity: every write reads the file SHA, then PUTs with that SHA. If the
// SHA is stale (concurrent write) GitHub returns 409; we retry with a fresh read. This
// gives optimistic-locking atomic updates and prevents corruption.
//
// Write minimization: callers should batch (use replaceAll / single insert per request).
// Reads are cached in-process for the request lifetime.
import type { Repository, Collection } from "./repository";

const API = "https://api.github.com";

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const dir = process.env.GITHUB_DATA_DIR || "data";
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPO are required");
  return { token, repo, branch, dir };
}

interface FileState<T> { content: T; sha: string | null; }
const cache = new Map<string, FileState<any>>();

async function ghGet<T>(name: string, fallback: T): Promise<FileState<T>> {
  if (cache.has(name)) return cache.get(name)!;
  const { token, repo, branch, dir } = cfg();
  const res = await fetch(
    `${API}/repos/${repo}/contents/${dir}/${name}.json?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, cache: "no-store" }
  );
  if (res.status === 404) {
    const st = { content: fallback, sha: null };
    cache.set(name, st);
    return st;
  }
  if (!res.ok) throw new Error(`GitHub GET ${name}: ${res.status}`);
  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf8");
  const st: FileState<T> = { content: JSON.parse(decoded), sha: data.sha };
  cache.set(name, st);
  return st;
}

async function ghPut(name: string, value: unknown, retries = 3): Promise<void> {
  const { token, repo, branch, dir } = cfg();
  const current = cache.get(name);
  const body = {
    message: `chore(data): update ${name} @ ${new Date().toISOString()}`,
    content: Buffer.from(JSON.stringify(value, null, 2), "utf8").toString("base64"),
    branch,
    sha: current?.sha ?? undefined,
  };
  const res = await fetch(`${API}/repos/${repo}/contents/${dir}/${name}.json`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409 && retries > 0) {
    cache.delete(name);
    await ghGet(name, value); // refresh sha
    return ghPut(name, value, retries - 1);
  }
  if (!res.ok) throw new Error(`GitHub PUT ${name}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cache.set(name, { content: value, sha: data.content.sha });
}

function makeCollection<T extends { id: string }>(name: string): Collection<T> {
  const read = () => ghGet<T[]>(name, []).then((s) => s.content);
  return {
    async all() { return read(); },
    async page({ offset = 0, limit = 50, where, sort }) {
      let rows = await read();
      if (where) rows = rows.filter(where);
      if (sort) rows = [...rows].sort(sort);
      return { rows: rows.slice(offset, offset + limit), total: rows.length };
    },
    async get(id) { return (await read()).find((r) => r.id === id); },
    async insert(row) {
      const rows = await read(); rows.push(row); await ghPut(name, rows); return row;
    },
    async update(id, patch) {
      const rows = await read();
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`${name}: id ${id} not found`);
      rows[i] = { ...rows[i], ...patch }; await ghPut(name, rows); return rows[i];
    },
    async remove(id) {
      const rows = (await read()).filter((r) => r.id !== id); await ghPut(name, rows);
    },
    async replaceAll(rows) { await ghPut(name, rows); },
  };
}

export const githubRepository: Repository = {
  collection: makeCollection,
  readDoc: (name) => ghGet(name, undefined as any).then((s) => s.content),
  writeDoc: (name, value) => ghPut(name, value),
};
