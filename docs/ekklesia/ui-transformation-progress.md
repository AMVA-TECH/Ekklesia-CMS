# Ekklesia UI Transformation — Progress Tracker

**Lead Architect:** Primary Cursor agent (this session)  
**Quality bar:** Precision + Impeccable craft (checkpoint-driven; no skipped gates).  
**Token balance (user lock):** Quality UI/UX and brand fidelity matter — and so does spend. Prefer lean prompts, no duplicate Lead re-audits, and right-sized models. Use the strongest model when craft/architecture is on the line; use a lighter model for narrower follow-ups. Never ship sloppy UI to “save tokens,” and never burn tokens on redundant exploration.  
**Started:** 2026-11-10  
**Status legend:** Pending · In progress · Blocked · Review required · Completed

## Capability snapshot (Lead, pre-flight)

| Capability | Available in this session | Notes |
|---|---|---|
| Native subagent delegation | Yes | Cursor `Task` tool |
| Parallel agents | Yes | Multiple Task calls in one turn |
| Isolated worktrees / branches | Yes | `best-of-n-runner`; optional `environment: cloud` (only if user requests cloud) |
| Model assignment for subagents | Yes | Explicit slug when strategy warrants; available family includes Claude Opus/Sonnet, GPT, Gemini, Grok, Muse |
| Shared project context | Partial | Subagents do **not** inherit prior chat; Lead must pass full context in the prompt |
| Independent file edit | Yes | Local subagents can edit; ownership rules enforce isolation |
| Review before integration | Yes | Lead reviews handoffs; Checkpoint A–E gates |

**Git caution:** Working tree has extensive uncommitted church-cms backend/platform changes. UI transformation must **not** overwrite, discard, or mix into those changes. Phase 1 writes documentation only.

**Parallelism policy:** Max two major implementation agents editing separate areas concurrently. Phase 1 is sequential and single-agent.

## Workstreams

| Workstream | Status | Responsible agent | Dependencies | Notes |
|---|---|---|---|---|
| Architecture audit | Completed | Agent 1 — Repository & UI Architecture Analyst | None | Deliverable: `docs/ekklesia/ui-architecture-audit.md` |
| Design tokens | Completed | Agent 2 — Design System & Brand Specialist | Architecture audit + Checkpoint A | Tokens + docs landed; official logo attached by Lead |
| Shared components | Completed | Agent 3 — Shared UI Components Specialist | Design tokens + Checkpoint B | Library + shells + apiFetch + /ui-preview + components.md |
| Admin experience | Completed | Agent 4 + Lead close-out | Shared components + Checkpoint C | Usage limit mid-run; Lead filled announcements/templates/settings stubs + typecheck |
| Member experience | Completed | Agent 5 + Lead close-out | Shared components + Checkpoint C | Usage limit blocked resume; Lead verified deliverables in place (no further Agent 5 spawn) |
| UI QA | Completed (lean Lead) | Lead (default model) | Integrated UI + Checkpoint D | Deep Agent 6 browser pass still optional |
| FundFlow vision alignment | Completed (flagship) | Lead | Checkpoint E + user FundFlow lock | Mockup goal shipped — see `docs/ekklesia/visual-direction.md` + quality review |
| Module API rollout (Auth→Settings) | Completed | Lead | Live `/api/v1` + existing screens | P0 mutations wired per domain; see decision log 2026-11-11 |

## Checkpoints

| Gate | Status | Criteria |
|---|---|---|
| A — Architecture approval | Completed | User confirmed Phase 2 go (2026-11-10). Decisions Q1–Q10 locked. |
| B — Brand approval | Completed | Lead approved 2026-11-10 (see decisions below) |
| C — Shared component approval | Completed | Lead approved 2026-11-10 after hygiene pass (no `--ek-*` in components) |
| D — Experience integration | Completed | Lean Lead review 2026-11-11 — see `ui-quality-review.md` |
| E — Final quality approval | Completed (lean) | Route collisions fixed; deep browser a11y still optional |

## File ownership (locked)

| Agent | Owns |
|---|---|
| Agent 1 | `docs/ekklesia/ui-architecture-audit.md` (+ this tracker updates by Lead) |
| Agent 2 | Theme/tokens/global styling under church-cms (paths TBD after audit) |
| Agent 3 | Shared UI components (paths TBD after audit) |
| Agent 4 | Admin-specific layouts/pages |
| Agent 5 | Member-specific layouts/pages |
| Agent 6 | `docs/ekklesia/ui-quality-review.md` |

## Decision log

| Date | Decision |
|---|---|
| 2026-11-10 | Execute §17–§18 orchestration. Start Phase 1 only. Impeccable quality bar; no Phase 2 until Checkpoint A. |
| 2026-11-10 | Protect existing uncommitted git changes; Phase 1 documentation-only. |
| 2026-11-10 | Structural reference (superseded 2026-11-11): was RentFlow. Implementation target: `/Users/aamani/Desktop/CMS/church-cms`. |
| 2026-11-11 | **Structural reference locked to FundFlow** (`/Users/aamani/Desktop/Fundflow/frontend`). RentFlow banned for all further UI restructuring. Companion memories + Mockup Vision Alignment plan retargeted. |
| 2026-11-11 | **Visual goal locked:** `docs/ekklesia/visual-reference-dashboard-mockup.jpg` is the composition/look north star. FundFlow = how to build; mockup + brief = what it should feel like. |
| 2026-11-11 | Flagship vision pass shipped: charcoal/gold shell, chrome mark, admin dashboard + member home mockup composition, `visual-direction.md`. |
| 2026-11-10 | Agent 1 audit accepted. Checkpoint A Lead decisions recorded (see below). Phase 2 not started. |
| 2026-11-10 | User confirmed Phase 2 go. Agent 2 launched. |
| 2026-11-10 | Official Ekklesia dark app icon attached under `church-cms/public/brand/`; layout icons updated; placeholders deprecated. |
| 2026-11-10 | Agent 2 complete. Checkpoint B approved: derived a11y tokens kept; platform `--font-geist-sans`→DM Sans alias kept temporary; official logo supersedes Agent 2 placeholders. Phase 3 held until user says go. |
| 2026-11-10 | User approved Phase 3. Agent 3 launched (strong model; quality-first shared library). |
| 2026-11-10 | Agent 3 complete. Lead hygiene: removed residual `--ek-*` / `text-white` from shared UI. Checkpoint C approved. Phase 4 held until user go. |
| 2026-11-11 | Fish-only transparent favicon/mark. User go Phase 4 — Agents 4 ∥ 5 launched. |
| 2026-11-11 | Agent 5 hit Other-Models usage limit mid-run; partial member/auth files present. Resumed with lean finish prompt + default model. |
| 2026-11-11 | Agent 5 resume hit same usage limit. Lead closed Phase 4b: member+auth+root landing present; PIN on sign-in; no further Agent 5 spawns. Await Agent 4 then Checkpoint D. |
| 2026-11-11 | Agent 4 hit Other-Models usage limit. Lead close-out: announcements client, templates/settings placeholders, root LayoutProps fix, `.next` cleared. `pnpm typecheck` green. Phase 4 complete; Checkpoint D next. |
| 2026-11-11 | Checkpoint D approved (lean Lead review, no subagent). Full Agent 6 QA held for model-budget. |
| 2026-11-11 | Checkpoint E lean: admin URLs prefixed `/admin/*` to clear collisions with member `/events` & `/attendance`. Typecheck green. |
| 2026-11-11 | Post-E: announcements create/submit/publish; templates + church settings clients; auth SkipLink; typecheck green. |
| 2026-11-11 | Browser pass: fixed apiFetch meta envelopes + asList; Suspense on auth; toast hydration; dashboard Date greeting. |
| 2026-11-11 | **Module-by-module API rollout complete (P0):** Auth post-login redirect + phone normalize; People edit/contacts/DOB; Households members/children/edit; Memberships `POST /status` + create (statuses aligned to visitor/active/inactive); Events edit PATCH; Attendance open→record→finalize; Ministries add/end participations; Finance post offering + create pledge + follow-up; Messaging jobs create/dispatch + announcement reject; Settings role assign/revoke. `pnpm typecheck` green. Deferred: apply-pledge payment (needs journal picker), member QR check-in, participation-requests admin list (no list API), opaque church settings bag. |

## Checkpoint A — Lead decisions (from audit §11)

| # | Topic | Decision |
|---|---|---|
| Q1 | Route groups | Flat siblings: `(admin)`, `(member)`, `(auth)`. Do not nest under `(app)`. |
| Q2 | Auth screens | Agent 5 owns `(auth)/*` pages. Agent 3 owns form primitives those pages consume. |
| Q3 | Platform console | Skin-only (b). Keep `.platform-*` + structure; optional token alignment later. No rebuild. Do not touch `proxy.ts`. |
| Q4 | Public/marketing | Out of scope for this programme. Auth + admin + member only. |
| Q5 | Typeface | One primary UI sans: **DM Sans**. Optional editorial serif (**Fraunces**) only for scripture/devotional quotes — not chrome. No Inter. |
| Q6 | Logo assets | **Resolved.** Official dark app icon attached to `church-cms/public/brand/ekklesia-mark.png` (+ sizes). Placeholders deprecated. |
| Q7 | i18n | Day-one `t()` (or project Phrases equivalent) with keys; SW strings may lag. |
| Q8 | Dev-auth | Agent 3 ships single `apiFetch()`; no hardcoded `x-dev-*` in feature pages. |
| Q9 | Nav personas (pilot) | `church_administrator` + `member` (+ `finance_officer` only where finance screens exist). Defer pastor/ministry_leader/etc. |
| Q10 | Headless libs | Prefer Radix only for dialog/menu/popover focus management; justify in commit. All other primitives in-house. |

### Ownership freeze (from audit §9)

- Agent 2: `globals.css`, coordinated `layout.tsx`, `_ekklesia/tokens.css`, `public/brand/`, brand docs
- Agent 3: `_ekklesia/{ui,shell,session,icons}/` + `apiFetch`
- Agent 4: `(admin)/**` (including migrate `events/`)
- Agent 5: `(member)/**` + `(auth)/**`
- Off-limits: `api/**`, `modules/**`, `platform/**` (except later optional CSS variable skin), `proxy.ts`

### Hard constraints

- No application edits until Phase 2 starts.
- Preserve pre-existing dirty git tree; UI work in separate focused commits when user requests commits.
- **FundFlow** (`/Users/aamani/Desktop/Fundflow/frontend`) = sole structural/pattern donor; take craft/layout/composition only — do not port cyan/navy brand or Inter-as-identity.
- **RentFlow banned** — do not open, cite, or port as reference for UI work.
- Ekklesia brief + dashboard mockup = visual identity (charcoal admin rail, gold active, fish mark).
