# Church CMS (app)

Next.js + TypeScript + Drizzle modular monolith. Product docs: `../docs`. Stage gates: [docs/STAGE_GATES.md](docs/STAGE_GATES.md).

## Setup

```bash
pnpm install
cp .env.example .env.local   # set DATABASE_URL (pooled) + DATABASE_URL_UNPOOLED
pnpm check                   # typecheck + lint + test + build
pnpm dev
```

## Commands

| Script | Purpose |
|---|---|
| `pnpm check` | typecheck + lint + test + build |
| `pnpm test` | Node test runner (unit) |
| `pnpm db:generate` | Create migration from core schema |
| `pnpm db:migrate` | Apply migrations (use unpooled URL) |

## Stage 1–2 (in migrations)

Core schema barrel: `src/platform/db/schema/index.ts`

| Area | Status |
|---|---|
| Platform (errors, Ctx, HTTP, audit, RLS helpers) | Done |
| Migrations `0000` + `0001` RLS | Generated; apply when DB available |
| People / households / membership APIs | Done (`/api/v1/...`) |
| Dev session headers (pre ADR-0002) | `x-dev-user-id`, `x-dev-church-id`, `x-dev-permissions` |

## Stage 3–4 (frozen)

Draft Drizzle files may exist under `src/modules/{organisation,ministries,events,finance,messaging}` but are **not** exported for migration and have **no APIs** until the prior stage gate passes.

## API (thin handlers → services)

- `GET /api/v1/health` (public)
- `GET|POST /api/v1/people`, `GET|PATCH /api/v1/people/{id}`
- `POST /api/v1/households`, `GET /api/v1/households/{id}`, `POST .../members`
- `GET /api/v1/memberships/me`, `PATCH /api/v1/memberships/{id}`
