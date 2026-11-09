/**
 * Core (Stage 1–2) schema barrel used for migrations.
 * Stage 3+ draft tables remain under src/modules/* but are NOT exported here
 * until their stage gate opens (see docs/STAGE_GATES.md).
 */
export { churches, churchSettings } from '@/modules/churches/db-schema';
export {
  people,
  personContacts,
  userAccounts,
  organisationUsers,
} from '@/modules/people/db-schema';
export {
  households,
  householdMembers,
  householdChildren,
} from '@/modules/households/db-schema';
export {
  memberships,
  membershipApplications,
  membershipDecisions,
  membershipStatusHistory,
} from '@/modules/membership/db-schema';
export {
  permissions,
  roles,
  rolePermissions,
  userRoleAssignments,
} from '@/modules/access-control/db-schema';
export {
  mediaAssets,
  auditEvents,
  idempotencyKeys,
  domainEventOutbox,
} from '@/modules/platform/db-schema';
