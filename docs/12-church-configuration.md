# 12 — Church configuration engine

**Status:** Active (Phases 1–2).  
**Decision:** [DEC-033](cms-cursor-kit/DECISIONS.md) (kit — SaaS configurability; distinct from BA DEC-033 Delegation).  
**ADR:** [09-adr-0004-church-configurability.md](09-adr-0004-church-configurability.md).

## Purpose

One secure SaaS core; each church has an independent configuration profile. Display differences must not fork the domain model.

## Boundaries

| Category | Who changes it | Examples |
|---|---|---|
| Church configuration | Church admins with `church:update` | Branding, identity, contact, location, presence, terminology, modules, org unit data, role assignments |
| Platform extensions | Ekklesia engineering | New modules, adapters, named pilot templates |
| Core platform | Ekklesia engineering only | Permission catalogue, tenancy, auth, audit rules |

## Storage

### Relational church row (`churches`)

Immutable `id` (UUID). Editable: `name`, `short_name`, `display_name`, `slug` (unique), timezone, locale. Name/slug changes never re-tenant or cascade-delete memberships, finance, appointments, or roles.

### Structured entities

Organisational units (`department` \| `ministry` \| `life_group` \| `branch` \| `team`), positions (with `reports_to_position_id`), appointments (`substantive` \| `acting`), programmes under ministry units, roles / role assignments.

Human-readable codes (server-generated, immutable): `ORG-######`, `MIN-######`, `POS-######` via `church_code_sequences`.

### Typed settings namespaces (`church_settings.settings` jsonb)

| Namespace | Purpose |
|---|---|
| `branding` | `productName`, logos, colours |
| `identity` | description, vision, mission, mandate, motto, values, history |
| `contact` | email, phone, primary contact |
| `location` | country, region, city, address |
| `presence` | website, social links |
| `terminology` | Labels for organisational units / membership wording |
| `modules` | Booleans: people, membership, organisation, events, attendance, finance, messaging, governance |
| `workflows` | e.g. `announcementDualControl` |
| `thresholds` | e.g. `adulthoodAgeYears` |
| `templates` | Bookkeeping for applied named templates (e.g. `crosslife-pilot`) |

Legacy flat `logoMediaId` remains supported and is mirrored into `branding.logoMediaId`.

Defaults are applied on read via `resolveChurchSettings`. Updates are validated before merge.

## APIs

- `GET/PATCH /api/v1/churches/current` — profile columns (incl. short/display name, slug)  
- `GET/PATCH /api/v1/churches/current/settings` — settings document (partial namespace updates)
- Org units / positions / appointments under `/api/v1/organisational-units`, `/api/v1/positions`, `/api/v1/appointments`
- Platform: `POST /api/v1/platform/churches/{id}/apply-template` — opt-in named template (DEC-027)

`GET /api/v1/auth/me` returns resolved `config` plus short/display name for shell/nav.

## Admin UI

- **Church profile** (`/admin/settings`) — sectioned General / Identity / Branding / Contact / Location / Online / Experience; Roles/Access separate panel  
- **Organisation** (`/admin/organisation`) — hierarchy tree  
- **Ministries** (`/admin/ministries`) — unit participation  
- **Leadership** (`/admin/leadership`) — positions & reporting (appointments ≠ RBAC)

## CrossLife pilot template

Template id: `crosslife-pilot`  
Source: published site + pilot brief; **no person names**.  
Apply only via platform operator API (or future script). Not applied on default church provision.

Functional areas are seeded as `department` units with `metadata.proposed: true` until the church confirms them.

## Authorization

Leadership appointments and organisational hierarchy **never** auto-grant permissions. Scopes remain `church` \| `organisational_unit` \| `self` \| `household` (branch *kind* ≠ branch scope product).

## Phase plan

1. **Done:** Typed namespaces, Experience + full profile UI, permission+module nav, OTP branding  
2. **Done:** Org kinds/codes, position reporting, sectioned profile, leadership UI, opt-in CrossLife template  
3. **Next:** Role seed templates at provision; role-matrix CRUD; wire `workflows.announcementDualControl` into announcement publish; settings revision table; LMS on programmes (future)
