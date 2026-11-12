# Ekklesia CMS

**Ekklesia** is a church management system built for real parish life — starting with a pilot at **CrossLife Mission Network** in Tanzania, and designed to grow into a multi-church product.

It helps church staff run day-to-day operations and gives members a simple phone-first place to stay connected. One church’s data never mixes with another’s.

---

## Who it’s for

| Audience | What they get |
| --- | --- |
| **Church administrators** | People, households, membership, ministries, events, attendance, finance, and communications in one place |
| **Members** | Home feed, events, check-in, giving overview, community, notifications, and profile |
| **Platform operators** | A separate console to oversee health, security, audit, and churches across the product |

Built for **phones first**, slow or unstable internet, and eventually **English + Swahili**. Mobile money (M-Pesa and similar) for giving is planned later.

---

## What the product covers

### Admin app
- **People & households** — member records, contacts, family structure  
- **Membership** — visitor → active → inactive journeys and applications  
- **Ministries** — organisational units and participation  
- **Events & attendance** — event lifecycle, registrations, sessions, check-in  
- **Finance** — funds, offerings, pledges (ledger foundations for later depth)  
- **Messaging** — announcements, templates, and message jobs  
- **Settings** — current church profile and configuration  

### Member portal
- Personal home, events, attendance, giving summary, community, notifications, and profile  

### Platform console
- Operator overview, churches, access, growth, audit, security findings, and fault response (served on a dedicated subdomain)

---

## How it’s built

Ekklesia is a **modular monolith**:

- **Next.js + TypeScript** app (Vercel-ready)  
- **Neon / PostgreSQL** with Drizzle ORM  
- Versioned REST API under `/api/v1/...`  
- Domain logic in `church-cms/src/modules/*` (framework-free, so a dedicated backend can be extracted later)  
- Auth via **Better Auth** (member PIN; admin MFA/OTP)  

```
Browser / phone
      │
      ▼
 Next.js App Router  ── UI (admin · member · platform)
      │
      ▼
 /api/v1/* handlers  ── thin: parse → authorise → call service
      │
      ▼
 modules/*/service   ── business rules + tenant scope (church_id)
      │
      ▼
 PostgreSQL (RLS)    ── church data isolation
```

Engineering constitution and deeper docs live in [`docs/`](docs/) — start with [`docs/AGENTS.md`](docs/AGENTS.md).

---

## Repository layout

```
.
├── README.md                 ← you are here (product overview)
├── church-cms/               ← runnable Next.js application
│   ├── src/app/              ← admin, member, auth, platform UI + API routes
│   ├── src/modules/          ← domain services (people, events, finance, …)
│   ├── drizzle/              ← SQL migrations
│   └── docs/                 ← app-level API, stage gates, pilot notes
└── docs/                     ← architecture, security, ADRs, BA pack, kit
```

---

## Quick start

```bash
cd church-cms
pnpm install
cp .env.example .env.local
# Set DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
pnpm db:migrate:local
pnpm db:seed:dev
pnpm db:seed:auth
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).  
API docs (local): [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs).

Full setup, scripts, and seed accounts: [`church-cms/README.md`](church-cms/README.md).

---

## Status

Stages **1–4 MVP** are in place (core modules, APIs, and P0 admin/member UI).  
Stage **5** (pilot readiness for CrossLife) is in progress — see [`church-cms/docs/PILOT_READINESS.md`](church-cms/docs/PILOT_READINESS.md) and [`church-cms/docs/STAGE_GATES.md`](church-cms/docs/STAGE_GATES.md).

**Not in current scope:** branch/multi-campus workflows, production CrossLife data as seed, and mobile apps.

---

## Principles that matter

1. **Tenant isolation** — every church-owned query is scoped by `church_id` from the server session.  
2. **The API is the product** — business capabilities go through versioned `/api/v1` endpoints, not Server Actions.  
3. **Privacy** — no real member data in fixtures, commits, or screenshots; synthetic seed only.  
4. **Small, reviewable history** — see [`docs/06-git-discipline.md`](docs/06-git-discipline.md).

---

## Learn more

| Topic | Doc |
| --- | --- |
| Agent / engineering rules | [`docs/AGENTS.md`](docs/AGENTS.md) |
| System architecture | [`docs/01-system-architecture.md`](docs/01-system-architecture.md) |
| Technology stack | [`docs/02-technology-stack.md`](docs/02-technology-stack.md) |
| API conventions | [`docs/03-api-architecture.md`](docs/03-api-architecture.md) |
| Security & tenancy | [`docs/04-security.md`](docs/04-security.md) |
| Auth decision | [`docs/09-adr-0002-authentication.md`](docs/09-adr-0002-authentication.md) |
| Releases / SemVer / tags | [`docs/10-release-versioning.md`](docs/10-release-versioning.md) |
| Brand (Ekklesia) | [`docs/ekklesia/`](docs/ekklesia/) |
| Business analysis pack | [`docs/CMS_Business_Analysis/`](docs/CMS_Business_Analysis/) |

---

## Licence & contribution

Private product repository for AMVA-TECH / Ekklesia. Internal contribution follows `docs/AGENTS.md` and the commit discipline in `docs/06-git-discipline.md`.
