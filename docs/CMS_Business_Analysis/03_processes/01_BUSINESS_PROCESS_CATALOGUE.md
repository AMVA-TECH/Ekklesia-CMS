# Business Process Catalogue

All flows below are PROPOSED starting points. Validate them with the pilot church before treating them as approved.

## Process specification convention

Each process must document:
- ID, name, objective and scope.
- Trigger.
- Primary actor and supporting actors.
- Preconditions.
- Main success flow.
- Alternate flows and exceptions.
- Business rules.
- Postconditions.
- Records created/updated.
- Permissions and approval requirements.
- Notifications.
- Audit events.
- Acceptance criteria.
- Open questions.

## Catalogue

| ID | Process | Primary actor | Release |
|---|---|---|---|
| ORG-001 | Create/configure church organisation | Platform operator / church admin | Core |
| ORG-002 | Configure organisational units | Church administrator | Core |
| GOV-001 | Define leadership position | Authorised administrator | Core |
| GOV-002 | Appoint/change office holder | Appointing authority | Core |
| PPL-001 | Register person | Administrator / authorised registrar | Core |
| PPL-002 | Register visitor and follow up | Welcome team / authorised user | Core |
| MEM-001 | Submit membership application | Applicant / registrar | Configurable |
| MEM-002 | Review and decide membership | Authorised membership approver | Configurable |
| MEM-003 | Change membership status | Authorised administrator | Core |
| MIN-001 | Establish ministry/department/group | Authorised leader/admin | Core |
| MIN-002 | Request and approve participation | Member / unit leader | Core |
| EVT-001 | Create and publish event/service | Event organiser | Core |
| EVT-002 | Register for event | Member | Core |
| ATT-001 | Record attendance | Attendance recorder | Core |
| ATT-002 | Correct attendance record | Authorised recorder/admin | Core |
| PRJ-001 | Create project/opportunity | Project coordinator | Core |
| PRJ-002 | Volunteer/participate in project | Member / coordinator | Core |
| COM-001 | Publish announcement | Authorised communicator | Core |
| ACC-001 | Create account and assign access | Church administrator | Core |
| DAT-001 | Resolve duplicate/correct person data | Data steward/admin | Core |

## BP-ORG-001 — Create/configure church organisation

**Objective:** Establish a tenant and its initial settings.

**Trigger:** A church is onboarded to the product.

**Actors:** Platform operator; church owner/administrator.

**Preconditions:** Church has been authorised for onboarding; a designated initial administrator is known.

**Main flow:**
1. Platform operator creates organisation record.
2. System assigns unique organisation identifier.
3. Initial church administrator is invited.
4. Administrator verifies access.
5. Administrator configures church identity, locale, timezone, contact information and policy settings.
6. Administrator reviews default roles and permissions.
7. Organisation is activated.

**Exceptions:** Duplicate organisation; invitation not accepted; incomplete required settings; onboarding cancelled.

**Postconditions:** Active tenant exists; initial administrator has scoped access; audit record exists.

**Data implications:** Organisation, settings, organisation-user relationship, invitation, audit event.

**Open:** Who approves new church tenants? What settings are mandatory?

## BP-ORG-002 — Configure organisational unit

**Objective:** Represent a church office, department, ministry, life group, team, committee or programme.

**Trigger:** An authorised user creates or changes a unit.

**Actors:** Church administrator; authorised leader.

**Preconditions:** Organisation is active; actor has unit-configuration permission.

**Main flow:**
1. Actor selects unit category.
2. Enters name, purpose, description, status and effective date.
3. Optionally links the unit to a parent unit.
4. Assigns initial leader/manager if authorised.
5. Defines visibility and participation rules.
6. Saves and publishes according to church policy.

**Exceptions:** Duplicate name; invalid parent relationship; unauthorised category; unit has active participants and cannot be archived without a transition plan.

**Postconditions:** Unit exists with history; eligible users can discover it according to visibility settings.

**Data:** OrganisationalUnit, UnitCategory, UnitRelationship, UnitLeaderAssignment, AuditEvent.

## BP-GOV-002 — Appoint or replace office holder

**Objective:** Record a person's appointment to a defined leadership position.

**Trigger:** Appointment approved by the church's authorised authority.

**Actors:** Appointing authority; administrator; appointee.

**Preconditions:** Position exists; person record exists; appointment authority is verified.

**Main flow:**
1. Administrator selects position and person.
2. Records appointment start/end dates, appointment type and source/approval reference.
3. System checks for conflicting active appointments where configured.
4. Authorised approver confirms.
5. Appointment becomes active on effective date.
6. Previous appointment is ended where replacement applies.
7. Relevant permissions are assigned separately according to access policy.
8. Audit history is retained.

**Exceptions:** Appointment rejected; appointee declines; overlapping appointment; authority unclear; effective date in future.

**Postconditions:** Appointment history is recorded. Permission assignment is not inferred solely from title.

**Data:** Position, Appointment, AppointmentHistory, ApprovalDecision, UserRoleAssignment, AuditEvent.

## BP-PPL-001 — Register person

**Objective:** Create a reliable person record without forcing immediate account creation.

**Trigger:** A visitor, attendee, applicant or member is registered.

**Actors:** Registrar; person; optionally household representative.

**Preconditions:** Actor has permission; organisation is selected.

**Main flow:**
1. Search for an existing person using permitted matching fields.
2. If a likely match exists, verify before creating a new record.
3. Capture minimum required personal and contact details.
4. Record source, consent and preferred contact method where applicable.
5. Optionally associate household/family relationships.
6. Save person record.
7. Assign a person/member lifecycle classification only when supported by policy.
8. Offer account invitation separately if appropriate.

**Exceptions:** Possible duplicate; person declines optional data; child/minor registration requires guardian handling; insufficient authority to create record.

**Postconditions:** Person record exists; no login account is implied.

**Data:** Person, PersonContact, Household, HouseholdMember, ConsentRecord, AuditEvent.

## BP-MEM-001 — Submit membership application

**Objective:** Allow an eligible person to request formal membership where the church uses an application process.

**Trigger:** Person selects “Apply for membership” or an authorised registrar initiates an application.

**Actors:** Applicant; registrar.

**Preconditions:** Person record exists or can be created; membership applications are enabled.

**Main flow:**
1. Applicant reviews membership information and requirements.
2. Applicant submits required information and declarations.
3. System records submission date and current application status.
4. Registrar receives a task/notification.
5. Applicant can view application status if authenticated and policy permits.

**Exceptions:** Incomplete application; duplicate pending application; applicant withdraws; church does not require formal application.

**Postconditions:** Application is submitted and auditable.

**Data:** MembershipApplication, ApplicationStatusHistory, ConsentRecord, FollowUpTask.

## BP-MEM-002 — Review and decide membership

**Objective:** Review an application and record an authorised decision.

**Trigger:** New or resubmitted application enters review queue.

**Actors:** Membership reviewer; designated approver; applicant.

**Preconditions:** Application is submitted; reviewer has permission.

**Main flow:**
1. Reviewer checks required information.
2. Reviewer records review outcome or requests further information.
3. If policy requires, application is escalated to an approver.
4. Approver approves, rejects or defers.
5. On approval, membership record is created/activated with effective date.
6. Applicant is notified through permitted channel.
7. Decision and history are retained.

**Exceptions:** Missing information; conflicting records; applicant withdraws; approval authority unavailable; rejection appeal process if one exists.

**Postconditions:** Application has final or pending status; membership is changed only by authorised decision.

**Data:** MembershipApplication, Membership, MembershipDecision, MembershipStatusHistory, AuditEvent.

## BP-MIN-002 — Request to join ministry/life group

**Objective:** Enable a member to request participation in a unit.

**Trigger:** Member submits a join request from member portal or authorised administrator records request.

**Actors:** Member; unit leader; administrator if required.

**Preconditions:** Unit is active and discoverable; member is eligible; request policy allows joining.

**Main flow:**
1. Member views unit description and participation requirements.
2. Member submits request and optional message.
3. System records pending request.
4. Unit leader/reviewer assesses eligibility/capacity.
5. Reviewer approves, rejects or requests more information.
6. System records participation with effective date when approved.
7. Member is notified.
8. Access to unit-specific member information is granted only within configured scope.

**Exceptions:** Unit closed; capacity reached; duplicate request; member no longer eligible; request withdrawn.

**Postconditions:** Request and decision history retained; participation is active only after approval where required.

**Data:** ParticipationRequest, Participation, ParticipationHistory, Notification, AuditEvent.

## BP-EVT-001 — Create and publish event/service

**Objective:** Create an event with clear ownership, audience and attendance expectations.

**Trigger:** Authorised organiser proposes an event.

**Actors:** Event organiser; approver if required; venue coordinator.

**Preconditions:** Actor can create events; event type exists.

**Main flow:**
1. Organiser enters title, purpose, event type, dates, venue/online details.
2. Organiser defines audience, registration rules and capacity if applicable.
3. Organiser assigns responsible unit and event team.
4. System validates date/time and required fields.
5. Event is submitted for approval if policy requires.
6. Once approved, event is published.
7. Relevant members are notified.

**Exceptions:** Conflicting venue; invalid dates; event rejected; event cancelled/rescheduled.

**Postconditions:** Event is published or remains draft/pending; changes are audited.

**Data:** Event, EventType, Venue, EventAssignment, EventAudience, ApprovalDecision.

## BP-EVT-002 — Register for event

**Objective:** Let a member reserve a place when registration is enabled.

**Trigger:** Member selects register.

**Actors:** Member; event organiser.

**Preconditions:** Event is published; registration is open; member meets eligibility.

**Main flow:**
1. Member views event details and requirements.
2. Member submits registration.
3. System checks eligibility, duplicate registration and capacity.
4. Registration is confirmed or waitlisted according to policy.
5. Member receives confirmation.
6. Member may cancel within allowed period.

**Exceptions:** Registration closed; capacity reached; duplicate registration; event cancelled; member not eligible.

**Postconditions:** Registration status and history recorded. Registration does not count as attendance.

**Data:** EventRegistration, RegistrationStatusHistory, Notification.

## BP-ATT-001 — Record attendance

**Objective:** Record actual participation at a service/event.

**Trigger:** Attendance session opens or event concludes.

**Actors:** Attendance recorder; event organiser; member where self-check-in is enabled.

**Preconditions:** Event exists; recorder has permission; attendance method is configured.

**Main flow:**
1. Recorder selects event/session.
2. System loads eligible person list or enables authorised check-in.
3. Recorder records individual attendance or aggregate headcount according to event policy.
4. System validates duplicate check-ins and session boundaries.
5. Recorder reviews and submits.
6. Attendance becomes recorded/locked according to policy.
7. Reports update.

**Exceptions:** Person missing from list; duplicate scan; offline capture; wrong event/session; correction required.

**Postconditions:** Attendance record or aggregate is stored with recorder and timestamp.

**Data:** AttendanceSession, AttendanceRecord, AttendanceSummary, AuditEvent.

## BP-PRJ-002 — Volunteer for project

**Objective:** Allow members to express interest and be assigned to a church project.

**Trigger:** Member selects a published opportunity.

**Actors:** Member; project coordinator; volunteer supervisor.

**Preconditions:** Project is open; member is eligible; participation rules are visible.

**Main flow:**
1. Member views project details, dates and requirements.
2. Member submits interest/volunteer request.
3. Coordinator reviews request and suitability.
4. Coordinator approves, declines or requests information.
5. Approved member is assigned a role/task.
6. Member receives assignment details.
7. Participation/completion is recorded.

**Exceptions:** Project closed; capacity reached; safeguarding or eligibility requirement not met; member withdraws.

**Postconditions:** Request, assignment and participation history are retained.

**Data:** Project, VolunteerRequest, ProjectAssignment, ParticipationRecord, AuditEvent.

## BP-COM-001 — Publish announcement

**Objective:** Publish an authorised operational communication to a defined audience.

**Trigger:** Authorised communicator creates announcement.

**Actors:** Communicator; approver if required; recipients.

**Preconditions:** Actor has communication permission; audience can be resolved.

**Main flow:**
1. Author enters title, content, urgency and publication window.
2. Selects audience (whole church or authorised scope).
3. System previews audience count and channel.
4. Approval occurs if policy requires.
5. Announcement is published.
6. In-app notification or configured channel is dispatched.
7. Delivery status is recorded where supported.

**Exceptions:** Invalid audience; approval rejected; delivery failure; announcement withdrawn or corrected.

**Postconditions:** Announcement and delivery history retained.

**Data:** Announcement, AudienceDefinition, Notification, MessageDelivery, AuditEvent.
