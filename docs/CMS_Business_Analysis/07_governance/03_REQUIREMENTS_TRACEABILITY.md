# Requirements Traceability Starter

| Requirement family | Business process | Conceptual entities | Acceptance tests | Validation source |
|---|---|---|---|---|
| Organisation setup | ORG-001 | Organisation, OrganisationSetting, OrganisationUser | Tenant onboarding and isolation | Product decision + pilot admin |
| Unit configuration | ORG-002 | OrganisationalUnit, UnitCategory, UnitRelationship | Unit creation and scope tests | CrossLife organogram workshop |
| Leadership | GOV-001/002 | Position, Appointment, ApprovalRule | Appointment authority and history | Governance workshop |
| People | PPL-001/002 | Person, PersonContact, Household | Duplicate and privacy tests | Registrar/welcome team |
| Membership | MEM-001/002/003 | Membership, Application, Decision, StatusHistory | Approval and status tests | Membership policy owner |
| Participation | MIN-001/002 | Unit, ParticipationRequest, Participation | Join/leave and access tests | Ministry/life-group leaders |
| Events | EVT-001/002 | Event, Registration, EventAssignment | Publish/register/cancel tests | Event coordinators |
| Attendance | ATT-001/002 | AttendanceSession, AttendanceRecord, Summary | Duplicate/correction/privacy tests | Service/event teams |
| Projects | PRJ-001/002 | Project, VolunteerRequest, ProjectAssignment | Volunteer approval tests | Project coordinators |
| Announcements | COM-001 | Announcement, AudienceDefinition, Notification | Audience and delivery tests | Communications owner |
| Member portal | MP-001..015 | Person, Membership, Unit, Event, Attendance | Member self-service tests | Member representatives |
| Social app (future) | Separate future catalogue | Not in first-release schema | Separate future test plan | Future product discovery |

Update this matrix whenever requirements, processes, entities or decisions change. Every implementation task should trace to an approved requirement or an explicitly approved technical enabler.
