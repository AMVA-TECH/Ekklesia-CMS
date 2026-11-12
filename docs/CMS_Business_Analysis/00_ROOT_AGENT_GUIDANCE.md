# Root Agent Guidance — Church Management System

## 1. Mission

Build a reliable, secure, reusable Church Management System for multiple churches. CrossLife Mission Network is the first pilot/case study, not the product's permanent identity or the only organisational model.

The immediate task is business analysis and requirements validation. Do not jump into implementation or invent business rules to fill gaps.

## 2. First-release product definition

The first release has two connected experiences:

### A. Church Administration
Authorised administrators and leaders manage the church's configured structure and day-to-day operations:
- Organisation profile and settings.
- Organisational units, departments, ministries and life groups.
- Leadership positions, appointments and responsibilities.
- People, households and membership.
- Visitor follow-up and membership applications.
- Events, services, registrations and attendance.
- Projects and participation/volunteering.
- Announcements and basic member communication.
- User accounts, roles, scoped permissions, reports and audit.

### B. Member Portal
A member-facing self-service experience:
- View/update permitted personal profile details.
- View household/family relationships where authorised.
- View membership information and status.
- Discover church ministries and life groups.
- Request to join a ministry or group and track the request.
- Discover events, register and view event information.
- View personal attendance and participation history.
- View church announcements.
- Discover projects and volunteering opportunities.

### C. Future community application — not first release
A later, separately scoped but integrated social/community application may include:
- Social feed, member posts, comments, reactions.
- Member connections/friendships.
- Direct and group messaging.
- Stories, media sharing and rich group communities.
- Social discovery and engagement notifications.

Do not build these social features in the first release. Do not add speculative social tables or complex social permissions to the first-release schema. Instead, preserve integration-ready foundations: stable person/member identity, organisation tenancy, group membership, event and project references, media/document abstraction where justified, API boundaries, consent and notification preferences.

## 3. Analysis-first rules

Before implementation:
1. Establish the actual business process.
2. Identify actors and authority.
3. Define trigger, preconditions, main flow, alternate flows, exceptions and postconditions.
4. Identify records created/updated and history/audit requirements.
5. Identify business rules and policy variations.
6. Define permissions and scope.
7. Define acceptance criteria.
8. Trace the requirement to a stakeholder, evidence source or explicit product decision.
9. Mark unresolved items OPEN rather than guessing.

## 4. Multi-church design rules

- Every church is an organisation/tenant.
- Organisation-specific settings and structures are data/configuration, not hard-coded enums where variability is expected.
- A single person may have more than one appointment or participate in several units.
- The same person may belong to different churches in future; decide whether identity is global or tenant-scoped during architecture discovery. Do not assume.
- CrossLife currently has no branches. Do not implement branch-management workflows, dashboards or reports in the pilot MVP.
- Future organisational hierarchy may be supported by a generic unit/relationship model, but do not expose branch complexity prematurely.
- Separate product-wide roles from church-specific assignments and scoped authority.
- Do not assume all churches use the same membership categories, approval chain, titles, ministry model or attendance policy.

## 5. Security and privacy

- Apply organisation/tenant isolation to every request and data access path.
- Use least privilege and scoped access.
- Separate role assignment from organisational appointment.
- Protect sensitive pastoral/care records with stricter permissions and access auditing.
- Provide consent and communication preferences.
- Avoid exposing member phone numbers, addresses, family details or attendance to other members by default.
- Support moderation and safeguarding as future social-app requirements, but do not build social-network functionality now.
- Record important administrative actions in an audit trail.
- Never use attendance analytics to imply spiritual worth or automatically punish members.

## 6. Engineering guidance once analysis is approved

- Prefer a modular, well-separated architecture over premature microservices.
- Keep business rules in application/domain services, not UI-only checks.
- Use explicit status transitions and validation.
- Preserve immutable/auditable records for important historical actions; use correction/reversal rather than destructive edits where appropriate.
- Make commands that may be retried idempotent.
- Use pagination, filtering and search for growing member/event lists.
- Design APIs around stable domain capabilities.
- Do not create migrations until the conceptual model and business rules have been reviewed and approved.
- Do not implement unapproved assumptions as if they were requirements.

## 7. Definition of analysis-ready

A process is ready for implementation only when:
- Business owner and actor responsibilities are identified.
- Trigger, preconditions, flow, exceptions and postconditions are defined.
- Statuses and transition rules are defined.
- Data inputs/outputs and ownership are known.
- Permission scope is defined.
- Acceptance criteria are testable.
- Open policy decisions are resolved or explicitly excluded from the release.

## 8. Working with these documents

Treat these documents as a controlled working baseline, not immutable truth. Update the decision log when decisions change. Maintain requirement IDs and traceability. When evidence conflicts, show the conflict and ask for validation.
