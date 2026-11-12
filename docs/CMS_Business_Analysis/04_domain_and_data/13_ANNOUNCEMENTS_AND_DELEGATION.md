# 13 — Announcements & Senior Pastor Delegation

**Status:** MVP working baseline  
**Closes:** OQ-015 (announcements) · adds DEC-032, DEC-033

---

## 1. Announcements (DEC-032)

### 1.1 Lifecycle

```
draft → pending_approval → published → archived
         ↘ rejected
```

Urgent pastoral alerts may use a `publish_direct` path for SP / pastoral only (still audited).

### 1.2 Who can create / publish

| Role | Create draft | Submit for approval | Publish / approve | Target scope |
|---|---|---|---|---|
| Senior Pastor | Y | Y | Y (direct or approve) | Church-wide or any unit |
| Pastoral leadership | Y | Y | Y (direct or approve) | Church-wide or any unit |
| Church Admin | Y | Y | Approve if policy allows; else submit | Church-wide / units |
| POGS | Y | Y | No (default) | As admin policy |
| Announcer | Y | Y | No | Church-wide or assigned |
| Ministry / life-group leader | Y | Y | **Own unit only** if `announcements:publish` scoped; else submit | Own unit |
| Member | No | No | No | — |

**MVP default:**  
- Unit leaders may **publish to their own unit** without extra approval.  
- **Church-wide** announcements require approval by SP, pastoral leadership, or Church Admin.  
- All publishes audited.

### 1.3 Targeting (`AnnouncementAudience`)

| audience_type | Meaning |
|---|---|
| `all_members` | Active memberships (church-wide) — needs church-wide publish right |
| `organisational_unit` | One ministry / life_group / department |
| `role` | Optional later (e.g. all leaders) |
| `custom` | Out of MVP |

Channels: in-app announcement feed; optional SMS/WhatsApp blast via `MessageJob` if sender has `messages:bulk_send` and recipients opted in.

### 1.4 Member visibility

Members see published announcements targeted to them (all_members or their units). No draft/pending visibility.

---

## 2. Delegation when Senior Pastor is away (DEC-033)

### 2.1 Intent

Website baseline: Associate Pastor assumes pastoral leadership continuity when Head Pastor is absent. Model this as **Delegation**, not a permanent title change.

### 2.2 Entity (logical)

`Delegation`:
- `church_id`
- `delegator_user_id` (normally SP)
- `delegate_user_id` (normally Associate Pastor account)
- `permission_set` or `role_codes_granted` (subset of SP powers)
- `effective_from` / `effective_to` (null end = until revoked)
- `status`: `scheduled` | `active` | `ended` | `revoked`
- `reason`

### 2.3 Default grant while active

Delegate receives (scoped church-wide), unless narrowed:
- Membership approve  
- Announcement church-wide publish  
- Disbursement approve (still dual-control with finance)  
- Appointments: **optional** — default **no** (only SP appoints leaders unless SP explicitly includes it)  
- Role assign: default **no**  
- Finance journal post: default **no**

### 2.4 Standing rule (configurable)

Church may set: “Associate Pastor auto-delegated for pastoral approvals when SP marks unavailable / date range.”  
MVP: admin/SP creates Delegation record with dates; system activates by calendar.

### 2.5 Audit

Start, end, revoke, and every action taken under delegation logged with `acting_as_delegate_of=sp_user_id`.
