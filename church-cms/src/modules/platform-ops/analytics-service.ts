import type { PlatformCtx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writePlatformAudit } from '@/platform/audit';
import { assertPlatformAnalyticsRead } from './policies';
import * as repo from './repository';
import * as analyticsRepo from './analytics-repository';
import type { AnalyticsQuery } from './analytics-schemas';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Aggregate-only platform analytics. No finance, PII, or Restricted fields.
 */
export async function getAnalyticsReport(
  ctx: PlatformCtx,
  query: AnalyticsQuery,
) {
  assertPlatformAnalyticsRead(ctx);
  const db = getDb();
  const since = daysAgo(query.days);
  const since7d = daysAgo(7);

  const [
    churchesTotal,
    peopleTotal,
    membershipsActive,
    checkins7d,
    messages7d,
    failedJobs7d,
    authFailures7d,
    exportsSince,
    roleAssignsSince,
    lifecycle,
    applications,
    provisioning,
    supportCases,
    activeSupportSessions,
    findingsBySeverity,
    registrationsInWindow,
    seriesChurches,
    seriesPeople,
    seriesMemberships,
  ] = await Promise.all([
    repo.countChurches(db),
    repo.countPeople(db),
    repo.countActiveMemberships(db),
    repo.countAttendanceCheckinsSince(db, since7d),
    repo.countMessageDeliveriesSince(db, since7d),
    repo.countFailedMessageJobsSince(db, since7d),
    repo.countAuthFailureAuditsSince(db, since7d),
    repo.countExportsSince(db, since),
    repo.countRoleAssignAuditsSince(db, since),
    analyticsRepo.countChurchesByLifecycle(db),
    analyticsRepo.countRegistrationApplicationsByStatus(db),
    analyticsRepo.countProvisioningByStatus(db),
    analyticsRepo.countSupportCasesByStatus(db),
    analyticsRepo.countActiveSupportSessions(db),
    analyticsRepo.countFindingsBySeverity(db),
    analyticsRepo.countRegistrationsSince(db, since),
    repo.listMetricSeries(db, 'churches_total', since.toISOString().slice(0, 10)),
    repo.listMetricSeries(db, 'people_total', since.toISOString().slice(0, 10)),
    repo.listMetricSeries(
      db,
      'memberships_active',
      since.toISOString().slice(0, 10),
    ),
  ]);

  await writePlatformAudit(db, ctx, {
    action: 'platform.analytics.read',
    entityType: 'platform',
    metadata: { days: query.days },
  });

  return {
    days: query.days,
    privacy: {
      note: 'Aggregate counts only. No giving, pastoral notes, national IDs, or children’s data.',
    },
    adoption: {
      churchesTotal,
      peopleTotal,
      membershipsActive,
      attendanceCheckins7d: checkins7d,
      messagesSent7d: messages7d,
    },
    lifecycle,
    registrationFunnel: {
      applicationsByStatus: applications,
      provisioningByStatus: provisioning,
      applicationsInWindow: registrationsInWindow,
    },
    security: {
      openFindingsBySeverity: findingsBySeverity,
      authFailures7d,
      exportsInWindow: exportsSince,
      roleAssignAuditsInWindow: roleAssignsSince,
    },
    operations: {
      failedMessageJobs7d: failedJobs7d,
      supportCasesByStatus: supportCases,
      activeSupportSessions,
    },
    series: {
      churches_total: seriesChurches.map((r) => ({
        date: String(r.snapshotDate),
        value: r.value,
      })),
      people_total: seriesPeople.map((r) => ({
        date: String(r.snapshotDate),
        value: r.value,
      })),
      memberships_active: seriesMemberships.map((r) => ({
        date: String(r.snapshotDate),
        value: r.value,
      })),
    },
  };
}
