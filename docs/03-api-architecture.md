# 03 — API Architecture

**Status:** Accepted. **Read with:** `01`, `04`, `07`. The API is a product, not a by-product of the UI.

## 1. Principles

1. **One API, many clients.** The CMS web UI, the future social app, mobile apps and integrations use the same `/api/v1` endpoints.
2. **Contract first.** The Zod schemas in each module define requests and responses; OpenAPI is generated from them. The contract changes only deliberately.
3. **Stable and boring.** Plain REST, JSON, predictable names, predictable errors.
4. **Secure by default.** Every endpoint authenticates, resolves the church, authorises, validates. Public endpoints are the rare, named exception.
5. **Extractable.** Route handlers contain no business logic, so the whole API can move behind a dedicated backend without clients noticing.

## 2. Base URL and versioning

- Pilot: same origin, `https://<app-domain>/api/v1/...`.
- Later: may move to `https://api.<domain>/api/v1/...` via a rewrite or the dedicated backend. **Clients must take the base URL from configuration.**
- Version lives in the path (`/v1`). Within a version, changes must be **backward compatible**: adding optional fields, new endpoints, new enum values that clients can ignore.
- **Breaking change** (removing/renaming a field, changing meaning or type, tightening validation that rejects previously valid input) = new version `/v2`, with `/v1` kept running during a published deprecation window. Use `Deprecation` and `Sunset` response headers.

## 3. Resource design

| Rule | Example |
| --- | --- |
| Plural nouns, kebab-case | `/organisational-units` |
| Hierarchy only for true containment | `/ministries/{id}/members` |
| IDs are UUIDs in the path | `/people/0192f…` |
| Actions that are not CRUD → sub-resource verbs sparingly | `POST /events/{id}/registrations`, `POST /memberships/{id}/transfer` |
| Methods | `GET` read · `POST` create/act · `PATCH` partial update · `PUT` only for full replace · `DELETE` remove |
| Current user | `GET /auth/me`, `GET /memberships/me` |

### Endpoint catalogue (starting point, refined per approved business process)

| Domain | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/active-church` |
| Churches | `GET/POST /churches`, `GET/PATCH /churches/{id}` |
| People | `GET/POST /people`, `GET/PATCH/DELETE /people/{id}` |
| Households | `GET/POST /households`, `GET/PATCH /households/{id}`, `POST /households/{id}/members` |
| Membership | `GET/POST /memberships`, `GET/PATCH /memberships/{id}`, `GET /memberships/me` |
| Organisation | `/organisational-units`, `/positions`, `/appointments` |
| Ministries | `GET/POST /ministries`, `GET /ministries/{id}`, `GET/POST /ministries/{id}/members` |
| Events | `GET/POST /events`, `GET/PATCH /events/{id}`, `GET/POST /events/{id}/registrations` |
| Attendance | `GET/POST /attendance/sessions`, `GET/POST /attendance/records` |
| Projects | `GET/POST /projects`, `GET /projects/{id}/participants` |
| Notifications | `GET /notifications`, `GET/PATCH /notifications/preferences` |
| Health | `GET /health` (public, no data) |

These are proposals. The real list comes from the approved business processes, and every endpoint is added in small commits (schema → service → handler → test → OpenAPI).

## 4. Requests

- `Content-Type: application/json` (uploads use pre-signed URLs, not the API body).
- **Strict Zod schemas.** Unknown fields are rejected with a `422`. No mass assignment: handlers never spread request bodies into database writes.
- `church_id` is **never** accepted in bodies or query strings as the tenant source. The active church is from the server-side session (or the scoped token for API clients).
- Query parameters: `limit`, `cursor`, `q` (search), `sort`, and documented filters like `status=active`.
- Dates: ISO 8601 (`2026-11-07` for dates, `2026-11-07T09:30:00Z` for instants). Phones: E.164. Money: `{ "amount": 150000, "currency": "TZS" }` (integer minor units).
- Language: client sends `Accept-Language: sw` or `en`.

## 5. Responses

**Single resource**
```json
{ "data": { "id": "0192f…", "displayName": "Neema Mushi", "createdAt": "2026-11-07T09:30:00Z" } }
```

**List (cursor pagination)**
```json
{
  "data": [ { "id": "…" }, { "id": "…" } ],
  "meta": { "limit": 25, "nextCursor": "eyJpZCI6…", "hasMore": true }
}
```

- Always map database rows to **response DTOs**. Never return table rows.
- Hide fields the caller may not see (property-level authorisation), do not just blank them in the UI.
- Default `limit` 25, maximum 100. No unbounded lists.
- Status codes: `200` OK · `201` created (+ `Location`) · `204` no content · `400` malformed · `401` not authenticated · `403` authenticated but not allowed (own church) · `404` not found **or belongs to another church** · `409` conflict · `422` validation failed · `429` rate-limited · `500` unexpected.

## 6. Errors — RFC 9457 "problem details"

`Content-Type: application/problem+json`

```json
{
  "type": "https://<app-domain>/problems/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "code": "validation_failed",
  "detail": "One or more fields are invalid.",
  "requestId": "req_01J…",
  "errors": [ { "field": "phone", "code": "invalid_phone_format" } ]
}
```

Rules:
- `code` values are **stable, machine-readable** and never change meaning. Clients translate them into Swahili/English.
- Never include stack traces, SQL, table names, or whether a record exists in another church.
- Every response (success or error) carries `X-Request-Id`. The same id appears in logs.

## 7. Authentication on the API

| Client | Mechanism |
| --- | --- |
| Browser (CMS UI) | Secure session cookie. State-changing requests also need CSRF protection (Origin check + token). |
| Future first-party apps | Same identity system; short-lived access token + refresh. |
| External integrations | Scoped credentials (OAuth 2.0 client credentials or hashed API keys), explicit **scopes** like `people:read`, `events:read`, per church. |

Never rely on Proxy alone. Every handler resolves the actor and church itself via `requireCtx(request)`.

## 8. Rate limiting and abuse protection

- Per IP and per account/credential. Strict limits on login, OTP, password reset, and any endpoint that sends SMS/email (costs money and can be abused).
- `429` with `Retry-After`.
- Cap request body size and page sizes. Validate before doing expensive work.
- Protect sensitive business flows (bulk export, bulk messaging) with extra permission and audit.

## 9. Idempotency and retries

Networks are unreliable. Create/charge-like `POST` endpoints accept an `Idempotency-Key` header. The server stores the key with the response for a limited time; a repeat returns the original result instead of creating duplicates. Mandatory for event registration and, later, giving/payment endpoints.

## 10. Route handler template

```ts
// src/app/api/v1/people/route.ts  — thin on purpose
import { requireCtx } from '@/platform/http/context';
import { handle } from '@/platform/http/handle';
import { listPeople, createPerson } from '@/modules/people';
import { listPeopleQuery, createPersonBody } from '@/modules/people/schemas';

export const GET = handle(async (request) => {
  const ctx = await requireCtx(request);
  const query = listPeopleQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  const page = await listPeople(ctx, query);
  return Response.json({ data: page.items, meta: page.meta });
});

export const POST = handle(async (request) => {
  const ctx = await requireCtx(request);
  const body = createPersonBody.parse(await request.json()); // strict schema
  const person = await createPerson(ctx, body);
  return Response.json({ data: person }, { status: 201, headers: { Location: `/api/v1/people/${person.id}` } });
});
```

`handle()` (in `platform/http`) adds request id, maps typed errors to problem responses, logs safely. Handlers contain **no** database calls and **no** business rules.

## 11. OpenAPI

- Generated from the modules' Zod schemas and route metadata; output at `docs/api/openapi.yaml` and served at `/api/v1/openapi.json`.
- A CI step fails if the generated file differs from the committed one (so docs never drift).
- Any endpoint change needs an OpenAPI diff in the **same task** (its own commit: `docs(api): update OpenAPI for people list`).

## 12. Testing the API

For every endpoint:
- Happy path.
- Validation failures (missing, wrong type, unknown fields).
- `401` without a session; `403` without permission.
- **Cross-church test:** an actor from Church A requests Church B's resource → `404`.
- Pagination limits and cursor behaviour.
- Contract test: the response matches the response schema (this same test suite must pass unchanged after backend extraction).

## 13. Preparing for the future social app and integrations

- **Stable IDs** for people, churches, memberships, units, events.
- **Scoped access:** another app only receives the scopes it needs.
- **One identity:** members should not need unrelated accounts for the CMS and the community app (a requirement for ADR-0002).
- **Domain events** (`membership.member.joined`, `events.event.published`, `people.person.updated`) written to an **outbox table** in the same transaction as the change, so webhooks or a queue can publish them later without changing business code. Define event names now; build delivery when the first consumer exists.
- **Privacy by contract:** another app never gets restricted fields (see data classes in `04`), even if it asks.
