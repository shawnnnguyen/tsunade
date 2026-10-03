# Tsunade

Personal finance and wealth management web app: transaction ledger (via Enable Banking or manual CSV
import), automatic categorization, manual and market-based asset valuations, and
net-worth/cash-flow analytics. Delivered as a managed cloud service — no self-hosted option.
See `docs/architecture.md` for the full design and `docs/user-stories.md` for the product scope.

Stack: Node + TypeScript, Express backend, BullMQ worker, React + Vite + Tailwind + TanStack
Query frontend, Drizzle ORM over PostgreSQL, Redis (BullMQ broker + price cache), pnpm
workspaces. Deployed to Azure via Terraform; Docker Compose is for local dev only.

## Repo modules

- `apps/api` — Express backend: routes, controllers, request/response schemas. Implemented so
  far: `/health`, full `/auth/*` (register/login/refresh/logout/me), and full CRUD for
  `accounts`, `categories`, `rules`, `holdings`, `assets` (+ `/assets/:id/value-log`), `tags`, and
  `transactions` (+ `/transactions/:id/tags`). Not yet built: CSV imports, Enable Banking
  webhooks, analytics endpoints — see `PLAN.md` phases 2-6.
- `apps/worker` — BullMQ worker: Enable Banking syncs, market-data polling, categorization backfill. Not
  yet created.
- `apps/web` — React SPA. Not yet created.
- `packages/db` — Drizzle schema, migrations, shared DB client (imported by `api` + `worker`).
  All tables from `docs/architecture.md`'s data model exist: `users`, `refresh_tokens`,
  `accounts`, `categories` (flat, no hierarchy), `rules`, `transactions`, `tags`,
  `transaction_tags`, `holdings`, `valuation_snapshots`, `assets`, `asset_value_logs`.
- `packages/shared` — shared TS types, input-validation helpers (`isRecord`, `isNumericString`,
  `isCurrency`, `isNonEmptyString`, `isWithinNumericBounds`), and adapter interfaces/
  implementations for `MarketDataAdapter`/`ExchangeRateAdapter` (real + fixture-backed) and
  `EnableBankingAdapter` (interface/types only — no implementation yet, deliberately not
  fixture-backed; see `PLAN.md` Phase 2).
- `infra/` — Terraform for the Azure deployment. Not yet created.
- `fixtures/` — synthetic market-data/exchange-rate inputs for adapter stubs and tests.
- `tests/` — cross-module tests.
- `docs/` — `architecture.md`, `user-stories.md`, and `to-be-implemented.md`; read before any
  change that touches the data model, API surface, or module boundaries.

## Commands

- `pnpm install` — install workspace dependencies.
- `pnpm check` — lint + format check + typecheck, all workspaces (what the pre-commit hook runs).
- `pnpm lint` / `pnpm format` / `pnpm format:check` / `pnpm typecheck` — run one of those checks
  alone.
- `pnpm --filter @tsunade/api dev` — run the API with hot reload (`tsx watch`), loading `.env`.
- `pnpm --filter @tsunade/db db:generate` — generate a Drizzle migration from a schema change.
- `pnpm --filter @tsunade/db db:migrate` — apply pending migrations against `DATABASE_URL`.
- No test runner is set up yet (`tests/` is empty, no `test` script) — don't assume `pnpm test`
  exists.

## Architecture notes

- `packages/db`'s `db` client (`src/client.ts`) throws at import time if `DATABASE_URL` isn't set
  — any package importing `@tsunade/db` needs it in the environment, even for a typecheck-only
  task that doesn't touch the database.
- The pnpm workspace only globs `apps/*` and `packages/*` (`pnpm-workspace.yaml`); a new module
  must live under one of those two directories to be picked up.
- Each package's `tsconfig.json` extends the shared `tsconfig.base.json` (strict mode,
  `noUncheckedIndexedAccess`, NodeNext resolution) — don't loosen compiler options per-package.

## GitHub conventions

Use `.github/ISSUE_TEMPLATE/` for issues, `.github/PULL_REQUEST_TEMPLATE.md` for PRs, and
`.github/COMMIT_CONVENTION.md` for commit message format.

## Boundaries to preserve

- Do not change public API routes, request/response schemas, or DB migrations unless the task
  explicitly requires it.
- `apps/web` only calls `apps/api` over HTTP — never direct Postgres/Redis access.
- `apps/api` and `apps/worker` must not import each other's internals; they only communicate
  through `packages/db` (Postgres) and the BullMQ queues in Redis.
- Every resource other than `User` is scoped by `userId` (multi-user, JWT auth) — every
  query/write must filter by the authenticated user; never let one user's data leak into another's
  response.
- External API credentials (Enable Banking, Finnhub, exchangerate.host) are never committed — `.env` only;
  adapters read from environment and fall back to fixtures when unset.
- No self-hosted deployment path. Azure (via `infra/`) is the only supported deployment target;
  Docker Compose exists for local development only, not as a user-facing option.

## Minimal change rule

Make the smallest change that solves the task. No speculative abstractions, fallbacks, refactors,
extra files, or comments unless the task requires them. If a change would exceed a reasonable
file/line threshold for the task, stop and report back before continuing.

## Communication style

Lean plain English. Lead with the answer. Shortest sufficient response. Use bullets only when
they make the content easier to scan.

## Behavioral guidelines

1. **Think Before Coding** — state assumptions, present alternatives instead of picking silently,
   ask when unclear.
2. **Simplicity First** — minimum code, no speculative flexibility, no error handling for
   impossible cases.
3. **Surgical Changes** — touch only what's needed, don't refactor unrelated code, match existing
   style, remove only orphans your change caused.
4. **Goal-Driven Execution** — turn tasks into verifiable success criteria (failing test ->
   passing test) before looping.
5. **Test Assertions** — prefer one full-object `assert.deepStrictEqual`/`toEqual` over
   field-by-field assertions for structured results.
