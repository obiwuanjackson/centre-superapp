import type { Repository } from "./repository";
import { localRepository } from "./local";
import { githubRepository } from "./github";

let _repo: Repository | null = null;

/** Factory — selects the driver from STORAGE_DRIVER. Add a SQL driver here later
 * without changing any business-logic module. */
export function repo(): Repository {
  if (_repo) return _repo;
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  _repo = driver === "github" ? githubRepository : localRepository;
  return _repo;
}

export * from "./repository";
