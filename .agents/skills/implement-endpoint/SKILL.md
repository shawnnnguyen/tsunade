---
name: implement-endpoint
description: Use this skill when implementing a new REST resource endpoint in apps/api (accounts, transactions, categories, rules, holdings, assets, imports, analytics, ...) or adding routes to an existing resource. Applies this project's single-purpose-module rule and the router pattern already used in apps/api/src/auth/. Do not use it for auth/token changes, worker/BullMQ jobs, or apps/web frontend work.
---

# Implement an API Endpoint

Add the smallest REST resource surface that satisfies the request, matching the shape of
`apps/api/src/auth/`. That directory is the reference implementation for this repo — read it
before writing anything.

## Ground yourself first

1. Read `docs/architecture.md`'s API design table to confirm which endpoints the resource is
   supposed to expose and their grouping (versionless, resource-scoped paths like `/accounts`).
2. Read `packages/db/src/schema/<resource>.ts` for the actual columns — don't guess fields.
3. Read `packages/shared/src/types/<resource>.ts` — request/response shapes must match these
   types, not raw Drizzle rows. If the type doesn't exist yet, that's a sign the resource isn't
   ready for an endpoint; stop and say so instead of inventing one.
4. Read `apps/api/src/auth/router.ts`, `middleware.ts`, and `apps/api/src/index.ts` for the exact
   patterns below in context.
5. When you're ready to write `router.ts` itself, read
   [references/router-template.md](references/router-template.md) for a full worked example (list,
   create, get, patch, delete — all scoped, all idempotent, all in the exact code shape this repo
   uses). Copy the pattern, not the field names.
6. Only build the operations the task actually asked for (e.g. "list and create" doesn't mean
   also build `PATCH`/`DELETE`). Follow the repo's minimal-change rule — no speculative CRUD.

## One module, one purpose

Every file in `apps/api/src/auth/` does exactly one thing: `router.ts` wires routes and holds
handler logic, `middleware.ts` only gates requests, `tokens.ts` only signs/verifies, `passwords.ts`
only hashes/verifies, `cookies.ts` only reads/writes cookies. Follow the same discipline for a new
resource:

- One resource per router file: `apps/api/src/<resource>/router.ts`. Never combine two resources
  (e.g. accounts and holdings) into one router just because they're related in the data model.
- Keep handler logic inline in `router.ts`, the way `authRouter` does — don't invent a separate
  `controller.ts`/`service.ts` layer unless the logic genuinely doesn't belong to routing (the way
  token signing doesn't belong in the auth router). Adding a layer "for structure" when there's
  nothing resource-specific to separate out is exactly the kind of speculative abstraction the
  project's minimal-change rule rejects.
- If a piece of logic is reused across resources (e.g. a shared pagination helper), it earns its
  own single-purpose file once two resources actually need it — not before.

## Auth scoping

Every resource other than `User` must be scoped to the authenticated user. Two rules, both
non-negotiable per `CLAUDE.md`:

- Gate the whole router at once: `router.use(requireAuth)` at the top of the resource's
  `router.ts`, rather than repeating `requireAuth` per route. (`authRouter` applies it per-route
  only because `/register`/`/login` must stay public — a resource router has no public routes, so
  gate it once.)
- Every Drizzle query and write filters by `req.userId`, e.g.
  `eq(accounts.userId, req.userId)` combined with the row's own id. Never fetch by id alone.
- If a row exists but belongs to a different user, respond `404`, not `403` — do not reveal that
  the row exists at all.

## Request/response shape

- Validate bodies the way `parseCredentials` does in `auth/router.ts`: a small `isRecord` +
  `typeof` narrowing function returning `null` on anything invalid, no new validation library.
- On invalid input, respond `400` with `{ error: string }` — match the exact error shape used
  throughout `auth/router.ts`. Every route in this API returns errors the same way; don't
  introduce a different one.
- Shape success responses using the corresponding `packages/shared` type. If a field exists in the
  DB row but not in the shared type, drop it from the response rather than widening the shared
  type speculatively.

## Idempotency

- `POST /<resource>` creates.
- `GET`, `PATCH`/`PUT`, `DELETE` on `/<resource>/:id` must be safe to retry: `PATCH` applies the
  same partial update if replayed, `DELETE` on an already-deleted (or not-yours) id returns `404`
  rather than erroring.

## Wire it up

Add the router to `apps/api/src/index.ts` next to the existing mount, matching the path from
`docs/architecture.md`'s API table:

```ts
import { <resource>Router } from './<resource>/router.js';
...
app.use('/<resource>', <resource>Router);
```

## Before reporting done

Run `pnpm check` (lint + format + typecheck across workspaces — the pre-commit hook runs this).
Fix anything it flags rather than working around it. Report which routes you added, which you
deliberately left out and why, and the file(s) touched.
