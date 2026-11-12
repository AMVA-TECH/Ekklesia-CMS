# Access Control — Starter Matrix

**Superseded for MVP baseline:** use [`../04_domain_and_data/11_RBAC_AND_PERMISSIONS.md`](../04_domain_and_data/11_RBAC_AND_PERMISSIONS.md) as the working authority for roles, permissions, scopes and segregation rules. The matrix below remains as early discovery context only.

This is a discovery baseline, not a final permission grant. Actual roles and authority must be approved by the church.

| Capability | Platform operator | Church admin | Unit leader | Registrar | Event recorder | Member |
|---|---:|---:|---:|---:|---:|---:|
| Manage tenant subscription/onboarding | Yes | No | No | No | No | No |
| Configure church profile | Support | Yes | No | No | No | No |
| Configure organisational units | No | Yes | Scoped if delegated | No | No | No |
| Define leadership positions | No | Yes/approved authority | No | No | No | No |
| Record appointments | No | Scoped | No | No | No | No |
| View all people records | No | Restricted | Scoped | Scoped | No | No |
| Register person/visitor | No | Yes | Scoped if delegated | Yes | No | No |
| Decide membership | No | As delegated | No | As delegated | No | No |
| Manage own profile | No | Support only | No | No | No | Yes |
| Manage unit participation | No | Yes | Own unit | No | No | Request only |
| Create/publish event | No | Yes | Scoped | No | No | No |
| Register for event | No | No | No | No | No | Yes |
| Record attendance | No | Yes | Scoped | No | Assigned events | No/optional self-check-in |
| Manage project volunteers | No | Yes | Scoped | No | No | Request/participate |
| Publish announcement | No | Yes | Scoped | No | No | No |
| View audit logs | Platform audit only | Scoped | Own unit where appropriate | No | No | No |

## Rules

- Platform operator access must not imply routine access to church pastoral/member content.
- Church administrators should not automatically see every sensitive field.
- Unit leaders should see only the information needed to manage their unit.
- A role is a bundle of permissions; scope determines where it applies.
- One user may have multiple roles/scopes.
- Leadership appointment does not automatically grant system permissions.
- Member self-service is restricted to the authenticated person's own records unless an explicit guardian/delegate policy applies.
- Build permission checks on the server and test cross-tenant access denial.
