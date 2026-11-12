# Integrations

Outbound and inbound third-party seams for the church CMS. **Secrets stay in env** — never in the database.

## Status

| Integration | Purpose | Status |
|---|---|---|
| **SMSGate** | Real SMS while testing (Android SIM / cloud API) | **Wired** — same API as RentFlow |
| **Briq (Karibu)** | SMS + WhatsApp leadership blasts | Production candidate — adapter + webhook live |
| Auth IdP | Login / session | ADR-0002 Better Auth |
| Object storage | Media / import files | Env names reserved (`STORAGE_*`) — not wired |
| Mobile money | Offering/pledge settlement | Seam only (`/api/v1/webhooks/mobile-money/*` later) |
| Sentry | Errors | Env name reserved |

## SMSGate — testing SMS

Docs: https://docs.sms-gate.app/ · Same contract as RentFlow (`SmsGateGateway`).

```bash
NOTIFY_PROVIDER=smsgate
SMSGATE_URL=https://api.sms-gate.app/3rdparty/v1/messages   # or http://<phone-ip>:8080/message
SMSGATE_USERNAME=…
SMSGATE_PASSWORD=…
SMSGATE_TIMEOUT=15
SMS_TEST_RECIPIENTS=+2557…,+2557…   # or * on a controlled phone
```

- **Request:** Basic auth + `POST` `{ "textMessage": { "text" }, "phoneNumbers": ["+255…"], "priority": 100 }`
- **Response:** stores gateway `id` as `providerRef`
- Numbers outside `SMS_TEST_RECIPIENTS` are refused (no send)
- Not a production billable path — use Briq (or another provider) for live church blasts

## Briq (Karibu) — messaging

Docs: https://docs.briq.tz · Base URL: `https://karibu.briq.tz`

| Flow | Endpoint |
|---|---|
| Queue blast | `POST /api/v1/message-jobs` |
| Send via Briq | `POST /api/v1/message-jobs/{id}/dispatch` |
| Briq callbacks | `POST /api/v1/webhooks/briq` |

### Env

```bash
NOTIFY_PROVIDER=briq
BRIQ_API_KEY=…                 # dashboard → API keys
BRIQ_SENDER_ID=CrossLife       # approved SMS sender ID
BRIQ_BASE_URL=https://karibu.briq.tz
BRIQ_APP_ID=…                  # optional; enables webhooks + app_id check
BRIQ_WHATSAPP_SENDER=…         # optional WhatsApp sender / phone_number_id
BRIQ_WEBHOOK_SECRET=…          # X-Briq-Signature HMAC secret
# NOTIFY_AUTO_DISPATCH=0
```

Local/dev without credentials: keep `NOTIFY_PROVIDER=stub`.

### Behaviour

- **SMS:** `POST /v1/message/send-instant` with one recipient per delivery; stores `briq:job:{job_id}` then upgrades to `briq:msg:{message_id}` on `sms.sent`.
- **WhatsApp:** `POST /v1/whatsapp/messages/text` — needs an open 24h window; cold outreach should use Briq **templates** (wire later if needed). Prefer SMS for church-wide Sunday reminders.
- **Webhooks:** verify `X-Briq-Signature: sha256=<hex>` over raw body. Handles `sms.sent` / `sms.delivered` / `sms.failed` / `sms.expired` (+ WhatsApp equivalents).

Register webhook URL in Briq developer app: `https://<your-host>/api/v1/webhooks/briq` (HTTPS required).

## Other adapters

| `NOTIFY_PROVIDER` | Use |
|---|---|
| `stub` | Fake send for local/UAT |
| `smsgate` | Real SMS via Android SMS Gateway (testing; RentFlow-compatible) |
| `briq` | Production Tanzania path |
| `http` | Generic JSON gateway (legacy/tests) |
