# API documentation (Swagger)

**Local / non-production only.** Production returns `404` for these routes.

| URL | Purpose |
|---|---|
| [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs) | Swagger UI — browse & Try it out |
| [http://127.0.0.1:3000/api/openapi.json](http://127.0.0.1:3000/api/openapi.json) | Raw OpenAPI 3.0.3 |
| [docs/api/ENDPOINT_MAP.md](./api/ENDPOINT_MAP.md) | Markdown method/path table |
| [docs/api/openapi.json](./api/openapi.json) | Checked-in contract (generated) |

## Regenerate after API changes

```bash
pnpm openapi:generate
```

Scans `src/app/api/**/route.ts`, merges [docs/api/overlays/](./api/overlays/), writes `openapi.json` + `ENDPOINT_MAP.md`.

## Auth for Try it out

With `ALLOW_DEV_AUTH=1` (default in `.env.example`), Swagger attaches seed **admin** headers on each request:

| Header | Seed value |
|---|---|
| `x-dev-user-id` | `cccccccc-0001-0001-0001-000000000001` |
| `x-dev-church-id` | `11111111-1111-1111-1111-111111111111` |
| `x-dev-person-id` | `dddddddd-0001-0001-0001-000000000001` |

Other fixtures: member `…0002`, finance `…0003`, platform operator `…0004`.

For `/api/v1/platform/*`, Swagger switches to the platform operator seed (`x-dev-platform-operator: 1`).

Real sessions: `POST /api/v1/auth/login` (PIN) then MFA for admins — cookie-based.

## SMS simulation

Set `NOTIFY_PROVIDER=smsgate` with SMSGate credentials (see [INTEGRATIONS.md](./INTEGRATIONS.md)). Message job `dispatch` then hits the Android/cloud SMS gateway.

## Enriching contracts

Add JSON overlays under `docs/api/overlays/` (deep-merged into the generated spec). Core auth/people/events/messaging/platform examples live in `01-core-examples.json`.
