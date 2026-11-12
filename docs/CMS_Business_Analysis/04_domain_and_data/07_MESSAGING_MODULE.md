# 07 — Messaging Module (SMS & WhatsApp)

**Status:** MVP working specification  
**Channels in MVP:** SMS, WhatsApp (email optional later)  
**ERD:** `08_ERD.md` §9 · **Algorithms:** `09` §7–8 · **RBAC:** `messages:*`, `templates:*`

## 1. Purpose

Admin-side reach to members with consent awareness: transactional (visitor thank-you) and bulk (announcements, reminders).

WhatsApp “dashboard” = admin UI over the same `MessageJob` / `MessageDelivery` model — not a separate product.

## 2. Entities

| Entity | Role |
|---|---|
| MessageTemplate | code, channel, locale (en/sw), body |
| MessageJob | bulk or triggered send; audience_type; status |
| MessageDelivery | per-recipient status: queued \| sent \| failed |
| CommunicationPreference | sms/whatsapp/email opt-in per person×church |
| ConsentRecord | purpose-level consent history |
| Announcement | in-app/church board content (may also trigger message job) |

## 3. Features

1. **Templates** — EN + SW; codes e.g. `visitor_thank_you`, `pledge_reminder`, `announcement_blast`.
2. **Visitor thank-you SMS** — on visitor registration; enqueue job if policy/consent allows.
3. **Bulk SMS / WhatsApp** — audience: all active members | ministry unit | event registrants.
4. **Delivery log** — provider status; retry policy provider-specific.
5. **Preference self-service** — members manage opt-in via portal (`preferences:self`).
6. **Rate limits** — strict on bulk; audit with counts (no full phone lists in logs).

## 4. Consent rules

- No marketing/bulk send without channel opt-in.
- Transactional visitor thank-you: allowed once under church policy; record consent/preference touch.
- Restricted: never put giving amounts or pastoral notes in SMS/WhatsApp bodies.

## 5. Job lifecycle

```
draft|queued → sending → completed|partial_failed|failed
```

Each delivery updates independently. Idempotency-Key on create job API.

## 6. Provider abstraction

`channel` + outbound adapter interface (SMS provider, WhatsApp Business API).  
Config via env; no provider secrets in DB.  
Validate provider webhooks (signatures) when used.

## 7. Permissions

| Action | Permission |
|---|---|
| Manage templates | `templates:write` |
| Single/triggered send | `messages:send` |
| Bulk send | `messages:bulk_send` |
| Own preferences | `preferences:self` |

## 8. Out of MVP

- Weekly automated “Bible verse” campaigns (can use templates later).
- Member-initiated chat / WhatsApp inbox as social messaging.
- Email as required channel (optional adapter only).
