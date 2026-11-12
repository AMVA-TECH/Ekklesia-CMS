# Product Scope and Release Boundaries

## 1. Product vision

A configurable Church Management System that helps churches organise their structure, manage people and membership, coordinate activities, and give members a useful self-service experience. It must support different church governance and operating models without forcing every church into CrossLife's structure.

## 2. Product experiences

### 2.1 Administration experience — first release

| Capability | First-release scope |
|---|---|
| Organisation setup | Church identity, contact details, operating settings |
| Structure | Offices, departments, ministries, life groups and other configured units |
| Governance | Positions, appointments, responsibilities and reporting relationships where validated |
| People | Person records, contacts, households/families |
| Membership | Applications, review, approval, status, history |
| Visitors | Visitor capture and follow-up |
| Ministries/groups | Setup, leaders, membership requests, participation |
| Events/services | Calendar, event details, registration, assignments |
| Attendance | Session-based attendance and reporting |
| Projects | Project setup, member participation and volunteer assignment |
| Communication | Announcements and targeted basic notifications |
| Security | Accounts, roles, permissions, scope assignments |
| Oversight | Operational reports, audit history and exports |

### 2.2 Member portal — first release

| Capability | First-release scope |
|---|---|
| Profile | View and update permitted personal details |
| Household | View permitted family links and request corrections |
| Membership | View own membership status and relevant milestones |
| Directory | Discover people only if church policy permits; privacy by default |
| Ministries/groups | Discover, request to join, see approved participation |
| Events | Discover, register/cancel within policy, view event details |
| Attendance | View own attendance history and request correction |
| Projects | Discover projects, express interest, volunteer where enabled |
| Announcements | View relevant church announcements |
| Notifications | Receive operational updates and registration/approval outcomes |

### 2.3 Future community application — deferred

The future social application may include a church-wide feed, member-generated posts, comments, reactions, member connections, direct messages, group chats, stories, media sharing and richer community interaction.

**Release rule:** These capabilities are not part of the first release. They must not delay core administration or membership workflows.

## 3. Integration-ready foundations

The first release should make sensible provision for future integration without implementing the social product:
- Stable organisation, person, member, unit/group, event and project identifiers.
- Well-defined API boundaries and access scopes.
- Reusable identity and authentication.
- Consent and communication preferences.
- Notification abstraction.
- Secure document/media metadata abstraction only where first-release needs justify it.
- Audit events for sensitive changes.
- Clear distinction between member profile data and public/community profile data.

Do not create speculative feed, friendship, comment, reaction or messaging tables in the first-release data model.

## 4. Explicit exclusions from first release

- Facebook-like social feed.
- Friend/follow graph.
- Direct and group chat.
- Stories and ephemeral media.
- User-generated social posts and comments.
- Reactions and sharing mechanics.
- Live streaming.
- Public social discovery.
- Complex branch administration for CrossLife pilot.
- Advanced accounting unless separately approved.
- Payroll/HR unless separately approved.
- Online giving/payment gateway unless validated as a pilot requirement.
- Automated spiritual or pastoral scoring.

## 5. Product vs pilot

**Reusable product capability:** configurable organisational units, appointments, member records, membership workflows, event/attendance management, scoped access.

**CrossLife pilot configuration:** CrossLife's actual titles, units, approval authorities, membership categories, event types and operational policies after validation.

Do not encode pilot-specific labels or approval chains as universal product rules.

## 6. Release sequencing

1. Discovery and validation.
2. Organisation and access foundation.
3. People, households and membership.
4. Organisational structure and leadership.
5. Ministries/life groups and participation.
6. Events, services and attendance.
7. Projects and volunteering.
8. Announcements and member portal.
9. Reports, audit, security hardening and pilot acceptance.
10. Future social application discovery and separate product specification.
