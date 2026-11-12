# 04 — Logical Entity Catalog

**Status:** Working baseline (MVP)  
**Companion:** `08_ERD.md`  
**Not:** migrations or Drizzle schemas  

Legend — **Mutability:** `M` mutable · `I` immutable after create · `A` append-only · `R` correct via reversal/history  
**Tenant:** `C` church-owned (`church_id`) · `G` global · `P` platform  
**Surface:** Admin / Member / Both (via RBAC)

Standard columns (unless noted): `id` UUIDv7, `created_at`, `updated_at`, `created_by`, `updated_by`; soft-archive `deleted_at` where marked.

---

## 1. Tenancy & identity

| Entity | Tenant | Module | Purpose | Key attributes | Uniqueness | Mutability | Admin | Member |
|---|---|---|---|---|---|---|---|---|
| Church | P/C | churches | Tenant | name, slug, timezone=`Africa/Dar_es_Salaam`, default_locale | slug global | M | platform/config | — |
| ChurchSettings | C | churches | Policies/locale flags | settings jsonb | 1 per church | M | Y | — |
| UserAccount | G | auth | Login identity | email?, phone_e164?, status | email/phone where set | M | support | self limited |
| Person | G | people | Human | display_name, full_name, dob?, preferred_locale, directory_opt_in, photo_media_id? | — | M | Y | self (locked fields) |
| OrganisationUser | C | auth | User↔church↔person | user_account_id, person_id?, status | (church, user) | M | Y | — |
| PersonContact | G* | people | Channels | person_id, channel, value, is_primary | (person, channel, value) | M | Y | self phone/email |
| MediaAsset | C | platform | File metadata | kind, storage_key, content_type | storage_key | I/M | Y | own photo |

\*Contact rows are not tenant-scoped; visibility is via church membership context.

---

## 2. Households

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| Household | C | label?, shared_address, emergency_contact_name/phone | — | M | DEC-019 |
| HouseholdMember | C | household_id, person_id, relationship, is_primary_contact | (household, person) | M | |
| HouseholdChild | C | household_id, name, age | — | M | Name+age only; not Person (DEC-016) |

---

## 3. Membership

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| Membership | C | person_id, household_id?, membership_type, status, effective_from/to | one current per (church, person) preferred | M+R | type: individual\|household\|family; status: visitor\|active\|inactive |
| MembershipApplication | C | person_id, household_id?, status | — | M | |
| MembershipDecision | C | application_id, decided_by, outcome, reason, decided_at | — | I | |
| MembershipStatusHistory | C | membership_id, from/to_status, changed_by, effective_at, reason | — | A | |

---

## 4. Organisation & leadership

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| OrganisationalUnit | C | parent_id?, kind, name, status | (church, kind, name) soft | M | kind: department\|ministry\|**life_group** (jumuiya / small group) |
| Programme | C | ministry_unit_id, name, status | — | M | Delivered by ministry |
| Position | C | code, title | (church, code) | M | |
| Appointment | C | position_id, person_id, unit_id?, effective_from/to, status | — | M+R | SP appoints/removes |
| AppointmentHistory | C | appointment_id, change_type, changed_by, reason | — | A | |
| Delegation | C | delegator_user_id, delegate_user_id, grants, effective_from/to, status, reason | — | M | SP away → Associate Pastor (DEC-033) |

---

## 5. Participation

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| ParticipationRequest | C | unit_id, person_id, status, decided_by? | one open per (unit, person) | M | Leader approves |
| Participation | C | unit_id, person_id, role_in_unit?, effective_from/to, status | one active per (unit, person) | M+R | Multi-ministry OK |
| ParticipationHistory | C | participation_id, from/to, changed_by | — | A | |

---

## 6. Events & attendance

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| EventType | C | code, name | (church, code) | M | Configurable (OQ-011) |
| Event | C | type_id, unit_id?, title, starts_at, ends_at, status | — | M | |
| EventRegistration | C | event_id, person_id, status | (event, person) | M | ≠ attendance |
| AttendanceSession | C | event_id, mode, status, recorded_at, finalized_at | — | M | mode headcount\|roll_call\|qr_mixed |
| AttendanceRecord | C | session_id, person_id, presence, source, checked_in_at, check_in_name?, check_in_phone? | (session, person) | M+R | Guest QR captures name+phone; match/create Person by phone |
| AttendanceSummary | C | session_id, men/women/children/visitors/total | 1 per session | M+R | Headcount / children’s ministry |
| SessionQrToken | C | session_id, token_hash, expires_at | — | M | Door/session QR |
| AttendanceDayAggregate | C | service_date, total_count, breakdown jsonb | (church, service_date) | M | Multi-service rollup |
| AttendanceCorrectionRequest | C | person_id, session_id, status, note | — | M | |
| AbsenceNotice | C | person_id, household_id?, service_date, event_id?, reason, status | — | M | Admin notified |

`qr_mixed`: named QR/manual records **plus** optional summary supplement (e.g. uncounted visitors/children). Pure headcount sessions: summary only. Pure roll_call: records only.

---

## 7. Projects

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| Project | C | unit_id?, fund_id?, budget_id?, name, goal, starts_on, ends_on, status, target_amount_minor? | — | M | May be money-linked |
| ProjectAssignment | C | project_id, person_id, role, status | (project, person) | M | |

---

## 8. Accounting & stewardship

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| Fund | C | code, name, fund_type, status | (church, code) | M | unrestricted\|restricted\|designated |
| Account | C | code, name, account_type, status | (church, code) | M | CoA |
| FiscalPeriod | C | name, starts_on, ends_on, status | no overlap open periods | M | open\|closed |
| JournalEntry | C | period_id, entry_number, entry_date, status, memo, payment_method?, reverses_entry_id? | (church, entry_number) | I when posted | draft\|posted\|reversed |
| JournalLine | C | entry_id, account_id, fund_id?, debit_minor, credit_minor, currency | — | I with entry | Balance invariant |
| DisbursementRequest | C | amount, purpose, status, journal_entry_id? | — | M | Needs approval |
| ApprovalRecord | C | disbursement_id, approver, decision, decided_at | — | I | |
| Budget | C | fund_id?, period_id, name | — | M | |
| BudgetLine | C | budget_id, account_id, amount_minor | (budget, account) | M | |
| Pledge | C | person_id?, household_id?, amount, due_on, status | — | M | open\|partial\|fulfilled\|cancelled |
| PledgeApplication | C | pledge_id, journal_entry_id, amount | — | I | Links receipt to pledge |
| PledgeFollowUp | C | pledge_id, user_id, note, followed_up_at | — | A | |

Money always integer minor units + currency (`TZS`).

---

## 9. Messaging & announcements

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| MessageTemplate | C | code, channel, locale, body | (church, code, channel, locale) | M | EN/SW |
| MessageJob | C | template_id?, channel, audience_type, status | — | M | bulk / trigger |
| MessageDelivery | C | job_id, person_id, channel, address, status | — | A/M status | queued\|sent\|failed |
| CommunicationPreference | C | person_id, sms/whatsapp/email_opt_in | (church, person) | M | Member editable |
| ConsentRecord | C | person_id, purpose, status, recorded_at | — | A/M | |
| Announcement | C | title, body, status, published_at | — | M | |
| AnnouncementAudience | C | announcement_id, audience_type, unit_id? | — | M | |

---

## 10. Import, RBAC, audit, platform

| Entity | Tenant | Key attributes | Uniqueness | Mutability | Notes |
|---|---|---|---|---|---|
| ImportJob | C | media_asset_id, job_type, status, started/finished | — | M | members_excel |
| ImportRowResult | C | job_id, row_number, status, payload, error_code | (job, row) | I | |
| Role | C | code, name | (church, code) | M | |
| Permission | P | code | code global | I | `resource:action` |
| RolePermission | C/P | role_id, permission_id | (role, permission) | M | |
| UserRoleAssignment | C | user_id, role_id, scope_type, unit_id?, effective_from/to | — | M | |
| AuditEvent | C | actor, action, entity_type, entity_id, metadata | — | A | Never delete |
| IdempotencyKey | C | key, request_hash, response_*, expires_at | (church, key) | I | |
| DomainEventOutbox | C | event_name, payload, status | — | A then M status | Future consumers |

---

## 11. Social-extension hooks (no MVP tables)

Stable IDs referenceable later via API: `Person`, `OrganisationalUnit`, `Event`, `Project`, consent/preferences, `MediaAsset`.  
Do not add Post/Friendship/Message/Reaction tables now.
