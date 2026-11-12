import type { Db } from '@/platform/db/client';
import * as repo from './repository';

/**
 * Rule-based security detectors (v1 — no ML).
 * Upserts open findings for Security Center.
 */
export async function runSecurityDetectors(db: Db): Promise<{ upserted: number }> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let upserted = 0;

  const authFailures = await repo.countAuthFailureAuditsSince(db, since24h);
  if (authFailures >= 10) {
    await repo.upsertFinding(db, {
      detectorKey: 'auth.failure_burst_24h',
      severity: authFailures >= 50 ? 'critical' : 'high',
      category: 'auth',
      title: `Auth failure burst: ${authFailures} in 24h`,
      evidence: { authFailures, windowHours: 24 },
    });
    upserted += 1;
  }

  const failedJobs = await repo.countFailedMessageJobsSince(db, since24h);
  if (failedJobs >= 3) {
    await repo.upsertFinding(db, {
      detectorKey: 'notify.job_failures_24h',
      severity: failedJobs >= 20 ? 'high' : 'medium',
      category: 'availability',
      title: `Message job failures: ${failedJobs} in 24h`,
      evidence: { failedJobs, windowHours: 24 },
    });
    upserted += 1;
  }

  const roleChurn = await repo.countRoleAssignAuditsSince(db, since24h);
  if (roleChurn >= 15) {
    await repo.upsertFinding(db, {
      detectorKey: 'access.role_churn_24h',
      severity: 'medium',
      category: 'access',
      title: `Elevated role assignment activity: ${roleChurn} in 24h`,
      evidence: { roleChurn, windowHours: 24 },
    });
    upserted += 1;
  }

  const exportsN = await repo.countExportsSince(db, since24h);
  if (exportsN >= 20) {
    await repo.upsertFinding(db, {
      detectorKey: 'data.export_volume_24h',
      severity: 'high',
      category: 'data',
      title: `High export volume: ${exportsN} in 24h`,
      evidence: { exportsN, windowHours: 24 },
    });
    upserted += 1;
  }

  return { upserted };
}
