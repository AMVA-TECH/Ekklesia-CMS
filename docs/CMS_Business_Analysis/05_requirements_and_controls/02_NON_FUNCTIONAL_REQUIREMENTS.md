# Non-Functional Requirements

These are proposed baseline requirements. Confirm measurable targets before procurement or production release.

## Security
- NFR-SEC-001: All application traffic shall use encrypted transport.
- NFR-SEC-002: Passwords shall be stored using a modern adaptive password hashing algorithm if password authentication is used.
- NFR-SEC-003: Server-side authorisation shall enforce tenant, role and scope restrictions.
- NFR-SEC-004: Sensitive operations shall be auditable.
- NFR-SEC-005: Secrets shall not be committed to source control.
- NFR-SEC-006: Administrative sessions shall support secure expiry and revocation.

## Privacy
- NFR-PRI-001: Personal data shall be visible only to authorised users for legitimate purposes.
- NFR-PRI-002: Member directory exposure shall be configurable and privacy-preserving by default.
- NFR-PRI-003: Children/minors' data shall receive additional safeguards.
- NFR-PRI-004: Communication preferences and consent shall be respected.
- NFR-PRI-005: Sensitive pastoral/care records shall be separately restricted if introduced.

## Reliability and integrity
- NFR-REL-001: Important lifecycle changes shall preserve history.
- NFR-REL-002: Retried requests shall not create duplicate registrations or transactions.
- NFR-REL-003: Data validation shall occur on the server.
- NFR-REL-004: Backup, restore and disaster-recovery objectives shall be defined before production.

## Usability and accessibility
- NFR-USE-001: Member portal shall be mobile-first and responsive.
- NFR-USE-002: Common tasks shall use clear, understandable language.
- NFR-USE-003: Forms shall validate inputs and explain errors.
- NFR-USE-004: Interfaces shall support keyboard navigation and accessible contrast.
- NFR-USE-005: The product should support English and Swahili if confirmed as a pilot requirement.

## Performance and operations
- NFR-PERF-001: Agree measurable response-time targets for key workflows before release.
- NFR-PERF-002: Member, event and attendance lists shall support pagination and filtering.
- NFR-OPS-001: Application errors and security-relevant events shall be logged.
- NFR-OPS-002: Operational monitoring and support ownership shall be documented.
- NFR-OPS-003: Data export and tenant offboarding procedures shall be defined.
