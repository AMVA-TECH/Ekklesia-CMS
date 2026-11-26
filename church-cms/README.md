# Church CMS (app)

Runnable **Ekklesia** application (Next.js + TypeScript + Drizzle modular monolith).

Product overview: [../README.md](../README.md). Architecture and agent rules: [`../docs/`](../docs/). Stage gates: [docs/STAGE_GATES.md](docs/STAGE_GATES.md).

**API docs (local):** [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs) — Swagger Try it out. Regenerate: `pnpm openapi:generate`. See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Setup

```bash
pnpm install
cp .env.example .env.local
# Local Postgres example:
# DATABASE_URL=postgresql://postgres@127.0.0.1:5432/church_cms
# DATABASE_URL_UNPOOLED=postgresql://postgres@127.0.0.1:5432/church_cms
# BETTER_AUTH_SECRET=$(openssl rand -base64 32)
pnpm db:migrate:local   # local Postgres via psql
pnpm db:bootstrap:platform   # permissions catalogue + one platform operator (no church)
pnpm check
pnpm dev
```

Neon: use `pnpm db:migrate` with the **unpooled** URL (drizzle-kit Neon driver).

Auth (ADR-0002 Better Auth): set `BETTER_AUTH_SECRET` (≥32 chars). Members: email **or** phone + PIN (`DEV_AUTH_PIN`, default `123456`). Admins: same PIN then OTP (`POST /auth/mfa/send-otp` + `/verify`). Dev headers still work when `ALLOW_DEV_AUTH=1` (non-prod).

Clean start (wipe all rows, keep schema/migrations, re-bootstrap platform only):

```bash
CONFIRM=WIPE pnpm db:wipe-data
pnpm db:bootstrap:platform
# or: pnpm db:reset:platform
```

Platform login after bootstrap: `platform@example.test` / `DEV_AUTH_PIN` (default `123456`). Create churches from the platform console — do not rely on CrossLife seed unless you opt into smoke fixtures.

## Commands

| Script | Purpose |
|---|---|
| `pnpm check` | typecheck + lint + test + build |
| `pnpm db:migrate:local` | Apply SQL migrations with psql |
| `pnpm db:bootstrap:platform` | Permissions catalogue + one platform operator (no church) |
| `pnpm db:wipe-data` | Truncate all public data (`CONFIRM=WIPE`; local host only) |
| `pnpm db:reset:platform` | Wipe + bootstrap platform |
| `pnpm db:seed:dev` | Optional: CrossLife-dev fake church/admin for smokes |
| `pnpm db:seed:auth` | Optional: Better Auth credentials for seed fixtures |
| `pnpm db:smoke` | DB smoke: person → membership → household |
| `pnpm db:smoke:stage3` / `stage4` / `imports` | Later-stage DB smokes |
| `pnpm db:smoke:auth-login` | HTTP login + `/auth/me` (needs `pnpm dev`) |
| `pnpm db:rehearse` | Stage 5: fresh DB migrate + dump/restore |
| `pnpm pilot:ops-check` | Stage 5: env/migrations/RLS/(optional) health |

## Status

Stages **1–4 MVP** done (see `docs/STAGE_GATES.md`). Stage **5** scaffolding: [docs/PILOT_READINESS.md](docs/PILOT_READINESS.md).

Auth: Better Auth sessions + optional `x-dev-*` when `ALLOW_DEV_AUTH=1`.

Platform operator console (ADR-0003): path-based on the main app — local `http://localhost:3000/platform`. Overview, security findings, audit explorer, access, growth, fault response, church enter-with-reason. APIs under `/api/v1/platform/*`. Legacy `platform.*` subdomains redirect to `/platform`.

Integrations: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). Path aliases: [docs/API_PATH_ALIASES.md](docs/API_PATH_ALIASES.md).

Default platform bootstrap (after `db:bootstrap:platform`):
- one platform operator identified by email (`PLATFORM_BOOTSTRAP_EMAIL`, default `platform@example.test`) — ids are generated, not shown in the UI

Optional smoke fixture IDs (`pnpm db:seed:dev` + `db:seed:auth`, fake / DEC-023):
- church `11111111-1111-1111-1111-111111111111`
- admin `cccccccc-…0001` / `dddddddd-…0001` (`church_administrator`)
- member `cccccccc-…0002` / `dddddddd-…0002` (`member`)
- finance `cccccccc-…0003` / `dddddddd-…0003` (`finance_officer`)
