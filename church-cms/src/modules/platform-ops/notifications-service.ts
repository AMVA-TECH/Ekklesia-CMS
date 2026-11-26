import type { PlatformCtx } from '@/platform/auth';
import { hasPlatformPermission } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { assertPlatformRead } from './policies';
import * as regRepo from './registration-repository';
import * as supportRepo from './support-repository';

export type PlatformNotificationItem = {
  id: string;
  kind:
    | 'application_review'
    | 'provisioning_failed'
    | 'incident_open';
  title: string;
  body: string;
  href: string;
  createdAt: string;
  tone: 'info' | 'warning' | 'danger';
};

export type PlatformNotificationsResult = {
  unreadCount: number;
  summary: {
    applicationsPending: number;
    provisioningFailed: number;
    incidentsOpen: number;
  };
  items: PlatformNotificationItem[];
};

/**
 * Operator attention queue for the platform notification bell.
 * Built from live evidence (applications, provisioning, open incidents).
 */
export async function getPlatformNotifications(
  ctx: PlatformCtx,
): Promise<PlatformNotificationsResult> {
  assertPlatformRead(ctx);
  const db = getDb();
  const items: PlatformNotificationItem[] = [];

  const canApps =
    hasPlatformPermission(ctx, 'platform:applications_review') ||
    hasPlatformPermission(ctx, 'platform:applications_decide') ||
    hasPlatformPermission(ctx, 'platform:admin');

  let applicationsPending = 0;
  let provisioningFailed = 0;

  if (canApps) {
    const [pendingCount, pendingRows, failedCount, failedRows] =
      await Promise.all([
        regRepo.countApplicationsByStatuses(db, [
          'submitted',
          'email_verified',
          'under_review',
        ]),
        regRepo.listApplicationsNeedingReview(db, 8),
        regRepo.countFailedProvisioning(db),
        regRepo.listFailedProvisioning(db, 5),
      ]);

    applicationsPending = pendingCount;
    provisioningFailed = failedCount;

    if (pendingCount > 0) {
      items.push({
        id: 'apps-queue',
        kind: 'application_review',
        title:
          pendingCount === 1
            ? '1 church application needs verification'
            : `${pendingCount} church applications need verification`,
        body: 'Open the guided KYC queue to review and decide.',
        href: '/platform/churches/applications',
        createdAt: new Date().toISOString(),
        tone: 'warning',
      });
    }

    for (const row of pendingRows) {
      items.push({
        id: `app-${row.id}`,
        kind: 'application_review',
        title: row.officialName,
        body: `${row.status.replace(/_/g, ' ')} · ${row.representativeName}`,
        href: `/platform/churches/applications/${row.id}`,
        createdAt: row.createdAt.toISOString(),
        tone: row.emailVerifiedAt ? 'info' : 'warning',
      });
    }

    if (failedCount > 0) {
      items.push({
        id: 'provision-failed',
        kind: 'provisioning_failed',
        title:
          failedCount === 1
            ? '1 provisioning run failed'
            : `${failedCount} provisioning runs failed`,
        body: 'Retry from the application’s provisioning step.',
        href: '/platform/churches/applications',
        createdAt: new Date().toISOString(),
        tone: 'danger',
      });
      for (const row of failedRows) {
        items.push({
          id: `prov-${row.id}`,
          kind: 'provisioning_failed',
          title: 'Provisioning failed',
          body: row.errorMessage?.slice(0, 120) ?? 'Unknown error',
          href: `/platform/churches/applications/${row.applicationId}`,
          createdAt: row.updatedAt.toISOString(),
          tone: 'danger',
        });
      }
    }
  }

  let incidentsOpen = 0;
  const canSupport =
    hasPlatformPermission(ctx, 'platform:support_cases') ||
    hasPlatformPermission(ctx, 'platform:admin');

  if (canSupport) {
    try {
      const openCases = await supportRepo.listSupportCases(db, {
        status: 'open',
        limit: 5,
      });
      incidentsOpen = openCases.length;
      if (openCases.length > 0) {
        items.push({
          id: 'incidents-open',
          kind: 'incident_open',
          title:
            openCases.length === 1
              ? '1 open incident'
              : `${openCases.length} open incidents`,
          body: 'Acknowledge or resolve from the incidents queue.',
          href: '/platform/incidents',
          createdAt: new Date().toISOString(),
          tone: 'warning',
        });
        for (const c of openCases.slice(0, 3)) {
          items.push({
            id: `case-${c.id}`,
            kind: 'incident_open',
            title: c.title,
            body: `${c.severity} · ${c.caseNumber}`,
            href: '/platform/incidents',
            createdAt: c.createdAt.toISOString(),
            tone:
              c.severity === 'critical' || c.severity === 'high'
                ? 'danger'
                : 'warning',
          });
        }
      }
    } catch {
      // Support tables may be unavailable — skip quietly.
    }
  }

  return {
    unreadCount:
      applicationsPending + provisioningFailed + incidentsOpen,
    summary: {
      applicationsPending,
      provisioningFailed,
      incidentsOpen,
    },
    items,
  };
}
