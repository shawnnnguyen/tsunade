# Commit message convention

```
<type>(<scope>): <summary>

<body, optional>
```

- **type** — one of `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`.
- **scope** — the module touched: `api`, `worker`, `web`, `db`, `shared`, `docs`, `infra`. Omit
  for repo-wide changes.
- **summary** — imperative mood, lowercase, no trailing period, ≤72 characters.
- **body** — optional, explains _why_, not what the diff already shows. Wrap at 72 characters.

Examples:

```
feat(api): add /imports/csv endpoint
fix(worker): retry plaid.sync on rate-limit errors
docs: update architecture.md with asset tracking flow
```

One logical change per commit.
