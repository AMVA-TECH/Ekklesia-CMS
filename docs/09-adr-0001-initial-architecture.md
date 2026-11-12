# ADR-0001 — Initial Architecture: Modular Next.js Monolith on Vercel + Neon, API-First, Extractable

- **Status:** Accepted (pilot)
- **Date:** 2026-11-07
- **Decision makers:** Project owner
- **Supersedes:** none
- **Revisit when:** any trigger in `07-backend-extraction.md` is met, or at the end of the pilot

## 1. Context

We are building a Church Management System for multiple churches: an admin app and a member portal now, and a separate social/community application later. The first pilot is one church (CrossLife). Priorities, in the owner's words and order of concern: **security, easy and fast deployment, manageability, scalability, and API endpoints for linking future implementations.**

The owner wants to **host everything on Vercel with Neon during the pilot**, while leaving room to **build a complete dedicated backend as the system grows**. The owner also wants a strict engineering discipline, including **very small, granular commits for every change**, enforced on coding agents.

Constraints: small team, Tanzanian users (mobile-first, variable connectivity, Swahili/English), personal and sometimes sensitive data, limited operations budget, need to move fast without painting ourselves into a corner.

## 2. Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| **A. React + Express + Neon** | Familiar; flexible API | Two apps to deploy; Express has no enforced structure; more infrastructure to run |
| **B. Next.js full-stack + Neon on Vercel** | One deployable; fastest pilot; first-class REST endpoints via Route Handlers; simple CI/CD and previews | Backend can become a tangle of handlers if not disciplined; serverless limits (long jobs, WebSockets) |
| **C. Next.js + separate NestJS API + Neon** | Strong separation; structured backend from day one; independent scaling | Two services to deploy, secure and monitor now; more overhead than the pilot needs |

## 3. Decision

Adopt **Option B, deliberately shaped for a later move to Option C**:

1. **One Next.js (App Router, TypeScript) app on Vercel** with **Neon PostgreSQL**, using **Drizzle ORM**.
2. **API-first:** versioned REST at `/api/v1`, Zod contracts, OpenAPI generated, standard problem-details errors. No Server Actions for business operations.
3. **Modular monolith:** business logic in framework-free `src/modules/*` with strict layers (handler → service → repository), one public surface per module, own tables, explicit `Ctx`.
4. **Security by design:** tenant isolation in five layers (session, `Ctx`, scoped repositories, Postgres RLS, cross-tenant tests); backend-enforced authorisation; Proxy/middleware is **not** a security boundary.
5. **Extraction-ready:** the rules in `07-backend-extraction.md` are mandatory so a dedicated NestJS/Node backend can be introduced module by module behind the same API contract.
6. **Engineering constitution:** `AGENTS.md` and `docs/*` bind every agent and contributor, including **atomic, Conventional Commits with rebase/merge (never squash) merges**.

## 4. Consequences

**Positive**
- One deployment, previews with isolated database branches, minimal operations burden for the pilot.
- A real API from day one that future apps can consume, without direct database access.
- Clear path to a dedicated backend with low rewrite risk.
- High-quality, reviewable history and visible agent work.

**Negative / risks and mitigations**
- *Handlers becoming the backend* → lint-enforced layers, thin-handler rule, reviews.
- *Serverless limits* → no long jobs/WebSockets in the pilot; queues and cron by ADR; extraction triggers defined.
- *Connection handling with Neon and RLS* → transaction-local `set_config`, transaction-capable driver mode, pooled connections for runtime, direct for migrations.
- *Vercel plan and terms for commercial use* → confirm plan before real members use the system.
- *Granular commits slow raw typing speed* → accepted on purpose; hooks and tooling keep the cost low.
- *Data-protection obligations* (Tanzania PDPA 2022) → legal review before launch; recorded in a follow-up ADR.

## 5. Decisions deferred (ADR queue)

| ADR | Question | Needed before |
| --- | --- | --- |
| ADR-0002 | Identity and authentication provider/library (criteria in `02` §4) | any login work |
| ADR-0003 | Region selection for Vercel Functions and Neon (measure latency from Dar es Salaam) | first deploy |
| ADR-0004 | File storage provider | first upload feature |
| ADR-0005 | Notification providers (SMS/WhatsApp/email) | first notification |
| ADR-0006 | Background jobs / queue approach | first async workflow |
| ADR-0007 | Error tracking and monitoring tools | first production traffic |
| ADR-0008 | Data protection and retention (legal review outcome) | pilot launch |
| ADR-0009 | OpenAPI generation tooling | first documented endpoint |

## 6. Compliance with this decision

Any change that conflicts with this ADR (adding a second backend now, using Server Actions for business logic, bypassing tenant layers, squash-merging, dropping commit discipline) requires a new ADR approved by the project owner **before** the change is made.
