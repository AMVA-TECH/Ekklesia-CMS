# 02 — Technology Stack

**Status:** Accepted for pilot, with open decisions marked **OPEN**. **Read with:** `01-system-architecture.md`, `09-adr-0001-initial-architecture.md`.

Rule: **pin exact versions** (lockfile committed). Upgrading a dependency is its own commit (`build(deps): upgrade <pkg> to <version>`), never mixed with feature work. "Latest stable at setup time" is the starting point; record chosen versions in `package.json`.

## 1. Stack at a glance

| Layer | Choice | Status | Notes |
| --- | --- | --- | --- |
| Language | TypeScript (strict) | Decided | Same language front and back. |
| Runtime | Node.js LTS (pinned in `.nvmrc` + `engines`) | Decided | Use the Node.js runtime for API routes, not Edge, unless a route is proven to need Edge. |
| Framework | Next.js (App Router) | Decided | Newer versions call "middleware" **Proxy** (`proxy.ts`). Never a security boundary. |
| UI | React, Tailwind CSS, shadcn/ui | Decided | Mobile-first, accessible components. |
| Forms/validation | Zod (shared schemas), React Hook Form | Decided | One schema defines validation, types and OpenAPI. |
| API style | REST + JSON, versioned `/api/v1` | Decided | See `03`. |
| API docs | OpenAPI 3.1 generated from Zod schemas | Decided | Tooling choice (e.g. a Zod-to-OpenAPI library) in a small ADR. |
| Database | Neon PostgreSQL | Decided | Standard Postgres, branching, pooling. |
| ORM / migrations | Drizzle ORM + drizzle-kit | Decided | SQL-close, light, easy to port. |
| DB driver | Neon serverless driver | Decided | See section 3 for HTTP vs WebSocket. |
| Authentication | Established library or managed provider | **OPEN** (ADR-0002) | Criteria in section 4. |
| Authorisation | Own policy layer in `access-control` | Decided | Central `can()` functions. |
| File storage | S3-compatible object storage | **OPEN** (ADR) | Pre-signed uploads; never store files in Postgres or on Vercel disk. |
| Email / SMS / WhatsApp | Provider behind a `notifications` interface | **OPEN** (ADR) | Pick a provider with good Tanzania delivery; keep it swappable. |
| Background jobs | Vercel Cron for schedules; queue service for async work | **OPEN** (ADR) | Not inside request handlers. |
| Logging | `pino` (JSON) | Decided | No personal data. |
| Error tracking | Sentry or equivalent | **OPEN** | Scrub personal data before sending. |
| Unit/integration tests | Vitest | Decided | |
| End-to-end tests | Playwright | Decided | Mobile viewport projects included. |
| Lint / format | ESLint (typescript-eslint, react-hooks, boundaries) + Prettier | Decided | |
| Git hooks | Husky + lint-staged + commitlint | Decided | See `06`. |
| Secret scanning | gitleaks (hook + CI) | Decided | |
| Dependencies | pnpm; Renovate or Dependabot | Decided | |
| CI/CD | GitHub Actions + Vercel Git integration | Decided | See `08`. |
| Hosting | Vercel | Decided | Pilot. |

## 2. Dependency admission rules

Before adding ANY dependency, the commit body must answer:

1. What need does it meet that existing code cannot?
2. Is it actively maintained (recent releases, open-issue health)?
3. Size and runtime cost (important for mobile bundles and cold starts)?
4. Licence compatible (MIT/Apache-2.0/BSD preferred)?
5. Known vulnerabilities? (`pnpm audit`)

Prefer the platform and the standard library. Prefer one well-known library over three small ones. Remove unused dependencies promptly (own commit).

## 3. Vercel + Neon specifics

**Connections**
- Use the **pooled** Neon connection string for the running application. Use the **direct** (unpooled) string for migrations only.
- The Neon serverless driver offers an HTTP mode (good for single, one-shot queries) and a WebSocket/pool mode (needed for **interactive transactions**). Our tenant-scoped work runs **inside transactions** (RLS context is set per transaction), so `platform/db` must provide a `withTenantTransaction(ctx, fn)` helper using a transaction-capable mode. Confirm current driver behaviour in the Neon and Drizzle docs when implementing.
- Never create a new connection pool per request. Create the client once per function instance in `platform/db`.

**Regions**
- Set the Vercel Functions region to match the Neon region. Measure latency from Dar es Salaam to the candidate regions before deciding; record the result in an ADR.

**Environments and branches**
- Local → Neon `dev` branch. Preview deployments → one Neon branch per preview (the Neon–Vercel integration can automate this). Production → Neon `main`.
- Production data is never copied to local machines or previews without anonymisation.

**Limits to design around**
- Functions have execution-time limits → no long jobs in handlers. Use queues/cron + small steps.
- No WebSocket servers on Vercel Functions → no real-time features in the pilot.
- No writable persistent disk → files go to object storage.
- **Plan/terms:** Vercel's free Hobby plan is intended for personal, non-commercial use. A church pilot that serves real members should run on a paid plan. Check current Vercel terms and pricing before launch.

## 4. Authentication decision criteria (for ADR-0002)

Whichever option is chosen must support:

- Secure server-side sessions with `HttpOnly`, `Secure`, `SameSite` cookies.
- MFA for privileged roles.
- Login by **email and/or phone number** (phone OTP is common in Tanzania; weigh SMS cost, delivery reliability and SIM-swap risk).
- Multiple churches per user with explicit active-church selection.
- A path to **single sign-on across the CMS and the future social app**.
- Issuing short-lived, scoped tokens to external API clients later.
- Data export (no lock-in) and passwords hashed with a modern algorithm (argon2id/bcrypt) if passwords are used.
- Active maintenance and a good security track record.

Options to compare: Auth.js-family libraries, Better Auth, a managed provider (e.g. Clerk, WorkOS, Auth0), or a self-hosted identity service. **Do not implement authentication until ADR-0002 is accepted.**

## 5. Environment variables (names only)

```
DATABASE_URL            # pooled, app runtime
DATABASE_URL_UNPOOLED   # direct, migrations only
APP_ENV                 # local | preview | production
APP_BASE_URL
SESSION_SECRET          # or provider-specific equivalents
STORAGE_*               # bucket, region, keys
NOTIFY_*                # provider keys
SENTRY_DSN
```

Rules: validated at startup by `platform/config`; documented in `.env.example` with **fake values only**; stored in Vercel environment settings, per environment; never exposed to the browser unless prefixed `NEXT_PUBLIC_` and genuinely public.

## 6. Tooling baseline (first commits of the project)

Each line below is its own commit, in this order:

1. `chore: initialise repository with gitignore and licence notes`
2. `build: add pnpm, .nvmrc and engines`
3. `build: scaffold Next.js app with TypeScript strict mode`
4. `build: add Prettier and ESLint configuration`
5. `build: add module-boundary lint rules`
6. `build: add Vitest and first smoke test`
7. `build: add Husky, lint-staged and commitlint`
8. `build: add gitleaks pre-commit and CI step`
9. `ci: add GitHub Actions check workflow`
10. `build: add Drizzle, drizzle-kit and platform/db`
11. `build: add Zod config validation in platform/config`
12. `feat(api): add GET /api/v1/health endpoint`

## 7. Upgrade policy

- Security patches: as soon as possible, own commit.
- Minor/patch updates: weekly batch by the bot, **one dependency per commit**.
- Major updates (Next.js, React, Drizzle, Node): planned task, read the migration guide, commit in small steps, deploy first to a preview.
