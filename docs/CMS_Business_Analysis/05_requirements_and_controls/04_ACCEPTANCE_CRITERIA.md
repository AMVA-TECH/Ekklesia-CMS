# Representative Acceptance Criteria

## Membership application
- Given a person with an eligible record, when they submit a complete application, then the system records a pending application and timestamp.
- Given an application is pending, when an authorised reviewer requests more information, then the status changes and the applicant is notified through an enabled channel.
- Given an application is approved by the configured authority, then membership becomes active on the approved effective date and the decision is auditable.
- A user without membership-decision permission cannot approve an application.

## Ministry/group participation
- Given a unit is active and discoverable, an eligible member can view its details.
- Given a member submits a join request, the system records a pending request and prevents an unintended duplicate.
- Given an authorised leader approves, participation becomes active and the member receives an outcome.
- A leader cannot approve requests for a unit outside their scope unless separately authorised.

## Event registration
- A member can register only while registration is open and eligibility rules are satisfied.
- Capacity limits are enforced consistently under concurrent requests.
- Cancellation follows the event's configured deadline/policy.
- Registration does not create an attendance record.

## Attendance
- Only authorised recorders can submit attendance for their assigned scope.
- Duplicate check-ins are prevented or flagged.
- Corrections preserve who changed the record, when and why.
- Members can view only their own individual attendance history.

## Tenant isolation
- A user from Organisation A cannot read, modify or infer private records belonging to Organisation B.
- Tenant isolation is enforced at API/service/data layers, not merely by UI filtering.
