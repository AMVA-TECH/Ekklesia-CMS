# 06 — Git Discipline: Small, Meaningful Commits

**Status:** Accepted and **absolute**. This is the foundation of how we build. **Every single small change gets its own commit.** Coding agents follow it strictly, always, with no exceptions.

## 1. Why

- **A meaningful history** tells the story of the system: what changed, why, in what order.
- **Monitoring:** we can see the pace and shape of work, find when a bug appeared (`git bisect` works only if every commit is green), and revert one change safely.
- **Review and safety:** small changes are easy to understand, test, approve and undo.
- **Trust in agents:** small steps make an AI agent's work visible and controllable.

> A feature is not one commit. A feature is a sequence of small, independently verifiable commits.

## 2. What counts as one atomic commit

A commit is correct only if **all** are true:

1. **One logical change** — it can be described in one short line **without the word "and"**.
2. **Independently reviewable** — a reviewer can judge it alone.
3. **Green** — typecheck, lint, tests and build pass at that commit.
4. **Revertable** — reverting only this commit leaves a working system.
5. **Complete for its purpose** — not half-finished, no placeholder code that will "be fixed in the next commit" (except documented, safe scaffolding like an unused-but-tested module).

### Size guide
- Target **< 50 changed lines**. 50–150 is acceptable if it is truly one change. **> 150 needs a reason in the body.** (Google's guidance: about 100 lines is usually reasonable and about 1000 is usually too large; we are deliberately stricter.)
- The **number of files** counts too: a 40-line change spread across many files is not small.
- Generated output (lockfiles, drizzle snapshots, OpenAPI file) goes in **its own commit** or is clearly the only content of the commit.
- Deleting a whole file counts as roughly one line. A large mechanical change from a trusted automatic refactoring tool may exceed the limit if it is **committed alone** and says which tool made it.
- **No code that nothing uses.** Every new function, schema, policy or endpoint lands with a test that exercises it (or its first real caller). Reviewers must see how new code is used, and unused code must never land.
- When in doubt, make the commit **smaller** than you think you need to. Too-small commits are rarely a problem; too-large ones always are.

## 3. Message format — Conventional Commits

```
type(scope): imperative summary in 72 characters or fewer

Body (optional but encouraged): explain WHY — the problem, the reason for this
approach, trade-offs, what you checked. Wrap at 72 characters.

Refs: #123
BREAKING CHANGE: description (only when a public contract breaks)
```

**Types**

| Type | Use for |
| --- | --- |
| `feat` | new behaviour visible to users or API clients |
| `fix` | bug fix |
| `refactor` | restructure with no behaviour change |
| `perf` | performance improvement |
| `test` | add/change tests only |
| `docs` | documentation only (including OpenAPI file, ADRs) |
| `style` | formatting only (no logic) |
| `build` | dependencies, tooling, scripts, package config |
| `ci` | pipeline config |
| `chore` | housekeeping that fits nowhere else |
| `revert` | undo a previous commit |

**Scope** = module or area: `people`, `households`, `membership`, `events`, `auth`, `db`, `api`, `ui`, `deps`, `ci`, `docs`, `agents`, `platform`.

**Writing the summary (first line):**
- A short, focused summary of **what** this commit does, as a complete **imperative** sentence ("add…", "fix…", "remove…", not "added" or "adding").
- It must **stand alone**: someone skimming `git log --oneline` should understand it without opening the commit.
- Lower-case start after the `type(scope):`, no full stop, 72 characters or fewer.
- Good: `feat(people): add create-person request schema with validation tests`
- Bad: `update stuff`, `wip`, `fix`, `Fix bug`, `Fix build`, `Phase 1`, `Add convenience functions`, `Moving code from A to B`, `final version`, `people module done`

**Writing the body (Google: "what" and "why"):** a commit message is a permanent public record that people will search years later.
- **What** changed, summarised so a reader gets the idea without reading the diff.
- **Why:** the problem, the context you had, decisions that are not visible in the code, why this approach is the best one, and any known shortcomings or planned follow-ups.
- Include references that help: issue numbers, benchmark results, design-doc/ADR names. Links may become unreachable, so also write enough context in the message itself.
- Even tiny commits get a little care. For trivial, self-evident changes a one-line message is enough; for anything with a reason worth remembering, add a body.
- **Refactoring commits** say what changed from the past and why (e.g. a step toward removing a dependency), not just "moving code".
- Before pushing, re-read the message: it must still describe what the commit really does (messages go stale after `--amend` or fixups).

## 4. Things that must NEVER share a commit

| Don't mix… | Because |
| --- | --- |
| Formatting changes + logic changes | hides the real change |
| Renames/moves + edits | breaks history tracking |
| Refactor + behaviour change | can't tell what changed behaviour |
| Dependency upgrade + code changes | blame and revert get hard |
| Two unrelated bug fixes | can't revert one |
| Migration + the code that depends on it | migration first, backward-compatible, deployed safely (see `08`) |
| Feature code + unrelated cleanup you noticed | do the cleanup in its own commit |
| Docs/rules changes + feature work | needs separate human approval |

**Allowed together:** a behaviour change with the tests that prove it (keeps every commit green); a schema change with its generated migration file (they are one change).

## 5. Worked example — "Create a member" (what "granular" looks like)

Each line is one commit, in order, each green:

1. `feat(people): add person Drizzle table definition and migration`
2. `test(people): add RLS cross-church test for people table`
3. `feat(people): add create-person request schema with validation tests`
4. `feat(people): add person row-to-DTO mapper with tests`
5. `feat(people): add tenant-scoped person insert with integration test`
6. `feat(people): add people:create policy with tests`
7. `feat(people): add createPerson service with unit tests`
8. `feat(audit): record person.created audit event in the same transaction`
9. `feat(api): add POST /api/v1/people route handler`
10. `test(api): cover POST /api/v1/people validation and 401/403 cases`
11. `test(api): add cross-church isolation test for POST /api/v1/people`
12. `docs(api): update OpenAPI for POST /api/v1/people`
13. `feat(ui): add create-person form schema and fields (English)`
14. `feat(ui): add Swahili strings for create-person form`
15. `feat(ui): wire create-person form to POST /api/v1/people`
16. `test(e2e): add create-person flow on mobile viewport`

(Some steps may split further. Never merge steps to "save time". Notice that every code-adding step carries a test that uses it, so nothing unused lands, and every step leaves the build green.)

### Bug-fix example — "search ignores accents"
1. `test(people): characterise current search behaviour with accented names` (passes)
2. `fix(people): normalise accents before comparing search terms` (updates the test to the new expectation)
3. `docs(people): note search normalisation in module README`

### Refactor example
1. `refactor(people): extract buildSearchFilter from listPeople` (no behaviour change)
2. `refactor(people): move buildSearchFilter to its own file`
3. `style(people): format search-filter file` (only if the formatter changed something)

## 6. The per-commit routine (agents must do this every time)

1. Make **one** small change.
2. Run the checks (`pnpm check`, or at least typecheck + lint + affected tests; hooks run the fast subset, CI runs everything).
3. `git status` and `git diff` — read your own changes.
4. Stage **only** what belongs: `git add -p` (never blind `git add .`).
5. `git diff --staged` — confirm it is one logical change.
6. Commit with a conforming message.
7. Only then start the next change.

**Never** end a work session with uncommitted changes. **Never** postpone commits "until it works" — if it is not small enough to commit, the step was too big; shrink it.

If you discover you have made a big, mixed change before committing: `git reset` (soft/mixed, only on **local unpushed** work) and re-stage in pieces with `git add -p`. If it is already pushed to a shared branch: do not rewrite; make the next commits clean and tell the human.

## 7. Branching and merging

- **Trunk-based development.** `main` is always deployable and protected (no direct pushes, required checks, required review).
- Short-lived branches named `type/short-description` (`feat/create-person`, `fix/search-accents`), living **no more than ~2 days**.
- Open a PR early; keep each PR small (a handful of commits). Many small PRs beat one big PR.
- **Merge strategy: rebase-merge (preferred) or merge commit. Never squash-merge** — squashing would destroy the granular history this document exists to create.
- You may tidy your **own unpushed** branch (`git commit --fixup`, `git rebase -i`) to fix granularity, but never squash separate concerns together.
- No force-push to `main` or to a branch others use. Never amend a pushed commit.

## 8. Hooks and automation (no bypass)

| Hook / job | Does |
| --- | --- |
| `pre-commit` (Husky + lint-staged) | formats and lints staged files; runs gitleaks |
| `commit-msg` (commitlint) | rejects messages that break the format |
| `pre-push` | typecheck + tests |
| CI | full checks on every PR and on `main`; secret scan; OpenAPI drift check |

**`--no-verify` is forbidden.** If a hook fails, fix the cause.

## 9. Using the history for monitoring

- `git log --oneline` should read like a changelog. Automated changelog, SemVer bumps, tags, and GitHub Releases come from Conventional Commits via **release-please** (see `10-release-versioning.md`). Do not hand-tag ordinary releases.
- Healthy signals: many small commits; low average size; few reverts; `fix` commits trailing `feat` commits closely rather than piling up.
- Warning signs: commits > 300 lines; messages like "misc"; commits mixing types; a day of work in one commit.
- Use `git bisect` to find regressions and `git revert <sha>` for safe rollbacks — both rely on every commit being green and atomic.
- At the end of every agent task, the agent reports its commit list; humans spot-check size and clarity.

## 10. Quick self-check before you commit

- Can I summarise this in one line without "and"?
- Is it under ~50 lines (or justified)?
- Does `pnpm check` pass?
- Would I be comfortable reverting only this commit?
- Is everything in the diff part of *this* change?
- Does the message say *why*, if the why isn't obvious?

If any answer is "no", split or fix **before** committing.

## 11. Google guidance behind these rules, and where we are stricter

Based on Google Engineering Practices, *Small CLs* and *Writing good CL descriptions* (see `05-code-quality.md` section 12 for links). Paraphrased:

| Google guidance | How we apply it |
| --- | --- |
| A change should be **one self-contained change** that addresses just one thing, usually one part of a feature | Our atomic-commit definition (section 2). |
| Small changes are reviewed faster and more thoroughly, introduce fewer bugs, waste less work if rejected, merge easily, are easier to design well, and are simpler to roll back | The reason for this whole document. |
| Reviewers may reject a change for being too large | An agent must proactively split; never ask a human to review a giant commit. |
| Include related tests in the same change | Behaviour and its tests share a commit. |
| Everything a reviewer needs should be in the change, its description or earlier changes | Write real bodies; no "see next commit". |
| The system must keep working after each change; don't break the build between commits | Every commit is green. |
| Don't make a change so small its implications are unclear; include a usage of a new API | No unused code (section 2); tests count as usage. |
| Keep refactorings separate from features and fixes | Section 4. **Stricter:** Google allows tiny local clean-ups (e.g. renaming a local variable) inside a feature change; we do not, because every small change gets its own commit. |
| Add tests *before* refactoring uncovered code | First commit: `test(...): characterise current behaviour`, then the refactor. |
| Large changes are acceptable for whole-file deletions and trusted automated refactors | Same, committed alone. |
| Strategies for splitting: stack changes, split by files, split horizontally (by layer), split vertically (by feature slice) | Our worked example (section 5) mixes horizontal layering with vertical slices; plan the split **before** coding. |
| First line: a short, standalone, imperative summary; body explains what and why, shortcomings, context | Section 3. |
| Tags in the first line are optional and should be short | Our `type(scope):` prefix is the only tag. |
| Re-check the description before submitting, since reviews change a change | Re-read messages before pushing. |
| Never lower code health except in a real emergency | See `05-code-quality.md` section 4. Emergency commits are still atomic and still get tests afterwards. |
