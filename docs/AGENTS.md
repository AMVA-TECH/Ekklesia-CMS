# AGENTS.md — Church CMS Engineering Constitution

**Status:** MANDATORY. Applies to every AI coding agent (Cursor, Claude Code, Copilot, Codex, any other) and every human contributor.
**No exceptions.** If a task seems to need breaking a rule here, STOP and ask the human. Do not decide on your own.

---

## 1. What we are building

A **Church Management System (CMS)**:

- A **church admin app** (people, households, membership, ministries, events, attendance, projects, communications).
- A **member portal** (members see and manage their own information and what they are allowed to see).
- **Multi-church (multi-tenant):** many churches share one system. One church must never see another church's data.
- The **first pilot** is one church (CrossLife). More churches come later.
- **Later:** a separate social/community app, possibly mobile apps, and possibly a **fully dedicated backend** once the system grows.

Context that shapes every decision: users are in **Tanzania**. Assume **phones first**, slow or unstable internet, **Swahili and English**, and mobile money (M-Pesa, Tigo Pesa, Airtel Money, etc.) arriving later for giving/offerings.

## 2. The architecture in one paragraph

A **modular monolith**: one **Next.js + TypeScript** app on **Vercel**, with **Neon PostgreSQL** as the database. Inside it we keep a real backend: thin REST route handlers (`/api/v1/...`) call **services** in `src/modules/*`, which use **repositories** (Drizzle ORM) to reach the database. Business code does not depend on Next.js, so we can **move it into a dedicated NestJS/Node backend later without rewriting it** (see `docs/07-backend-extraction.md`).

## 3. Read this first

Read this whole file before ANY task. Then read the documents that match the task:

| If your task touches…                          | Read                                   |
| ---------------------------------------------- | -------------------------------------- |
| Folders, modules, layers, request flow         | `docs/01-system-architecture.md`       |
| Libraries, versions, Vercel/Neon setup         | `docs/02-technology-stack.md`          |
| Any endpoint, request, response, error         | `docs/03-api-architecture.md`          |
| Login, roles, permissions, tenants, uploads    | `docs/04-security.md`                  |
| Writing/reviewing any code, tests, naming, Google standards | `docs/05-code-quality.md` |
| Committing, branching, history                 | `docs/06-git-discipline.md`            |
| Structuring code for future extraction         | `docs/07-backend-extraction.md`        |
| CI/CD, migrations, deploys, logs, monitoring   | `docs/08-delivery-and-observability.md`|
| Why a major decision was made                  | `docs/09-adr-0001-initial-architecture.md` |
| SemVer, tags, changelogs, GitHub Releases      | `docs/10-release-versioning.md` (+ skill `.cursor/skills/release-please`) |
| Church onboarding / member join (DEC-032)      | `docs/11-church-onboarding.md`         |

## 4. The Ten Non-Negotiable Rules

1. **Tiny commits.** Every single small change gets its own commit, made immediately. A feature is a *sequence* of small commits, never one big one. (Section 5.)
2. **One concern per commit.** If the message needs the word "and", split it.
3. **Every commit leaves the repo green:** typecheck, lint, tests and build all pass.
4. **Tenant isolation always.** Every query on church-owned data is scoped by `church_id`. The church comes from the server-side session, never from the request body, URL or client.
5. **The backend decides.** Never trust the browser. Validate and authorise on the server for every request. Next.js Proxy/middleware is **not** a security boundary.
6. **Thin route handlers.** Handlers parse input, call a service, map the result. Business rules live in services.
7. **Framework-free modules.** Nothing in `src/modules/**` may import from `next/*`, `react`, or `src/app/**`. This protects our ability to extract the backend.
8. **The API is the product.** Every business capability is reachable through a versioned, validated, documented `/api/v1` endpoint. **Do not use Server Actions for business operations.**
9. **No secrets, no personal data in code, logs, commits, tests or screenshots.** Use environment variables and fake data.
10. **When unsure, stop and ask** — especially about security, tenancy, deleting data, migrations, or anything not covered here. Never guess.

## 5. How you work — the loop (every task, every time)

1. **Understand.** Restate the task in one or two sentences. Find the relevant docs and existing code.
2. **Plan the commits first.** Write the list of small commits you intend to make, in order, before touching code. Each must be independently correct and green.
3. **Do ONE step.** Make the smallest change that completes one commit.
4. **Verify.** Run `pnpm check` (typecheck + lint + test + build, or the faster subset the hooks run). Fix problems *inside this same step*.
5. **Review your own diff.** Run `git diff --staged`. If it contains anything not part of this one step, unstage it (`git add -p`).
6. **Commit immediately** using the format below. Do not start the next step with uncommitted work.
7. **Repeat** from step 3 until the plan is done.
8. **Report.** At the end, list every commit you made (`git log --oneline`), what is left, and any assumption or risk.

**Never** leave a session with uncommitted work. **Never** batch several steps into one commit "to save time".

### Commit format (summary — full rules in `docs/06-git-discipline.md`)

```
type(scope): short imperative summary, max 72 chars, no full stop

Optional body: WHY this change is needed (not what — the diff shows what).

Refs: #123
```

- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- Scope = module or area: `people`, `auth`, `db`, `api`, `ui`, `deps`, `ci`, `docs`, …
- Aim for **under ~50 changed lines**. Over ~150 needs a reason in the body (generated files, lockfiles and migration snapshots go in their own commit).
- The first line is a **complete imperative sentence** that stands alone. The body says **what** and **why** (and any known shortcomings). Vague messages like "fix bug", "update", "phase 1", "wip" are forbidden.
- **Never** use `git commit --no-verify`, `git add .` without reviewing, force-push to shared branches, or squash different concerns together.
- Merge strategy is **rebase-merge or merge-commit, never squash-merge**, so granular history survives.

## 6. Architecture rules (summary)

Layers, top to bottom. **Each layer may only call the one directly below it.**

```
src/app/api/v1/**/route.ts   → HTTP only: parse, authenticate, call service, shape response
src/modules/<name>/service    → business rules, authorisation (policies), transactions
src/modules/<name>/repository → database access (Drizzle), always tenant-scoped
src/platform/db               → connection, transaction helper, RLS context
```

- A module exposes **only** what is exported from its `index.ts`. No reaching into another module's files or tables.
- Modules talk to each other through **service functions** or **domain events**, never through each other's tables.
- Every service function takes a `Ctx` (actor, active church, request id) as its first argument. No `Ctx`, no call.
- Return **response DTOs**, never raw database rows.
- Use UTC in the database, display in `Africa/Dar_es_Salaam`. Store money as integer minor units + currency code. Store phones in E.164 (`+255…`).
- All user-facing text goes through i18n (Swahili + English). No hard-coded UI strings.

## 7. Security hard stops (summary — full rules in `docs/04-security.md`)

You must **never**:

- Query church-owned tables without a `church_id` condition, or accept `church_id` from the client as the source of truth.
- Return a record from another church (answer `404`, not `403`).
- Put authorisation logic only in the UI or only in Proxy/middleware.
- Build SQL by string concatenation. Use Drizzle's parameterised queries.
- Accept request bodies without a strict Zod schema (unknown keys rejected).
- Log tokens, passwords, OTPs, full phone numbers, national IDs, pastoral notes or giving details.
- Commit `.env*`, keys, tokens, or real member data.
- Disable a lint rule, security check, or test to make something pass.
- Write your own cryptography or session handling.

## 8. Code quality rules — Google-based (summary; full rules in `docs/05-code-quality.md`)

Standards, in order of precedence: **this repo's docs** → **Google TypeScript Style Guide** → **Google Engineering Practices** (code review, small changes) → **Google testing guidance** → **React's rules / Meta-style components** → Prettier + ESLint. Where we deliberately differ from Google (e.g. `kebab-case` file names), `05` section 2 lists it.

**The senior principle (Google):** every change must leave the codebase's *code health* better. Approve your own work only when it definitely improves it, but never chase perfection. Optional polish is a `Nit:`, not a blocker. Never accept a change that makes code health worse, except in a genuine emergency.

**TypeScript (must):**
- `strict` mode. **No `any`** (use `unknown` and narrow). **No `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`.** Avoid `as` and `!`; prefer a runtime check, and explain any that remain.
- `const` by default, never `var`. `===` always. Braces always. Single quotes, semicolons (Prettier does this).
- **Named exports only** (default exports only where Next.js requires them). Export only what other modules need. No `export let`, no namespaces, no `require`.
- `function` declarations for named functions; arrow functions for callbacks. Wrap named callbacks in an arrow (`(n) => format(n)`).
- Parse numbers with `Number()` and check the result; never unary `+`, `parseFloat`, or unchecked `parseInt`.
- Throw only `Error` subclasses using `new`; keep the chain with `{ cause: e }`; no empty `catch` (comment why if truly intended); keep `try` blocks small; every `switch` has a `default`.
- `interface` for object shapes; no nullable type aliases; no `{}` type; no wrapper types; keep mapped/conditional types simple.
- Descriptive names (no letter-deleting abbreviations, no `IFoo`, no `_private`); acronyms as words (`customerId`, `loadHttpUrl`).
- Comments explain **why**. Document every exported symbol with JSDoc (no types inside JSDoc). `TODO(#issue)` only.
- Functions about **40 lines or fewer**; split when long, deeply nested, or needing several explanatory comments.

**Change shape (must):** one self-contained change, with its tests, that keeps the build green. No code nothing uses. **Refactors, formatting and renames are separate commits** from behaviour changes. Add tests *before* refactoring uncovered code. Don't over-engineer: solve today's problem, not a speculative one.

**Tests (must):** test **behaviours, not methods**; through public APIs; prefer **state over interaction** testing and few mocks (real Postgres for repositories); no logic in tests; DAMP over DRY; deterministic; tests ship with the behaviour and must be able to fail. Mandatory: validation, permission, **cross-church** isolation, pagination, idempotency. Rough shape: many fast small tests, fewer integration tests, a few end-to-end tests (Google's first guess 70/20/10).

**Self-review before every commit (Google's areas):** design · functionality · complexity · tests · naming · comments · style · consistency · documentation · every line read · context of the whole file. Specialist checks: security, privacy, accessibility, internationalisation.

**Dependencies:** a new dependency needs a justification in the commit body (need, maintenance, size, licence, security). Prefer none.

## 9. Definition of Done (for a task, not a commit)

- [ ] All commits follow Section 5 and are individually green.
- [ ] Inputs validated; outputs mapped to DTOs; errors use the standard format.
- [ ] Tenant scoping and permissions enforced and **tested**, including a cross-church test.
- [ ] Unit/integration tests added or updated; no skipped tests.
- [ ] OpenAPI spec updated if any endpoint changed.
- [ ] No new lint/type warnings; no `console.log` left behind.
- [ ] Self-review done against the Google review areas in Section 8; the change improves code health.
- [ ] Docs updated if behaviour, architecture or conventions changed (own commit).
- [ ] Final report written (Section 5, step 8).

## 10. Forbidden shortcuts

Large "implement everything" commits · WIP/fix/misc/update commit messages · mixing formatting with logic · mixing renames with edits · editing an applied migration · running migrations from request handlers · adding a library without justification · Server Actions for business logic · direct database access from UI code · copy-pasting real member data into tests · "temporary" security bypasses · silencing errors with empty `catch`.

## 11. Commands

Package manager: **pnpm**. Node version pinned in `.nvmrc` and `package.json#engines`.

```
pnpm dev          # local development
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint (includes module-boundary rules)
pnpm test         # unit + integration tests
pnpm build        # production build
pnpm check        # typecheck + lint + test + build  (run before commits that change behaviour)
pnpm db:generate  # create a migration from schema changes
pnpm db:migrate   # apply migrations (never from app code)
```

If a command does not exist yet, creating it is its own small commit (`build(scripts): add pnpm check`).

## 12. Changing these rules

These documents are the project's foundation. Changes to `AGENTS.md` or `docs/*` are their own commits (`docs(agents): …`) and **need explicit human approval**. An agent must never edit them to make a task easier.
