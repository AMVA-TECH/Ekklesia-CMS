# Database migrations

Generated with `pnpm db:generate`. Apply with:

```bash
DATABASE_URL="$DATABASE_URL_UNPOOLED" pnpm db:migrate
```

## Files

| Migration | Purpose |
|---|---|
| `0000_core_stage1_2.sql` | Stage 1–2 core tables (churches, people, households, membership, RBAC, audit, media, idempotency, outbox) |
| `0001_rls_tenant_policies.sql` | Row-level security + FORCE on tenant tables |

## Apply checklist

1. Use the **unpooled** Neon URL (or local Postgres owner role).
2. Review SQL before applying — never edit an already-applied migration.
3. Confirm app role has **no** `BYPASSRLS`.
4. After apply, set `app.church_id` via `set_config(..., true)` inside each transaction.

Stage 3+ draft schemas under `src/modules/{organisation,ministries,events,finance,messaging}` are **not** in these migrations until their stage gate opens.
