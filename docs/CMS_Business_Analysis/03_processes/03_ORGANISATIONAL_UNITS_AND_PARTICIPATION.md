# Organisational Units and Participation Model

## 1. Why classification matters

Churches use terms differently. A product that assumes all units are “ministries” will fail to represent offices, departments, life groups, teams, committees, projects and programmes accurately.

## 2. Proposed unit concepts

| Concept | Working definition | Typical lifecycle |
|---|---|---|
| Office | Governance or leadership responsibility | Established, assigned, vacant, retired |
| Department | Ongoing operational function | Draft, active, suspended, archived |
| Ministry | Ongoing service/discipleship function | Draft, active, suspended, archived |
| Life group | Smaller fellowship/community group | Forming, active, paused, closed |
| Team | People assigned to deliver a function | Forming, active, dissolved |
| Committee | Delegated decision/advisory body | Constituted, active, dissolved |
| Programme | Structured activity over a period | Planned, active, completed |
| Project | Time-bounded initiative with outcomes | Proposed, approved, active, completed, cancelled |
| Event | Time-bound gathering/activity | Draft, published, completed, cancelled |

These definitions are proposed; CrossLife's terminology must be validated.

## 3. Unit attributes

Potential attributes:
- Organisation ID.
- Name and optional code.
- Unit category.
- Purpose/description.
- Status.
- Parent unit (optional).
- Effective start/end dates.
- Visibility/discoverability.
- Participation eligibility.
- Approval policy reference.
- Contact details.
- Responsible leader(s).
- Created/updated metadata.

## 4. Participation is separate from membership

A person can be a church member without belonging to a ministry. A person may participate in several ministries/groups, and a non-member may be allowed to attend an open event or programme if policy permits.

Participation should have:
- Person/member reference.
- Unit reference.
- Participation role (member, volunteer, leader, coordinator, etc.).
- Status (requested, pending, active, paused, ended, declined).
- Start/end dates.
- Approval/decision details where required.
- History and audit trail.

## 5. Multiple roles and appointments

A person may hold more than one leadership appointment. One unit may have multiple leaders. Avoid a single `leader_id` column as the only representation if co-leadership or deputy roles are possible.

## 6. Questions to resolve

- Can people join more than one life group?
- Can a visitor join a ministry?
- Who approves joining?
- Can a member leave without approval?
- Can leaders invite people directly?
- Are there capacity limits?
- Can groups be private, hidden or open?
- Can a unit have sub-units?
- Are leaders also ordinary participants in their unit?
