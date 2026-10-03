# To be implemented

Tracked gaps from the auth/security review. Not blocking current work — revisit before launch.

## Auth hardening (security)

1. **MFA/2FA.** Password-only auth is the biggest gap relative to normal fintech expectations.
2. **Audit log of auth events.** Logins, failed logins, and the refresh-token-reuse/theft
   response aren't recorded anywhere queryable today — only crashes hit `console.error`. Needs a
   dedicated events table, not just logs.
3. **Per-account rate limiting.** `credentialsRateLimit` in `apps/api/src/auth/router.ts` is
   IP-only (10 req / 5 min). An attacker spread across many IPs can brute-force one account
   without limit. Add a per-account failure counter/lockout alongside the existing IP limit.
4. ~~**Pin JWT verify algorithm.**~~ Done — `verifyAccessToken` in `apps/api/src/auth/tokens.ts`
   now passes `{ algorithms: ['HS256'] }`.
5. **Security response headers.** No `helmet` (or equivalent) in `apps/api/src/index.ts` — no
   `frame-ancestors`/`X-Frame-Options`, no `X-Content-Type-Options`. Login/app pages are iframe-able
   as-is (clickjacking risk).
6. **No instant access-token revocation.** Stateless JWTs mean a disabled/compromised account's
   current access token keeps working for up to 15 min even after the refresh token is revoked.
   Likely an acceptable trade-off given the short TTL — flag it in the incident-response runbook
   rather than architecting around it.
7. **`refresh_tokens` rows are never pruned.** Every login and every refresh inserts a row
   (`apps/api/src/auth/router.ts`); nothing ever deletes expired or revoked ones. Unbounded growth
   per active user. Flagged in `PLAN.md` as needing a periodic sweep in `apps/worker` once that
   package exists — not buildable until then.
8. ~~**`JWT_SECRET` is only checked for presence, not strength.**~~ Done — `apps/api/src/auth/tokens.ts`
   now rejects secrets shorter than 32 chars at the same startup guard.

## Product gaps

9. **Password reset flow.** Only register/login/refresh/logout/me exist.
10. **Email verification on registration.** Any string containing `@` is accepted; no proof of
    ownership before the account is active.
11. **Session/device management.** No way for a user to see active sessions or log out of one
    device/all devices short of the automatic theft-response (which kills everything).

## Refresh-token race condition (see conversation history)

Confirmed live by review (two simultaneous legitimate `/auth/refresh` calls — e.g. two browser
tabs, or a client retry — fully log the user out): the second request sees the first's token as
"already used" and, per the theft-detection design, revokes every session for that user,
including the one the first request just created. Not fixed — both known causes stay open:

- **Client retrying mid-flight:** the planned fix (client dedupes concurrent `/auth/refresh`
  calls so a retry never reaches the server as a second request) can't be built yet — see
  "Frontend" below, blocked on `apps/web` not existing.
- **Server's response lost on the wire:** accepted risk, not fixing. A grace window on the server
  was considered and rejected — it would let a stolen pre-rotation token be replayed within the
  window and read as "probably just a retry," weakening reuse-detection exactly where it matters
  most. The cost of this case is a false "logged out everywhere," which is recoverable; the cost
  of a weakened reuse check is not.

## Frontend

12. **Apply the refresh-dedup fix once `apps/web` exists.** `apps/web` hasn't been created yet, so
    there's nowhere to put the client-side fix (keep a single in-flight `/auth/refresh` promise and
    have every caller await it instead of issuing a new request). Wire this into whatever HTTP
    client wrapper `apps/web` ends up using for calls to `apps/api`.

## Enable Banking

13. **Implement the real `EnableBankingAdapter`.** The fixture implementation
    (`packages/shared/src/adapters/impl/fixtures/enable-banking.fixture.ts` and
    `fixtures/enable-banking/`) was removed deliberately — Enable Banking integration (OAuth/consent
    flow, balance fetch, cursor-paginated transaction sync) is a big enough feature that it should
    be built against the real API from the start, not validated against a stub that doesn't
    reflect real provider behavior. The entity types and `EnableBankingAdapter` interface stay in
    `packages/shared/src/adapters/adapter-interfaces/enable-banking-adapter.ts` as the contract to
    implement against. This also unblocks `apps/worker`, which doesn't exist yet and will be the
    adapter's consumer.

## Infra / operational hardening

14. **`trust proxy` topology is unconfirmed.** `apps/api/src/index.ts` currently trusts no proxy
    hop (`trust proxy` unset/`false`), closing a header-spoofing bypass of every rate limiter that
    existed when it was set to `1` with no real proxy in front. Once `infra/` exists and defines
    the actual number of hops between the client and the app (Azure's ingress), this needs to be
    set to match — otherwise `req.ip` just becomes the load balancer's address for everyone.
15. **Postgres pool has no timeouts.** `packages/db/src/client.ts`'s `pg.Pool` sets no `max`,
    `connectionTimeoutMillis`, or `statement_timeout` — a stuck query holds a connection
    indefinitely, and new requests queue forever instead of failing fast.

## Error handling & validation gaps

16. ~~**Insert-side foreign-key violations return `409` instead of `400`.**~~ Done —
    `apps/api/src/lib/error-handler.ts`'s `23503` branch now returns `400` unless
    `pgError.detail` shows a blocked delete, in which case it stays `409`.
17. ~~**`isPgError` is too broad.**~~ Done — `apps/api/src/lib/error-handler.ts` now also requires
    `.severity` (present on every real `pg` error, absent on generic Node errors).
18. ~~**Control-character filter misses invisible/direction-override Unicode.**~~ Done —
    `packages/shared/src/is-non-empty-string.ts` now matches `/[\p{Cc}\p{Cf}]/u`, rejecting any
    Unicode control (`Cc`) or format (`Cf`) character, including C1 controls, zero-width
    characters, and bidi-override characters.
19. ~~**A future-dated asset value-log entry permanently "sticks."**~~ Done —
    `apps/api/src/assets/router.ts`'s `parseNewAssetValueLog` now rejects `asOf` dates after now.

## Lower-priority / nits

20. ~~**No index on `refresh_tokens.userId`.**~~ Done — added `refresh_tokens_user_id_idx`
    (`packages/db/migrations/0007_smiling_famine.sql`).
21. ~~**Negative `quantity`/`costBasis` accepted on holdings.**~~ Done —
    `apps/api/src/holdings/router.ts` now rejects a leading `-` on create and patch. (Negative
    `currentValue` on assets stays intentional, for liabilities — holdings has no equivalent
    concept.)
22. ~~**Most list endpoints are unpaginated.**~~ Done — `accounts`, `categories`, `rules`,
    `holdings`, `assets`, `tags`, and `GET /assets/:id/value-log` all now take `limit`/`offset`
    (default 50, max 200), same as `GET /transactions`. Shared parsing lives in
    `apps/api/src/lib/pagination.ts`.
23. **`/auth/logout` is covered by the general flood-guard limiter.** A user who's been throttled
    by the general 50-req/30s limit can't even log out until it resets.
24. ~~**`GET /transactions/:id/tags` doesn't filter the joined `tags` row by `userId`.**~~ Done —
    the handler now filters the join by `tags.userId` too.
25. **`rules.pattern` has no content validation.** Fine today since nothing executes it yet; the
    planned matching engine (`packages/categorization`, per `PLAN.md` Phase 3) only does
    case-insensitive substring/equality checks, not regex, so there's no injection/ReDoS angle —
    just no validation on what gets stored.
26. ~~**No unique index on `tags(userId, name)`.**~~ Done — added `tags_user_id_name_idx`
    (`packages/db/migrations/0007_smiling_famine.sql`).

## Follow-up review (2026-10-03)

Fresh review of the current codebase (multi-tenant isolation confirmed clean — every query/write
is `userId`-scoped or gated by a prior `findOwned` check). New issues found, not covered above:

27. **Postgres pool has no `'error'` listener.** `packages/db/src/client.ts`'s `pg.Pool` doesn't
    listen for `error` — pg-pool emits it when an idle client's connection drops (e.g. a
    provider-side failover), and an unhandled emission crashes the process. Distinct from #15
    (pool timeouts).
28. **No graceful shutdown or process-level crash handlers.** `apps/api/src/index.ts` has no
    `SIGTERM` handler to close the HTTP server and the pg pool, and no
    `unhandledRejection`/`uncaughtException` handlers. On Azure Container Apps, every
    deploy/scale-in SIGTERMs the process mid-request with no clean shutdown or crash log.
29. **Rate limiting isn't distributed.** `credentialsRateLimit` and the general limiter
    (`apps/api/src/index.ts`, `apps/api/src/auth/router.ts`) use `express-rate-limit`'s default
    in-memory store. With multiple API replicas the effective limit multiplies by replica count
    and resets on every deploy, despite Redis already being available as a shared store.
30. **`bcryptjs` blocks the event loop.** `apps/api/src/auth/passwords.ts` uses `bcryptjs` (pure
    JS) at cost 12 — measured ~200ms per hash, and the "async" API still blocks the loop almost
    entirely (no thread-pool offload). A handful of concurrent logins stalls all other requests,
    including `/health`. Swap for native `bcrypt` or `argon2`.
31. **An asset's initial `currentValue` is never recorded as a value-log entry.**
    `apps/api/src/assets/router.ts`'s `POST /assets` sets `currentValue` without inserting a
    corresponding `asset_value_logs` row. A later backdated `POST /assets/:id/value-log` becomes
    the only (and thus "latest") log and silently overwrites the current value with old data, with
    no record the original value ever existed.
32. **`GET /transactions` filters skip shared validation and fail open on array params.**
    `apps/api/src/transactions/router.ts` is the only router not using
    `isNumericString`/`isWithinNumericBounds` for `dateFrom`/`dateTo`/`minAmount`/`maxAmount`,
    relying on Postgres to reject bad input via `22P02`/`22007`. Worse: a query param sent as an
    array (e.g. `accountId[]=x`) fails the `typeof === 'string'` check and the filter is silently
    dropped — the caller gets unfiltered data back believing it was filtered, not an error.
33. **FK child columns beyond `userId` are unindexed.** `transactions.accountId`/`categoryId`,
    `holdings.accountId`, `rules.categoryId`, `transaction_tags.tagId`,
    `valuation_snapshots.holdingId` have no index, so deletes that trigger cascade/restrict FK
    checks (e.g. `DELETE /tags/:id`, `DELETE /accounts/:id`) seq-scan the referencing table at
    scale. Broader than the already-fixed `refresh_tokens.userId` index (#20).
34. **No TLS certificate verification on the Postgres connection.**
    `packages/db/src/client.ts` passes no `ssl` option; a connection string with `sslmode=require`
    (as Azure needs) still disables certificate verification by default, so an in-path attacker
    between app and DB goes undetected. Needs `sslmode=verify-full` with the Azure CA or an
    explicit `ssl: { rejectUnauthorized: true, ca }`.

### Nits

35. `apps/api/src/lib/pagination.ts` clamps `limit=0`/negative to `0` (returns empty instead of
    defaulting) and doesn't cap `offset` (a huge value fails as a generic 400 instead of a clean
    one).
36. `apps/api/src/lib/find-owned.ts`'s `idColumn`/`userIdColumn` params are typed `AnyColumn`, not
    generic over the target table, so a future call site could pass the wrong table's columns and
    still type-check. All current call sites are correct.
37. No unique index on `categories(userId, name)` (tags got one — #26 — categories didn't), so
    duplicate category names are possible.
38. `eslint.config.mjs`'s new `no-misused-promises` / `checksVoidReturn: { arguments: false }`
    loosening is global; scoping it to `apps/api/src/**` would avoid silencing the same check in
    `apps/worker` once it exists.
39. `PORT=abc` in env silently binds `app.listen(NaN)` to a random port instead of failing at
    startup.
40. `apps/api/src/lib/error-handler.ts`: the `22008` comment names the wrong Postgres error, and
    `57014` (statement timeout) / `40001`/`40P01` (serialization/deadlock, reachable from the
    value-log `FOR UPDATE` transaction) fall through to a bare 500 instead of a more honest
    503/409.
41. `packages/shared/src/adapters/impl/market-data.finnhub.ts` fans out two uncapped concurrent
    requests per holding with no backoff for Finnhub's rate limit, and leaks the
    `profileResponse` body on the `quoteResponse.ok === false` error path. Not live yet
    (pre-`apps/worker`).
42. `apps/api/src/auth/cookies.ts`'s `sameSite: 'lax'` works for `localhost` and
    same-registrable-domain prod setups, but would silently break cross-origin auth if `api`/`web`
    end up on sibling Azure-managed hostnames that count as separate sites — revisit alongside #14
    once `infra/` picks hostnames.
43. No `PATCH`/`DELETE` on `/assets/:id/value-log` — a mistyped historical value can only be
    masked by a newer entry, never corrected or removed.
44. `apps/api/src/transactions/router.ts`'s tag-attach handler binds `transactionTag` from a
    `.returning()` that's never used (the response returns `tag` instead).
