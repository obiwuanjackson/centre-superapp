// Storage abstraction. Business logic depends ONLY on this interface, never on
// GitHub/SQL specifics. Swap the driver (local | github | future SQL) without touching
// engine or modules. This satisfies the "repository/service abstraction from day one"
// and "future-proofing migration" requirements.

export interface Collection<T> {
  all(): Promise<T[]>;
  /** server-side pagination + optional predicate filter */
  page(opts: {
    offset?: number;
    limit?: number;
    where?: (row: T) => boolean;
    sort?: (a: T, b: T) => number;
  }): Promise<{ rows: T[]; total: number }>;
  get(id: string): Promise<T | undefined>;
  insert(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  /** bulk replace — used by importers/migrations, batched into a single write */
  replaceAll(rows: T[]): Promise<void>;
}

export interface Repository {
  collection<T extends { id: string }>(name: string): Collection<T>;
  /** read a raw JSON document (non-collection, e.g. parametros) */
  readDoc<T>(name: string): Promise<T | undefined>;
  writeDoc<T>(name: string, value: T): Promise<void>;
}

// Names of the JSON files / collections (one file per collection).
export const FILES = {
  clientes: "clientes",
  pagadores: "pagadores",
  operaciones: "operaciones",
  prestamos: "prestamos",
  abonos: "abonos_prestamos",
  caja: "caja",
  wallets: "wallets",
  transfers: "transfers",
  inversiones: "inversiones",
  auditoria: "auditoria",
  parametros: "parametros",
} as const;
