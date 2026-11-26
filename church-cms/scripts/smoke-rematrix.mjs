#!/usr/bin/env node
/**
 * Rematrix smoke: dry-run compare bootstrap roles vs platform templates.
 * Set APPLY_REMATRIX=1 to apply with confirm:true (audited) then re-compare.
 *
 * Usage:
 *   pnpm db:smoke:rematrix
 *   APPLY_REMATRIX=1 pnpm db:smoke:rematrix
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  /* optional */
}

process.env.ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH || '1';

const churchId = '11111111-1111-1111-1111-111111111111';
const adminUserId = 'cccccccc-0001-0001-0001-000000000001';
const apply = process.env.APPLY_REMATRIX === '1';

async function main() {
  const { resetEnvCache } = await import('../src/platform/config/env.ts');
  resetEnvCache();

  const { listChurchPermissionCatalogue } = await import(
    '../src/modules/access-control/permission-catalogue.ts'
  );
  const { compareRoleTemplates, applyRoleTemplates } = await import(
    '../src/modules/access-control/service.ts'
  );

  const permissions = new Set([
    'roles:read',
    'roles:assign',
    ...listChurchPermissionCatalogue().map((p) => p.code),
  ]);

  const ctx = {
    churchId,
    requestId: 'smoke_rematrix',
    locale: 'en',
    actor: { userAccountId: adminUserId, personId: null },
    permissions,
  };

  const before = await compareRoleTemplates(ctx, {});
  console.log('SMOKE_REMATRIX_COMPARE', before.meta, {
    roles: before.data.map((r) => ({
      code: r.code,
      status: r.status,
      added: r.added.length,
      removed: r.removed.length,
    })),
  });

  if (!apply) {
    console.log(
      'SMOKE_REMATRIX_OK',
      'dry-run only — set APPLY_REMATRIX=1 to apply template baselines',
    );
    return;
  }

  const applied = await applyRoleTemplates(ctx, { confirm: true });
  const after = await compareRoleTemplates(ctx, {});
  // applyRoleTemplates updates existing roles only — missing codes stay missing.
  if (after.meta.driftCount !== 0) {
    throw new Error(`rematrix left drift=${after.meta.driftCount}`);
  }
  const stillMissing = after.data.filter((r) => r.status === 'missing');
  if (stillMissing.length > 0) {
    console.warn(
      'SMOKE_REMATRIX_WARN',
      'templates with no church role (not created by rematrix):',
      stillMissing.map((r) => r.code),
    );
  }

  const adminRow = after.data.find((r) => r.code === 'church_administrator');
  if (!adminRow || adminRow.status === 'missing') {
    throw new Error('church_administrator missing after rematrix');
  }
  const adminPerms = new Set(adminRow.next);
  if (
    adminPerms.has('disbursements:approve') ||
    adminPerms.has('journals:post')
  ) {
    throw new Error(
      'SoD violation: church_administrator still has finance approve/post',
    );
  }

  const finance = after.data.find((r) => r.code === 'finance_officer');
  if (finance && new Set(finance.next).has('disbursements:approve')) {
    throw new Error('SoD violation: finance_officer has disbursements:approve');
  }

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres@127.0.0.1:5432/church_cms',
  });
  const client = await pool.connect();
  try {
    const audit = await client.query(
      `SELECT count(*)::int AS n FROM audit_events
        WHERE church_id = $1
          AND action = 'access.role.template_applied'
          AND created_at > now() - interval '5 minutes'`,
      [churchId],
    );
    if (audit.rows[0].n < 1) {
      throw new Error('expected access.role.template_applied audit events');
    }
    console.log('SMOKE_REMATRIX_APPLIED_OK', {
      updated: applied.data.filter((r) => r.status === 'updated').length,
      auditEvents: audit.rows[0].n,
      after: after.meta,
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('SMOKE_REMATRIX_FAIL', error);
  process.exitCode = 1;
});
