# 08 — Entity-Relationship Diagrams (Logical)

**Status:** Working baseline for MVP data design  
**Date:** 2026-11-07  
**Not:** physical Drizzle/SQL schema or migrations  

**Surfaces:** Church administration + Member portal share these entities; access differs by RBAC.  
**Identity:** `Person` is **global**; church link is via membership / org-user (OQ-020 → global).  
**CrossLife:** mock/fixtures only — no production seed (DEC-023).

Conventions:
- Every **church-owned** entity includes `church_id` (omitted from diagrams for readability unless central).
- Standard columns on most tables: `id` (UUIDv7), `created_at`, `updated_at`, `created_by`, `updated_by`; soft-archive `deleted_at` where policy says.
- Money: `amount_minor` bigint + `currency` (default `TZS`).
- History/correction: prefer append-only history or reversing entries — see algorithms doc (forthcoming).

---

## 1. Tenancy, auth, RBAC

```mermaid
erDiagram
  Church ||--o{ ChurchSettings : has
  Church ||--o{ OrganisationUser : includes
  UserAccount ||--o{ OrganisationUser : belongs
  UserAccount ||--o| Person : "may_link"
  UserAccount ||--o{ UserRoleAssignment : has
  Role ||--o{ UserRoleAssignment : granted
  Role ||--o{ RolePermission : bundles
  Permission ||--o{ RolePermission : included
  Church ||--o{ UserRoleAssignment : scoped_to
  OrganisationalUnit ||--o{ UserRoleAssignment : "optional_unit_scope"

  Church {
    uuid id PK
    string name
    string slug
    string timezone
    string default_locale
  }
  ChurchSettings {
    uuid id PK
    uuid church_id FK
    jsonb settings
  }
  UserAccount {
    uuid id PK
    string email
    string phone_e164
    string status
  }
  Person {
    uuid id PK
    string display_name
    string full_name
    date date_of_birth
    string preferred_locale
    boolean directory_opt_in
  }
  OrganisationUser {
    uuid id PK
    uuid church_id FK
    uuid user_account_id FK
    uuid person_id FK
    string status
  }
  Role {
    uuid id PK
    uuid church_id FK
    string code
    string name
  }
  Permission {
    uuid id PK
    string code
  }
  RolePermission {
    uuid role_id FK
    uuid permission_id FK
  }
  UserRoleAssignment {
    uuid id PK
    uuid church_id FK
    uuid user_account_id FK
    uuid role_id FK
    uuid organisational_unit_id FK
    string scope_type
    timestamptz effective_from
    timestamptz effective_to
  }
  Church ||--o{ Delegation : has
  UserAccount ||--o{ Delegation : delegator
  UserAccount ||--o{ Delegation : delegate
  Delegation {
    uuid id PK
    uuid church_id FK
    uuid delegator_user_id FK
    uuid delegate_user_id FK
    jsonb grants
    timestamptz effective_from
    timestamptz effective_to
    string status
  }
```

**Notes**
- `Permission.code` is global/stable (`people:read`, `journals:post`, …).
- `Role` is per-church (labels configurable); seed role codes documented in RBAC pack.
- Appointment / public title does **not** create `UserRoleAssignment`.
- `Delegation` = temporary SP powers (DEC-033); see `13_ANNOUNCEMENTS_AND_DELEGATION.md`.

---

## 2. People, contacts, households

```mermaid
erDiagram
  Person ||--o{ PersonContact : has
  Person ||--o{ HouseholdMember : member_of
  Household ||--o{ HouseholdMember : contains
  Household ||--o{ HouseholdChild : lists
  Church ||--o{ Household : owns
  MediaAsset ||--o| Person : "profile_photo"

  Person {
    uuid id PK
    string display_name
    string full_name
    string sex
    date date_of_birth
    string preferred_locale
    boolean directory_opt_in
    uuid photo_media_id FK
  }
  PersonContact {
    uuid id PK
    uuid person_id FK
    string channel
    string value
    boolean is_primary
  }
  Household {
    uuid id PK
    uuid church_id FK
    string label
    string shared_address
    string emergency_contact_name
    string emergency_contact_phone
  }
  HouseholdMember {
    uuid id PK
    uuid household_id FK
    uuid person_id FK
    string relationship
    boolean is_primary_contact
  }
  HouseholdChild {
    uuid id PK
    uuid household_id FK
    string name
    int age
  }
  MediaAsset {
    uuid id PK
    uuid church_id FK
    string kind
    string storage_key
    string content_type
  }
```

**Notes**
- `HouseholdChild`: **name + age only** — not a `Person`, no login (DEC-016).
- Full minor/guardian membership **deferred**.
- Contacts stored separately; phones E.164.

---

## 3. Membership lifecycle

```mermaid
erDiagram
  Church ||--o{ Membership : owns
  Person ||--o{ Membership : holds
  Household ||--o{ Membership : "optional_family"
  Membership ||--o{ MembershipStatusHistory : history
  Membership ||--o| MembershipApplication : from
  MembershipApplication ||--o{ MembershipDecision : decided_by

  Membership {
    uuid id PK
    uuid church_id FK
    uuid person_id FK
    uuid household_id FK
    string membership_type
    string status
    date effective_from
    date effective_to
  }
  MembershipApplication {
    uuid id PK
    uuid church_id FK
    uuid person_id FK
    uuid household_id FK
    string status
  }
  MembershipDecision {
    uuid id PK
    uuid application_id FK
    uuid decided_by_user_id FK
    string outcome
    string reason
    timestamptz decided_at
  }
  MembershipStatusHistory {
    uuid id PK
    uuid membership_id FK
    string from_status
    string to_status
    uuid changed_by_user_id FK
    timestamptz effective_at
    string reason
  }
```

**Notes**
- `membership_type`: `individual` | `household` | `family` (DEC-012).
- `status`: `visitor` | `active` | `inactive` (DEC-012).
- Approval actors: pastoral leadership + Administrator + GS/POGS.
- Status changes append `MembershipStatusHistory` (no silent overwrite).

---

## 4. Organisation: units, programmes, positions, appointments

```mermaid
erDiagram
  Church ||--o{ OrganisationalUnit : owns
  OrganisationalUnit ||--o{ OrganisationalUnit : parent
  OrganisationalUnit ||--o{ Programme : delivers
  Church ||--o{ Position : defines
  Position ||--o{ Appointment : filled_by
  Person ||--o{ Appointment : appointed
  OrganisationalUnit ||--o{ Appointment : "optional_unit"
  Appointment ||--o{ AppointmentHistory : history

  OrganisationalUnit {
    uuid id PK
    uuid church_id FK
    uuid parent_id FK
    string kind
    string name
    string status
  }
  Programme {
    uuid id PK
    uuid church_id FK
    uuid ministry_unit_id FK
    string name
    string status
  }
  Position {
    uuid id PK
    uuid church_id FK
    string code
    string title
  }
  Appointment {
    uuid id PK
    uuid church_id FK
    uuid position_id FK
    uuid person_id FK
    uuid organisational_unit_id FK
    date effective_from
    date effective_to
    string status
  }
  AppointmentHistory {
    uuid id PK
    uuid appointment_id FK
    string change_type
    uuid changed_by_user_id FK
    timestamptz changed_at
    string reason
  }
```

**Notes**
- `OrganisationalUnit.kind`: `department` (alias office) | `ministry` | **`life_group`** (small group / life group / jumuiya — same concept).
- Programme belongs to a **ministry** unit (DEC-011).
- Member profile layers: adult Person + account + membership + household + optional life_group participation + zero-or-more ministry participations.
- Senior Pastor appoints/removes leaders (DEC-008); appointments are effective-dated + history.

---

## 5. Ministry participation

```mermaid
erDiagram
  OrganisationalUnit ||--o{ ParticipationRequest : receives
  Person ||--o{ ParticipationRequest : requests
  OrganisationalUnit ||--o{ Participation : has
  Person ||--o{ Participation : joins
  Participation ||--o{ ParticipationHistory : history

  ParticipationRequest {
    uuid id PK
    uuid church_id FK
    uuid organisational_unit_id FK
    uuid person_id FK
    string status
    uuid decided_by_user_id FK
    timestamptz decided_at
  }
  Participation {
    uuid id PK
    uuid church_id FK
    uuid organisational_unit_id FK
    uuid person_id FK
    string role_in_unit
    date effective_from
    date effective_to
    string status
  }
  ParticipationHistory {
    uuid id PK
    uuid participation_id FK
    string from_status
    string to_status
    uuid changed_by_user_id FK
    timestamptz effective_at
  }
```

**Notes**
- Many-to-many: one person → many ministries (DEC-022).
- Approve: **that ministry’s leaders**; pastoral leadership gets notification/report (DEC-017).
- Typically `organisational_unit.kind = ministry`.

---

## 6. Events and attendance (DEC-031)

```mermaid
erDiagram
  Church ||--o{ EventType : configures
  Church ||--o{ Event : owns
  EventType ||--o{ Event : classifies
  OrganisationalUnit ||--o{ Event : "optional_host"
  Event ||--o{ EventRegistration : registrations
  Person ||--o{ EventRegistration : registers
  Event ||--o{ AttendanceSession : sessions
  AttendanceSession ||--o{ AttendanceRecord : named
  AttendanceSession ||--o| AttendanceSummary : headcount
  AttendanceSession ||--o| SessionQrToken : door_qr
  Person ||--o{ AttendanceRecord : present
  Person ||--o{ AttendanceCorrectionRequest : requests
  Person ||--o{ AbsenceNotice : notices
  Household ||--o{ AbsenceNotice : "optional"
  Church ||--o{ AttendanceDayAggregate : day_totals
  AttendanceDayAggregate ||--o{ AttendanceSession : includes

  EventType {
    uuid id PK
    uuid church_id FK
    string code
    string name
  }
  Event {
    uuid id PK
    uuid church_id FK
    uuid event_type_id FK
    uuid organisational_unit_id FK
    string title
    date service_date
    timestamptz starts_at
    timestamptz ends_at
    string status
  }
  EventRegistration {
    uuid id PK
    uuid event_id FK
    uuid person_id FK
    string status
  }
  AttendanceSession {
    uuid id PK
    uuid church_id FK
    uuid event_id FK
    string mode
    string status
    timestamptz recorded_at
    timestamptz finalized_at
  }
  AttendanceRecord {
    uuid id PK
    uuid session_id FK
    uuid person_id FK
    string presence
    string source
    timestamptz checked_in_at
    string check_in_name
    string check_in_phone
  }
  AttendanceSummary {
    uuid id PK
    uuid session_id FK
    int men_count
    int women_count
    int children_count
    int visitors_count
    int total_count
  }
  SessionQrToken {
    uuid id PK
    uuid session_id FK
    string token_hash
    timestamptz expires_at
  }
  AttendanceCorrectionRequest {
    uuid id PK
    uuid person_id FK
    uuid session_id FK
    string status
    string note
  }
  AbsenceNotice {
    uuid id PK
    uuid church_id FK
    uuid person_id FK
    uuid household_id FK
    date service_date
    uuid event_id FK
    string reason
    string status
  }
  AttendanceDayAggregate {
    uuid id PK
    uuid church_id FK
    date service_date
    int total_count
    jsonb breakdown
  }
```

**Notes**
- Registration ≠ attendance. Named attendance keys off **Person**, not UserAccount.
- Modes: `headcount` | `roll_call` | `qr_mixed` (DEC-031). QR source on `AttendanceRecord.source`.
- Multiple Sunday services → multiple sessions → **AttendanceDayAggregate**.
- Absence notices feed admin tracking; family views join household + records + children’s headcount.
- Children’s ministry sessions: headcount; only accepted unit leaders/teachers may record.

---

## 7. Projects

```mermaid
erDiagram
  Church ||--o{ Project : owns
  OrganisationalUnit ||--o{ Project : "optional_owner"
  Project ||--o{ ProjectAssignment : assigns
  Person ||--o{ ProjectAssignment : participates
  Fund ||--o{ Project : "optional_fund"
  Budget ||--o{ Project : "optional_budget"

  Project {
    uuid id PK
    uuid church_id FK
    uuid organisational_unit_id FK
    uuid fund_id FK
    uuid budget_id FK
    string name
    string goal
    date starts_on
    date ends_on
    string status
    bigint target_amount_minor
    string currency
  }
  ProjectAssignment {
    uuid id PK
    uuid project_id FK
    uuid person_id FK
    string role
    string status
  }
```

**Notes**
- Projects are time-bound (or ongoing) goal activities; may be money-linked (DEC-020).
- Distinct from ministry **programmes**.

---

## 8. Accounting, offerings, pledges

```mermaid
erDiagram
  Church ||--o{ Fund : owns
  Church ||--o{ Account : owns
  Church ||--o{ FiscalPeriod : owns
  Church ||--o{ JournalEntry : posts
  FiscalPeriod ||--o{ JournalEntry : constrains
  JournalEntry ||--o{ JournalLine : lines
  Account ||--o{ JournalLine : booked
  Fund ||--o{ JournalLine : tagged
  JournalEntry ||--o{ DisbursementRequest : "may_fulfil"
  DisbursementRequest ||--o{ ApprovalRecord : approvals
  UserAccount ||--o{ ApprovalRecord : approves
  Church ||--o{ Budget : owns
  Fund ||--o{ Budget : funds
  Account ||--o{ BudgetLine : lines
  Budget ||--o{ BudgetLine : has
  Person ||--o{ Pledge : pledges
  Household ||--o{ Pledge : "optional"
  Pledge ||--o{ PledgeFollowUp : follow_ups
  JournalEntry ||--o{ PledgeApplication : applies_to

  Fund {
    uuid id PK
    uuid church_id FK
    string code
    string name
    string fund_type
    string status
  }
  Account {
    uuid id PK
    uuid church_id FK
    string code
    string name
    string account_type
    string status
  }
  FiscalPeriod {
    uuid id PK
    uuid church_id FK
    string name
    date starts_on
    date ends_on
    string status
  }
  JournalEntry {
    uuid id PK
    uuid church_id FK
    uuid fiscal_period_id FK
    string entry_number
    date entry_date
    string status
    string memo
    string payment_method
    uuid reverses_entry_id FK
  }
  JournalLine {
    uuid id PK
    uuid journal_entry_id FK
    uuid account_id FK
    uuid fund_id FK
    bigint debit_minor
    bigint credit_minor
    string currency
  }
  DisbursementRequest {
    uuid id PK
    uuid church_id FK
    uuid journal_entry_id FK
    bigint amount_minor
    string currency
    string status
    string purpose
  }
  ApprovalRecord {
    uuid id PK
    uuid disbursement_request_id FK
    uuid approver_user_id FK
    string decision
    timestamptz decided_at
    string note
  }
  Budget {
    uuid id PK
    uuid church_id FK
    uuid fund_id FK
    uuid fiscal_period_id FK
    string name
  }
  BudgetLine {
    uuid id PK
    uuid budget_id FK
    uuid account_id FK
    bigint amount_minor
  }
  Pledge {
    uuid id PK
    uuid church_id FK
    uuid person_id FK
    uuid household_id FK
    bigint amount_minor
    string currency
    date due_on
    string status
  }
  PledgeApplication {
    uuid id PK
    uuid pledge_id FK
    uuid journal_entry_id FK
    bigint amount_minor
  }
  PledgeFollowUp {
    uuid id PK
    uuid pledge_id FK
    uuid user_id FK
    string note
    timestamptz followed_up_at
  }
```

**Notes**
- Double-entry: Σ debits = Σ credits per posted entry; posted entries immutable — reverse to correct.
- `payment_method` includes `cash` | `mobile_money` | `bank` | … — **no live wallet gateway** yet.
- Finance writers ≠ sole approvers for disbursements (DEC-013).
- Member portal: **no** finance/pledge admin access.
- Offering types map to income `Account`s (and/or fund tags), not a separate social product.

---

## 9. Messaging, announcements, consent

```mermaid
erDiagram
  Church ||--o{ MessageTemplate : owns
  Church ||--o{ MessageJob : sends
  MessageTemplate ||--o{ MessageJob : uses
  MessageJob ||--o{ MessageDelivery : deliveries
  Person ||--o{ MessageDelivery : recipient
  Person ||--o{ CommunicationPreference : prefers
  Person ||--o{ ConsentRecord : consents
  Church ||--o{ Announcement : publishes
  Announcement ||--o{ AnnouncementAudience : targets

  MessageTemplate {
    uuid id PK
    uuid church_id FK
    string code
    string channel
    string locale
    string body
  }
  MessageJob {
    uuid id PK
    uuid church_id FK
    uuid template_id FK
    string channel
    string audience_type
    string status
    uuid created_by_user_id FK
  }
  MessageDelivery {
    uuid id PK
    uuid message_job_id FK
    uuid person_id FK
    string channel
    string address
    string status
    timestamptz sent_at
  }
  CommunicationPreference {
    uuid id PK
    uuid person_id FK
    uuid church_id FK
    boolean sms_opt_in
    boolean whatsapp_opt_in
    boolean email_opt_in
  }
  ConsentRecord {
    uuid id PK
    uuid person_id FK
    uuid church_id FK
    string purpose
    string status
    timestamptz recorded_at
  }
  Announcement {
    uuid id PK
    uuid church_id FK
    string title
    string body
    string status
    timestamptz published_at
  }
  AnnouncementAudience {
    uuid id PK
    uuid announcement_id FK
    string audience_type
    uuid organisational_unit_id FK
  }
```

**Notes**
- Channels in MVP: **SMS** + **WhatsApp** (email optional later).
- Visitor thank-you: template + job triggered on visitor registration (consent-aware).
- No send without permitted preference/consent.

---

## 10. Import jobs

```mermaid
erDiagram
  Church ||--o{ ImportJob : runs
  UserAccount ||--o{ ImportJob : started_by
  ImportJob ||--o{ ImportRowResult : rows
  MediaAsset ||--o| ImportJob : source_file

  ImportJob {
    uuid id PK
    uuid church_id FK
    uuid created_by_user_id FK
    uuid media_asset_id FK
    string job_type
    string status
    timestamptz started_at
    timestamptz finished_at
  }
  ImportRowResult {
    uuid id PK
    uuid import_job_id FK
    int row_number
    string status
    jsonb payload
    string error_code
  }
```

**Notes**
- Admin-only; `job_type` e.g. `members_excel`.
- Flow: upload → validate → preview → commit; dedupe on phone/email within church.

---

## 11. Audit and idempotency

```mermaid
erDiagram
  Church ||--o{ AuditEvent : records
  UserAccount ||--o{ AuditEvent : actor
  Church ||--o{ IdempotencyKey : stores
  Church ||--o{ DomainEventOutbox : outbox

  AuditEvent {
    uuid id PK
    uuid church_id FK
    uuid actor_user_id FK
    string action
    string entity_type
    uuid entity_id
    jsonb metadata
    timestamptz occurred_at
  }
  IdempotencyKey {
    uuid id PK
    uuid church_id FK
    string key
    string request_hash
    int response_status
    jsonb response_body
    timestamptz expires_at
  }
  DomainEventOutbox {
    uuid id PK
    uuid church_id FK
    string event_name
    jsonb payload
    string status
    timestamptz created_at
  }
```

**Notes**
- `AuditEvent` is **append-only** (never update/delete).
- Outbox holds domain events for future social/webhooks; delivery later.
- Idempotency required for registrations, imports, message sends, journal posts, disbursements.

---

## 12. Cross-context overview

```mermaid
flowchart TB
  subgraph identity [Identity]
    UserAccount
    Person
    RBAC[Role_Permission]
  end
  subgraph churchOps [Church_ops]
    Membership
    OrgUnit[OrganisationalUnit]
    Participation
    Event
    Attendance
    Project
  end
  subgraph money [Accounting]
    Fund
    Journal
    Pledge
  end
  subgraph reach [Reach]
    MessageJob
    Announcement
  end
  Person --> Membership
  Person --> Participation
  OrgUnit --> Participation
  Event --> Attendance
  Project --> Fund
  Journal --> Fund
  Person --> Pledge
  Person --> MessageJob
```

---

## 13. Explicitly not on these ERDs (deferred)

- Branch / campus hierarchy  
- Full children’s safeguarding/check-in suite beyond headcount  
- Social graph (posts, friends, DMs, reactions, stories)  
- Mobile-money gateway / webhook settlement tables  
- Pastoral-care note store  

Future social app references `Person`, units, events, projects, consent via **API**, not shared tables — see forthcoming social extension map.

---

## 14. Related documents

| Doc | Purpose |
|---|---|
| `03_DATA_PHILOSOPHY.md` | Binding modelling principles |
| `04_LOGICAL_ENTITY_CATALOG.md` | Attributes, uniqueness, mutability per entity |
| `05_SOCIAL_EXTENSION_MAP.md` | Future social seams (no MVP tables) |
| `06_ACCOUNTING_MODULE.md` | Accounting / pledges specification |
| `07_MESSAGING_MODULE.md` | SMS / WhatsApp specification |
| `09_DOMAIN_LOGIC_AND_ALGORITHMS.md` | State machines + service algorithms |
| `10_API_ENDPOINT_MAP.md` | `/api/v1` routes citing permissions |
| `11_RBAC_AND_PERMISSIONS.md` | Roles × permissions × scopes |
