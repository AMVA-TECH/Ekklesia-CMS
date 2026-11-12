/**
 * Schema barrel used for migrations and the DB client.
 * See docs/STAGE_GATES.md for stage status.
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
  importJobs,
  importRowResults,
  auditEvents,
  idempotencyKeys,
  domainEventOutbox,
} from '@/modules/platform/db-schema';
export {
  organisationalUnits,
  programmes,
  positions,
  appointments,
  appointmentHistory,
  delegations,
} from '@/modules/organisation/db-schema';
export {
  participationRequests,
  participations,
  participationHistory,
} from '@/modules/ministries/db-schema';
export {
  eventTypes,
  events,
  eventRegistrations,
  attendanceSessions,
  attendanceRecords,
  attendanceSummaries,
  sessionQrTokens,
  attendanceDayAggregates,
  attendanceCorrectionRequests,
  absenceNotices,
} from '@/modules/events/db-schema';
export {
  accounts,
  financialYears,
  funds,
  journals,
  journalLines,
  offerings,
  pledges,
  pledgeApplications,
  pledgeFollowUps,
  expenses,
  budgets,
  budgetLines,
  projects,
  projectAssignments,
  projectContributions,
  projectInterestRequests,
  approvalRequests,
  approvalActions,
} from '@/modules/finance/db-schema';
export {
  messageTemplates,
  announcements,
  announcementAudiences,
  messageJobs,
  messageDeliveries,
  communicationPreferences,
  consentRecords,
} from '@/modules/messaging/db-schema';
export {
  appointmentRequests,
  meetingMinutes,
  savedReports,
} from '@/modules/governance/db-schema';
export {
  user,
  session,
  account,
  verification,
  twoFactor,
} from '@/platform/auth/db-schema';
export {
  platformOperators,
  platformAuditEvents,
  securityFindings,
  platformMetricSnapshots,
} from '@/modules/platform-ops/db-schema';
