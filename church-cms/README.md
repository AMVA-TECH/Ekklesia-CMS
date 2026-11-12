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
pnpm db:seed:dev
pnpm db:seed:auth       # Better Auth passwords for seed users
pnpm check
pnpm dev
```

Neon: use `pnpm db:migrate` with the **unpooled** URL (drizzle-kit Neon driver).

Auth (ADR-0002 Better Auth): set `BETTER_AUTH_SECRET` (≥32 chars). Members: email **or** phone + PIN (`DEV_AUTH_PIN`, default `123456`). Admins: same PIN then OTP (`POST /auth/mfa/send-otp` + `/verify`). Dev headers still work when `ALLOW_DEV_AUTH=1` (non-prod).

## Commands

| Script | Purpose |
|---|---|
| `pnpm check` | typecheck + lint + test + build |
| `pnpm db:migrate:local` | Apply SQL migrations with psql |
| `pnpm db:seed:dev` | Seed CrossLife-dev fake church/admin |
| `pnpm db:seed:auth` | Seed Better Auth credentials for admin/member/finance |
| `pnpm db:smoke` | DB smoke: person → membership → household |
| `pnpm db:smoke:stage3` / `stage4` / `imports` | Later-stage DB smokes |
| `pnpm db:smoke:auth-login` | HTTP login + `/auth/me` (needs `pnpm dev`) |
| `pnpm db:rehearse` | Stage 5: fresh DB migrate + dump/restore |
| `pnpm pilot:ops-check` | Stage 5: env/migrations/RLS/(optional) health |

## Status

Stages **1–4 MVP** done (see `docs/STAGE_GATES.md`). Stage **5** scaffolding: [docs/PILOT_READINESS.md](docs/PILOT_READINESS.md).

Auth: Better Auth sessions + optional `x-dev-*` when `ALLOW_DEV_AUTH=1`.

Platform operator console (ADR-0003): **subdomain entry** — local `http://platform.localhost:3000` (see `NEXT_PUBLIC_ROOT_DOMAIN` / `NEXT_PUBLIC_PLATFORM_SUBDOMAIN`). Overview, security findings, audit explorer, access, growth, fault response, church enter-with-reason. APIs under `/api/v1/platform/*`. Main-app `/platform` redirects to the subdomain.

Integrations: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). Path aliases: [docs/API_PATH_ALIASES.md](docs/API_PATH_ALIASES.md).

Seed IDs (fake / DEC-023):
- church `11111111-1111-1111-1111-111111111111`
- admin `cccccccc-…0001` / `dddddddd-…0001` (`church_administrator`)
- member `cccccccc-…0002` / `dddddddd-…0002` (`member`)
- finance `cccccccc-…0003` / `dddddddd-…0003` (`finance_officer`)
- platform operator `cccccccc-…0004` / `platform@example.test` (`platform_operators`)
