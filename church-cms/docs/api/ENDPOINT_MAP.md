# API endpoint map

Generated from `src/app/api/**/route.ts` (167 operations).

Regenerate: `pnpm openapi:generate`

| Method | Path | Tag | Auth |
|---|---|---|---|
| `GET` | `/api/v1/absence-notices` | Events & attendance | session |
| `POST` | `/api/v1/absence-notices` | Events & attendance | session |
| `GET` | `/api/v1/accounts` | Finance | session |
| `POST` | `/api/v1/accounts` | Finance | session |
| `GET` | `/api/v1/announcements` | Messaging | session |
| `POST` | `/api/v1/announcements` | Messaging | session |
| `POST` | `/api/v1/announcements/{id}/publish` | Messaging | session |
| `POST` | `/api/v1/announcements/{id}/reject` | Messaging | session |
| `POST` | `/api/v1/announcements/{id}/submit` | Messaging | session |
| `GET` | `/api/v1/appointment-requests` | Governance | session |
| `POST` | `/api/v1/appointment-requests` | Governance | session |
| `POST` | `/api/v1/appointment-requests/{id}/decision` | Governance | session |
| `GET` | `/api/v1/appointments` | Organisation | session |
| `POST` | `/api/v1/appointments` | Organisation | session |
| `POST` | `/api/v1/appointments/{id}/end` | Organisation | session |
| `GET` | `/api/v1/approval-requests` | Finance | session |
| `POST` | `/api/v1/approval-requests/{id}/decision` | Finance | session |
| `GET` | `/api/v1/attendance-sessions/{id}` | Events & attendance | session |
| `POST` | `/api/v1/attendance-sessions/{id}/check-in` | Events & attendance | session |
| `POST` | `/api/v1/attendance-sessions/{id}/finalize` | Events & attendance | session |
| `POST` | `/api/v1/attendance-sessions/{id}/qr` | Events & attendance | session |
| `GET` | `/api/v1/attendance-sessions/{id}/records` | Events & attendance | session |
| `POST` | `/api/v1/attendance-sessions/{id}/records` | Events & attendance | session |
| `PUT` | `/api/v1/attendance-sessions/{id}/summary` | Events & attendance | session |
| `POST` | `/api/v1/attendance/check-ins` | Events & attendance | public |
| `GET` | `/api/v1/attendance/correction-requests` | Events & attendance | session |
| `POST` | `/api/v1/attendance/correction-requests` | Events & attendance | session |
| `POST` | `/api/v1/attendance/correction-requests/{id}/resolve` | Events & attendance | session |
| `GET` | `/api/v1/attendance/family` | Events & attendance | session |
| `GET` | `/api/v1/attendance/me` | Events & attendance | session |
| `GET` | `/api/v1/attendance/stats/leadership` | Events & attendance | session |
| `GET` | `/api/v1/audit-events` | Access & ops | session |
| `POST` | `/api/v1/auth/active-church` | Auth | session |
| `POST` | `/api/v1/auth/login` | Auth | public |
| `POST` | `/api/v1/auth/logout` | Auth | public |
| `GET` | `/api/v1/auth/me` | Auth | session |
| `POST` | `/api/v1/auth/mfa/send-otp` | Auth | public |
| `POST` | `/api/v1/auth/mfa/verify` | Auth | public |
| `GET` | `/api/v1/budgets` | Finance | session |
| `POST` | `/api/v1/budgets` | Finance | session |
| `GET` | `/api/v1/budgets/{id}` | Finance | session |
| `GET` | `/api/v1/churches/current` | Access & ops | session |
| `PATCH` | `/api/v1/churches/current` | Access & ops | session |
| `GET` | `/api/v1/churches/current/settings` | Access & ops | session |
| `PATCH` | `/api/v1/churches/current/settings` | Access & ops | session |
| `GET` | `/api/v1/communication-preferences/me` | Messaging | session |
| `PUT` | `/api/v1/communication-preferences/me` | Messaging | session |
| `GET` | `/api/v1/delegations` | Organisation | session |
| `POST` | `/api/v1/delegations` | Organisation | session |
| `POST` | `/api/v1/delegations/{id}/revoke` | Organisation | session |
| `GET` | `/api/v1/directory` | People | session |
| `GET` | `/api/v1/event-types` | Events & attendance | session |
| `POST` | `/api/v1/event-types` | Events & attendance | session |
| `GET` | `/api/v1/events` | Events & attendance | session |
| `POST` | `/api/v1/events` | Events & attendance | session |
| `GET` | `/api/v1/events/{id}` | Events & attendance | session |
| `PATCH` | `/api/v1/events/{id}` | Events & attendance | session |
| `GET` | `/api/v1/events/{id}/attendance-sessions` | Events & attendance | session |
| `POST` | `/api/v1/events/{id}/attendance-sessions` | Events & attendance | session |
| `GET` | `/api/v1/events/{id}/registrations` | Events & attendance | session |
| `POST` | `/api/v1/events/{id}/registrations` | Events & attendance | session |
| `DELETE` | `/api/v1/events/{id}/registrations/me` | Events & attendance | session |
| `POST` | `/api/v1/expenses` | Finance | session |
| `POST` | `/api/v1/expenses/{id}/post` | Finance | session |
| `POST` | `/api/v1/expenses/{id}/submit` | Finance | session |
| `POST` | `/api/v1/exports` | Access & ops | session |
| `GET` | `/api/v1/financial-years` | Finance | session |
| `POST` | `/api/v1/financial-years` | Finance | session |
| `POST` | `/api/v1/financial-years/{id}/close` | Finance | session |
| `GET` | `/api/v1/funds` | Finance | session |
| `POST` | `/api/v1/funds` | Finance | session |
| `GET` | `/api/v1/funds/{id}` | Finance | session |
| `GET` | `/api/v1/households` | People | session |
| `POST` | `/api/v1/households` | People | session |
| `GET` | `/api/v1/households/{id}` | People | session |
| `PATCH` | `/api/v1/households/{id}` | People | session |
| `POST` | `/api/v1/households/{id}/children` | People | session |
| `POST` | `/api/v1/households/{id}/members` | People | session |
| `GET` | `/api/v1/imports/{id}` | Access & ops | session |
| `POST` | `/api/v1/imports/{id}/commit` | Access & ops | session |
| `GET` | `/api/v1/imports/{id}/preview` | Access & ops | session |
| `POST` | `/api/v1/imports/{id}/validate` | Access & ops | session |
| `POST` | `/api/v1/imports/members` | Access & ops | session |
| `POST` | `/api/v1/journals` | Finance | session |
| `GET` | `/api/v1/journals/{id}` | Finance | session |
| `POST` | `/api/v1/journals/{id}/post` | Finance | session |
| `POST` | `/api/v1/journals/{id}/reverse` | Finance | session |
| `GET` | `/api/v1/media/{id}` | Access & ops | session |
| `GET` | `/api/v1/media/{id}/content` | Access & ops | session |
| `POST` | `/api/v1/media/uploads` | Access & ops | session |
| `GET` | `/api/v1/meeting-minutes` | Governance | session |
| `POST` | `/api/v1/meeting-minutes` | Governance | session |
| `GET` | `/api/v1/membership-applications` | Membership | session |
| `POST` | `/api/v1/membership-applications` | Membership | session |
| `POST` | `/api/v1/membership-applications/{id}/decision` | Membership | session |
| `GET` | `/api/v1/memberships` | Membership | session |
| `POST` | `/api/v1/memberships` | Membership | session |
| `GET` | `/api/v1/memberships/{id}` | Membership | session |
| `PATCH` | `/api/v1/memberships/{id}` | Membership | session |
| `POST` | `/api/v1/memberships/{id}/status` | Membership | session |
| `GET` | `/api/v1/memberships/{id}/status-history` | Membership | session |
| `GET` | `/api/v1/memberships/me` | Membership | session |
| `GET` | `/api/v1/message-jobs` | Messaging | session |
| `POST` | `/api/v1/message-jobs` | Messaging | session |
| `GET` | `/api/v1/message-jobs/{id}` | Messaging | session |
| `GET` | `/api/v1/message-jobs/{id}/deliveries` | Messaging | session |
| `POST` | `/api/v1/message-jobs/{id}/dispatch` | Messaging | session |
| `GET` | `/api/v1/message-templates` | Messaging | session |
| `POST` | `/api/v1/message-templates` | Messaging | session |
| `GET` | `/api/v1/offerings` | Finance | session |
| `POST` | `/api/v1/offerings` | Finance | session |
| `POST` | `/api/v1/offerings/{id}/post` | Finance | session |
| `GET` | `/api/v1/organisational-units` | Organisation | session |
| `POST` | `/api/v1/organisational-units` | Organisation | session |
| `GET` | `/api/v1/organisational-units/{id}` | Organisation | session |
| `GET` | `/api/v1/organisational-units/{id}/participations` | Organisation | session |
| `POST` | `/api/v1/organisational-units/{id}/participations` | Organisation | session |
| `GET` | `/api/v1/organisational-units/{id}/programmes` | Organisation | session |
| `POST` | `/api/v1/organisational-units/{id}/programmes` | Organisation | session |
| `POST` | `/api/v1/participation-requests` | Ministries | session |
| `POST` | `/api/v1/participation-requests/{id}/decision` | Ministries | session |
| `GET` | `/api/v1/participation-requests/me` | Ministries | session |
| `POST` | `/api/v1/participations/{id}/end` | Ministries | session |
| `GET` | `/api/v1/people` | People | session |
| `POST` | `/api/v1/people` | People | session |
| `GET` | `/api/v1/people/{id}` | People | session |
| `PATCH` | `/api/v1/people/{id}` | People | session |
| `POST` | `/api/v1/people/{id}/contacts` | People | session |
| `GET` | `/api/v1/people/me` | People | session |
| `PATCH` | `/api/v1/people/me` | People | session |
| `GET` | `/api/v1/platform/access/summary` | Platform | platform |
| `GET` | `/api/v1/platform/audit-events` | Platform | platform |
| `GET` | `/api/v1/platform/churches` | Platform | platform |
| `POST` | `/api/v1/platform/churches` | Platform admin | create church + first admin (DEC-032); PIN returned once |
| `GET` | `/api/v1/platform/churches/{id}` | Platform | platform |
| `GET` | `/api/v1/platform/growth` | Platform | platform |
| `GET` | `/api/v1/platform/health` | Platform | platform |
| `POST` | `/api/v1/platform/metrics/snapshot` | Platform | platform |
| `GET` | `/api/v1/platform/operators` | Platform | platform |
| `POST` | `/api/v1/platform/operators` | Platform | platform |
| `GET` | `/api/v1/platform/overview` | Platform | platform |
| `GET` | `/api/v1/platform/security-findings` | Platform | platform |
| `POST` | `/api/v1/platform/security-findings` | Platform | platform |
| `PATCH` | `/api/v1/platform/security-findings/{id}` | Platform | platform |
| `POST` | `/api/v1/platform/tenants/{id}/enter` | Platform | platform |
| `GET` | `/api/v1/pledges` | Finance | session |
| `POST` | `/api/v1/pledges` | Finance | session |
| `POST` | `/api/v1/pledges/{id}/applications` | Finance | session |
| `POST` | `/api/v1/pledges/{id}/follow-ups` | Finance | session |
| `GET` | `/api/v1/pledges/unpaid` | Finance | session |
| `GET` | `/api/v1/positions` | Organisation | session |
| `POST` | `/api/v1/positions` | Organisation | session |
| `GET` | `/api/v1/projects` | Finance | session |
| `POST` | `/api/v1/projects` | Finance | session |
| `GET` | `/api/v1/projects/{id}` | Finance | session |
| `POST` | `/api/v1/projects/{id}/assignments` | Finance | session |
| `POST` | `/api/v1/projects/{id}/contributions` | Finance | session |
| `POST` | `/api/v1/projects/{id}/interest` | Finance | session |
| `POST` | `/api/v1/projects/interest-requests/{id}/decision` | Finance | session |
| `GET` | `/api/v1/reports` | Governance | session |
| `GET` | `/api/v1/reports/{reportId}` | Governance | session |
| `GET` | `/api/v1/role-assignments` | Access & ops | session |
| `POST` | `/api/v1/role-assignments` | Access & ops | session |
| `DELETE` | `/api/v1/role-assignments/{id}` | Access & ops | session |
| `GET` | `/api/v1/roles` | Access & ops | session |
| `GET` | `/api/v1/saved-reports` | Governance | session |
| `POST` | `/api/v1/saved-reports` | Governance | session |
| `POST` | `/api/v1/saved-reports/{id}/run` | Governance | session |
