#!/usr/bin/env node
/**
 * Ensure all bootstrap ROLE_TEMPLATES exist for the pilot church, then rematrix.
 *
 * Usage: pnpm db:smoke:bootstrap-roles
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

async function main() {
  const { resetEnvCache } = await import('../src/platform/config/env.ts');
  resetEnvCache();

  const { listChurchPermissionCatalogue } = await import(
    '../src/modules/access-control/permission-catalogue.ts'
  );
  const { createRole, compareRoleTemplates, applyRoleTemplates } = await import(
    '../src/modules/access-control/service.ts'
  );
  const { ROLE_TEMPLATES } = await import(
    '../src/modules/platform-ops/role-bootstrap.ts'
  );

  const permissions = new Set([
    'roles:read',
    'roles:assign',
    ...listChurchPermissionCatalogue().map((p) => p.code),
  ]);
  const ctx = {
    churchId,
    requestId: 'smoke_bootstrap_roles',
    locale: 'en',
    actor: { userAccountId: adminUserId, personId: null },
    permissions,
  };

  const created = [];
  for (const template of ROLE_TEMPLATES.filter((t) => t.bootstrap)) {
    try {
      const role = await createRole(ctx, {
        code: template.code,
        name: template.name,
        permissions: [...template.permissions],
      });
      created.push({ code: template.code, id: role.id, status: 'created' });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'conflict') {
        created.push({ code: template.code, status: 'exists' });
        continue;
      }
      throw err;
    }
  }

  await applyRoleTemplates(ctx, { confirm: true });
  const after = await compareRoleTemplates(ctx, {});
  if (after.meta.driftCount !== 0 || after.meta.missingCount !== 0) {
    throw new Error(
      `bootstrap incomplete: drift=${after.meta.driftCount} missing=${after.meta.missingCount}`,
    );
  }

  console.log('SMOKE_BOOTSTRAP_ROLES_OK', {
    created,
    after: after.meta,
  });
}

main().catch((error) => {
  console.error('SMOKE_BOOTSTRAP_ROLES_FAIL', error);
  process.exitCode = 1;
});
