---
name: release-please
description: >-
  Cut and maintain Ekklesia SemVer releases with googleapis/release-please
  (tags, CHANGELOG, package.json, GitHub Releases). Use when the user mentions
  release, tag, SemVer, version bump, changelog, GitHub Release, release-please,
  Release PR, or shipping a version.
---

# Release Please (Ekklesia CMS)

## Authority

1. Read `docs/10-release-versioning.md` first — it is the source of truth.
2. Upstream: https://github.com/googleapis/release-please and https://github.com/googleapis/release-please-action
3. Do not invent a parallel versioning scheme.

## Repo facts

- Default branch: **`master`**
- Releasable package path: **`church-cms`** (`release-type: node`)
- Config: `release-please-config.json`
- Manifest: `.release-please-manifest.json`
- Workflow: `.github/workflows/release-please.yml`
- Changelog: `church-cms/CHANGELOG.md`
- App SemVer ≠ `/api/v1` (API path versioning stays in `docs/03-api-architecture.md`)

## Normal release flow

1. Land work on `master` with Conventional Commits (`feat` / `fix` / `deps` are releasable).
2. Workflow updates or opens the Release PR (`autorelease: pending`).
3. Human reviews using `docs/08-delivery-and-observability.md` §5.
4. Merge the **Release PR** (squash allowed **only** for Release PRs).
5. release-please tags `vX.Y.Z` and creates the GitHub Release.

**Agents must not** hand-tag ordinary releases (`git tag` / `gh release create`) after bootstrap unless the human explicitly requests an emergency override.

## When asked to “cut a release”

1. Check for an open Release PR: `gh pr list --label "autorelease: pending"`.
2. If missing and releasable commits exist, re-run the workflow (Actions → release-please → Run) or push an empty docs-free nudge only if the human asks; prefer re-running the action.
3. Summarise proposed version + changelog; do not merge the Release PR unless the human says to merge it.
4. After merge, verify tag + release: `git fetch --tags && git tag -l 'v*' | tail` and `gh release view`.

## Bootstrap / first tag

If no `v*` tags exist and the human wants a baseline matching manifest `0.1.0`:

```bash
git tag -a v0.1.0 -m "v0.1.0 — baseline before release-please automation"
git push origin v0.1.0
```

Only with explicit human approval. After that, stop hand-tagging.

## Force a specific version

Empty commit on `master` (human-approved):

```bash
git commit --allow-empty -m "chore: release 0.2.0" -m "Release-As: 0.2.0"
```

## Fix release notes after a squash-merged PR

Edit the merged PR body to include:

```
BEGIN_COMMIT_OVERRIDE
feat: corrected summary for changelog
END_COMMIT_OVERRIDE
```

Then re-run release-please. Does **not** work with plain merge commits.

## Forbidden

- Moving or deleting published tags
- Hand-editing `CHANGELOG.md` outside a Release PR without human approval
- Confusing app `vX.Y.Z` with `/api/v1`
- Squash-merging normal feature PRs (violates `docs/06-git-discipline.md`)
- Changing `docs/AGENTS.md` / `docs/*` to weaken these rules without human approval

## Config change checklist

If editing release-please config:

1. Keep a single product package at `church-cms` unless a human asks for a second artifact.
2. Keep `include-component-in-tag` false so tags stay `vX.Y.Z`.
3. Own commit: `ci: …` for workflow/manifest; `docs: …` for `10-release-versioning.md`.
