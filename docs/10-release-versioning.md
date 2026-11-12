# 10 — Release Versioning (release-please)

**Status:** Accepted.  
**Tool:** [googleapis/release-please](https://github.com/googleapis/release-please) via [release-please-action](https://github.com/googleapis/release-please-action).  
**Read with:** `06-git-discipline.md`, `08-delivery-and-observability.md`, `03-api-architecture.md`.  
**Agent skill:** `.cursor/skills/release-please/SKILL.md`.

## 1. Why

We already write Conventional Commits. Release Please turns that history into:

- SemVer bumps for the app package (`church-cms/package.json`)
- `CHANGELOG.md` entries
- Annotated git tags (`vX.Y.Z`)
- GitHub Releases

Humans decide *when* to ship by merging the Release PR. Agents must not invent ad-hoc version schemes.

## 2. Two version numbers (never conflate)

| Kind | Meaning | Example |
| --- | --- | --- |
| **App / product SemVer** | What we tag and put in GitHub Releases | `v0.2.0` ↔ `church-cms` `0.2.0` |
| **HTTP API path version** | Stable API contract | `/api/v1` until a breaking API → `/api/v2` |

Tag the **app**. Do not bump `/api/v1` for every product release. API breaks follow `03-api-architecture.md` (new path + deprecation window).

## 3. SemVer policy (pilot)

While pre–CrossLife acceptance, stay on **`0.y.z`**.

| Change | Commit signal | Bump |
| --- | --- | --- |
| Bug fix | `fix:` | patch |
| New capability | `feat:` | minor |
| Breaking product change | `feat!:` / `BREAKING CHANGE:` footer | major (avoid until `1.0.0`; prefer API `/v2` for contract breaks) |
| Docs, chore, test, ci, style (alone) | those types | no releasable bump |

**`1.0.0`** only after Stage 5 / CrossLife pilot acceptance is recorded.

`docs:`, `chore:`, `test:`, `ci:`, `style:` alone do **not** open a release (release-please releasable units are primarily `feat`, `fix`, `deps`).

## 4. How releases are cut

1. Merge work to **`master`** with Conventional Commits (`06`).
2. On push to `master`, `.github/workflows/release-please.yml` runs.
3. Release Please opens or updates a **Release PR** (`autorelease: pending`) that bumps version + changelog.
4. Human reviews the Release PR against the checklist in `08` §5, then merges it.
5. Release Please tags `vX.Y.Z` and creates the GitHub Release.

**Do not** hand-run `git tag` for ordinary releases after bootstrap. Exception: a one-time baseline tag when bootstrapping (see §6), or an emergency hotfix agreed with a human (`Release-As:` empty commit — see skill).

## 5. Tag and merge rules

- Tags are annotated, prefixed with `v` (`v0.1.0`). Never move or delete a published tag; ship `v0.1.1` instead.
- `church-cms/package.json#version` must match the tag without the `v`.
- Feature / fix PRs: **rebase-merge or merge-commit**, never squash-merge (`AGENTS.md` / `06`) so granular history survives.
- **Release PRs only:** squash-merge is allowed so the release commit stays a single Conventional Commit that release-please can tag cleanly. (release-please also accepts merge commits; prefer squash for Release PRs.)
- Vercel deploy ≠ a SemVer release. Every merge to `master` may deploy; only merging the Release PR creates a version tag.

## 6. Bootstrap (first time)

Repo state at adoption:

- Package path: `church-cms` (Node / `release-type: node`)
- Manifest last-released version: `0.1.0` (matches `package.json`)
- Default branch: `master`
- Config: `release-please-config.json` + `.release-please-manifest.json` at repo root

Optional one-time baseline (human):

```bash
git tag -a v0.1.0 -m "v0.1.0 — baseline before release-please automation"
git push origin v0.1.0
```

After that, only Release Please creates tags.

## 7. Config files (source of truth in git)

| File | Role |
| --- | --- |
| `release-please-config.json` | Packages, release-type, changelog path, tag style |
| `.release-please-manifest.json` | Last released version per package path |
| `.github/workflows/release-please.yml` | Runs on push to `master` |
| `church-cms/CHANGELOG.md` | Generated / maintained by Release Please |

Upstream docs: [release-please README](https://github.com/googleapis/release-please), [manifest releaser](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md), [action](https://github.com/googleapis/release-please-action).

## 8. GitHub token note

Default `GITHUB_TOKEN` can open Release PRs if the repo allows Actions to create PRs (Settings → Actions → General → “Allow GitHub Actions to create and approve pull requests”).

If CI must run **on** Release PRs, use a PAT / fine-grained token stored as a secret (e.g. `RELEASE_PLEASE_TOKEN`) and pass it to the action — Actions authenticating as `GITHUB_TOKEN` do not re-trigger workflows.

## 9. Agent obligations

When a task touches releases, tags, SemVer, changelogs, or release-please:

1. Read this document and `.cursor/skills/release-please/SKILL.md`.
2. Do not invent a second versioning scheme.
3. Do not retag, force-push tags, or hand-edit `CHANGELOG.md` except as release-please expects (or a human-approved fix via `BEGIN_COMMIT_OVERRIDE` on a squash-merged PR).
4. Version bumps that are not from Release Please need an explicit human request and a `Release-As:` commit body.
