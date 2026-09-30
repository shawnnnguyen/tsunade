# Worked example: a scoped resource router

Read this when you're about to write the actual `router.ts` for a new resource and want the exact
shape, not just the rules. It's `accounts` worked end to end — every other resource
(`transactions`, `categories`, `rules`, `holdings`, `assets`) follows the same shape with different
fields. Don't copy field names from this file; copy the _pattern_, and read the real schema/shared
type for the resource you're building (see `SKILL.md` step 2-3).

## Full example — `apps/api/src/accounts/router.ts`

```ts
import { accounts, db } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';

export const accountsRouter = Router();

// Every route on this router needs a userId — gate once here, not per route.
// (Compare apps/api/src/auth/router.ts, which applies requireAuth per-route
// because /register and /login must stay public. A resource router has no
// public routes, so there's no reason to repeat it.)
accountsRouter.use(requireAuth);

interface NewAccount {
  name: string;
  type: string;
  source: 'enable_banking' | 'manual';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Same shape as parseCredentials in auth/router.ts: narrow-and-return-null,
// no validation library. Only check what the DB/shared type actually require.
const parseNewAccount = (body: unknown): NewAccount | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name, type, source } = body;
  if (typeof name !== 'string' || typeof type !== 'string') {
    return null;
  }
  if (source !== 'enable_banking' && source !== 'manual') {
    return null;
  }
  return { name, type, source };
};

accountsRouter.get('/', async (req, res) => {
  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, req.userId),
  });
  res.json(rows);
});

accountsRouter.post('/', async (req, res) => {
  const input = parseNewAccount(req.body);
  if (!input) {
    res.status(400).json({ error: 'name, type, and source are required' });
    return;
  }

  const [account] = await db
    .insert(accounts)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!account) {
    throw new Error('failed to create account');
  }
  res.status(201).json(account);
});

accountsRouter.get('/:id', async (req, res) => {
  const account = await db.query.accounts.findFirst({
    // Scope by userId in the same where clause, not as a check afterward —
    // an id that exists but belongs to another user must look identical to
    // an id that doesn't exist at all.
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!account) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  res.json(account);
});

accountsRouter.patch('/:id', async (req, res) => {
  // Reuse the same scoped lookup as GET /:id before writing anything, so a
  // PATCH to someone else's id 404s instead of silently no-op updating 0 rows.
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'account not found' });
    return;
  }

  // Only accept fields that make sense to change; don't let the body
  // overwrite userId/id/createdAt. Partial + safe to replay = idempotent.
  const patch: Partial<NewAccount> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.type === 'string') patch.type = req.body.type;
  }

  const [account] = await db
    .update(accounts)
    .set(patch)
    .where(eq(accounts.id, existing.id))
    .returning();
  res.json(account);
});

accountsRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!existing) {
    // Already gone (or never yours) — deleting again is a no-op success,
    // not an error. That's what makes DELETE idempotent.
    res.status(404).json({ error: 'account not found' });
    return;
  }
  await db.delete(accounts).where(eq(accounts.id, existing.id));
  res.status(204).end();
});
```

## Wiring — `apps/api/src/index.ts`

```ts
import { accountsRouter } from './accounts/router.js';
...
app.use('/accounts', accountsRouter);
```

## What changes per resource, what doesn't

| Stays the same across every resource                                                                 | Changes per resource                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `router.use(requireAuth)` once, at the top                                                           | The fields in the parse function and DB values                                             |
| `{ error: string }` shape on every 4xx                                                               | Which operations exist at all (don't build all 5 if the task only asked for list + create) |
| Scoped `where: and(eq(<table>.id, id), eq(<table>.userId, req.userId))` on every id-based read/write | The table/columns imported from `@tsunade/db`                                              |
| 404 (never 403) for "not yours"                                                                      | Whether a field is user-writable on `PATCH`                                                |

If a resource needs something this template doesn't show (e.g. a nested route like
`/assets/:id/value-log`, or a list endpoint with query-param filters), extend the pattern rather
than reaching for a new one — the scoping and error-shape rules still apply.
