# Maestro Operaciones USDT

Web app that replicates the `Maestro operaciones USDT.xlsx` trading workbook: USD/USDT
operations, perpetual inventory (weighted-average cost), profitability, cash (Caja),
loans (Préstamos), wallets, dashboard, reports and audit trail.

- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · SheetJS · jsPDF — all free / open-source.
- **Persistence:** JSON files. `local` driver (filesystem) for dev, `github` driver (Contents API) for prod. No paid DB.
- **Calculations:** ported 1:1 from the workbook. See [`FORMULAS_SPEC.md`](./FORMULAS_SPEC.md). Validated by `npm test` against real Excel values.

## Architecture

```
src/lib/storage/   repository abstraction (local | github | future SQL) — swap driver, business logic untouched
src/lib/engine/    operations.ts (per-row formulas) · inventory.ts (daily WAC engine) · balances.ts
src/lib/services.ts commission freezing · client-id cascade rename · audited writes
src/lib/auth.ts    signed-cookie auth + roles (admin | operador)
src/app/api/...    server-side, paginated, audited endpoints
src/app/...        dashboard + module pages
data/*.json        seed + local store (one file per collection)
```

The inventory method is **daily Weighted-Average Cost with carry-forward** (discovered
from the workbook, not assumed). Profit per operation is the commission spread on USDT
volume, not sale-minus-purchase. Historical commissions are frozen per record and never
recalculated.

## Run locally

```bash
npm install
cp .env.example .env      # STORAGE_DRIVER=local is fine for dev
npm test                  # validates the engine vs Excel fixtures
npm run dev               # http://localhost:3000  (login: admin / admin by default)
npx tsx smoke.ts          # end-to-end engine sanity check on seed data
```

Seed data (clients, payers, parameters, sample operations) lives in `data/` and loads
automatically with the local driver.

## Deploy — GitHub + Vercel (free tier), step by step

You will create three things: a **GitHub repo**, a **GitHub token**, and a **Vercel project**.

### 1. Push the code to GitHub
```bash
cd usdt-app
git init && git add . && git commit -m "init usdt ops app"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/<you>/usdt-ops.git
git push -u origin main
```

### 2. Create the data repository (persistence layer)
Create a second **private** repo, e.g. `usdt-data`. The app commits the JSON files here,
so Git history becomes your audit backup / rollback. (You may reuse the app repo, but a
separate data repo keeps code and data history clean.)
Upload the contents of this project's `data/` folder into a `data/` folder in that repo
(or run the seed script in step 5).

### 3. Create a GitHub token
GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate:
- Repository access: only `usdt-data`.
- Permissions: **Contents → Read and write**.
Copy the token (starts with `github_pat_...`).

### 4. Create the Vercel project
1. vercel.com → **Add New → Project** → import the `usdt-ops` GitHub repo.
2. Framework preset: **Next.js** (auto). Build/Output defaults are correct.
3. **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `STORAGE_DRIVER` | `github` |
   | `GITHUB_TOKEN` | your fine-grained PAT |
   | `GITHUB_REPO` | `<you>/usdt-data` |
   | `GITHUB_BRANCH` | `main` |
   | `GITHUB_DATA_DIR` | `data` |
   | `APP_USERS` | `admin:STRONGPASS:admin,operador:OTHERPASS:operador` |
   | `AUTH_SECRET` | a long random string |

4. **Deploy.** Open the URL, log in with an `APP_USERS` credential.

### 5. (Optional) Seed the data repo from this project
```bash
STORAGE_DRIVER=github GITHUB_TOKEN=... GITHUB_REPO=<you>/usdt-data \
  npx tsx scripts/seed-from-data.ts
```

## Performance & scale notes
- All list endpoints are **server-side paginated** (`?offset=&limit=&q=`); the browser
  never loads full datasets.
- GitHub writes use optimistic locking (read SHA → PUT, retry on 409) for atomic,
  corruption-safe updates; reads are request-cached. Batch with `replaceAll` for imports.
- Daily engine output should be cached as a materialized summary for very large
  histories (30k+ ops); the `/api/series` route is the integration point.

## Migrating off GitHub later
Implement a new `Repository` in `src/lib/storage/` (e.g. `postgres.ts`) and register it in
`storage/index.ts`. No engine, service, API or UI code changes — the abstraction was built
in from day one.

## Security
- Auth gate (middleware + signed cookie). Roles: `admin` (master data, wallets, loans,
  delete, audit) and `operador` (operations, cash, transfers).
- Every write is recorded immutably in the `auditoria` collection
  (user · timestamp · module · action · before · after).
