// Immutable audit trail. Every write records user, ts, module, action, before/after.
// Stored in its own collection (one file), append-only.
import { repo, FILES } from "./storage";
import type { AuditEntry } from "./types";

export async function audit(entry: Omit<AuditEntry, "id" | "ts">): Promise<void> {
  const rec: AuditEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
  };
  await repo().collection<AuditEntry>(FILES.auditoria).insert(rec);
}

export async function auditLog(opts: { offset?: number; limit?: number } = {}) {
  return repo().collection<AuditEntry>(FILES.auditoria).page({
    offset: opts.offset ?? 0,
    limit: opts.limit ?? 100,
    sort: (a, b) => b.ts.localeCompare(a.ts),
  });
}
