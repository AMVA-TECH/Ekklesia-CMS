# Church CMS (app)

Next.js + TypeScript + Drizzle modular monolith. Product docs: `../docs`. Stage gates: [docs/STAGE_GATES.md](docs/STAGE_GATES.md).

## Setup

```bash
pnpm install
cp .env.example .env.local
# Local Postgres example:
# DATABASE_URL=postgresql://postgres@127.0.0.1:5432/church_cms
# DATABASE_URL_UNPOOLED=postgresql://postgres@127.0.0.1:5432/church_cms
pnpm db:migrate:local   # local Postgres via psql
pnpm db:seed:dev
pnpm check
pnpm dev
```

Neon: use `pnpm db:migrate` with the **unpooled** URL (drizzle-kit Neon driver).

## Commands

| Script | Purpose |
|---|---|
| `pnpm check` | typecheck + lint + test + build |
| `pnpm db:migrate:local` | Apply SQL migrations with psql |
| `pnpm db:seed:dev` | Seed CrossLife-dev fake church/admin |
| `pnpm db:smoke` | DB smoke: person → membership → household |

## Stage 1–2 status

- Core migrations applied on local `church_cms` DB (21 tables + RLS)
- Dev seed + `db:smoke` verified against Postgres
- APIs: `/api/v1/health`, people, households, memberships
- Dev auth headers (until ADR-0002): `x-dev-user-id`, `x-dev-church-id`, `x-dev-permissions`

Seed IDs (fake):
- church `11111111-1111-1111-1111-111111111111`
- user `cccccccc-0001-0001-0001-000000000001`

## Stage 3–4

Frozen — see `docs/STAGE_GATES.md`.
