#!/usr/bin/env node
/**
 * Roles access smoke (service-layer + optional HTTP).
 * - Member without roles:read → forbidden
 * - Admin can list roles for own church
 * - Foreign church id → notFound for role belonging to church A
 * - Optional BASE_URL: HTTP 403/200 via x-dev-* headers
 *
 * Usage:
 *   pnpm db:smoke:roles-access
 *   BASE_URL=http://127.0.0.1:3000 pnpm db:smoke:roles-access
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  /* optional */
}

process.env.ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH || '1';

const churchA = '11111111-1111-1111-1111-111111111111';
const churchB = '22222222-2222-2222-2222-222222222222';
const adminUserId = 'cccccccc-0001-0001-0001-000000000001';
const memberUserId = 'cccccccc-0001-0001-0001-000000000002';
const baseUrl = process.env.BASE_URL || process.env.PILOT_BASE_URL || '';

function ctx(overrides = {}) {
  return {
    churchId: churchA,
    requestId: 'smoke_roles_access',
    locale: 'en',
    actor: { userAccountId: adminUserId, personId: null },
    permissions: new Set(['roles:read', 'roles:assign']),
    ...overrides,
  };
}

async function main() {
  const { resetEnvCache } = await import('../src/platform/config/env.ts');
  resetEnvCache();

  const { AppError } = await import('../src/platform/errors/app-error.ts');
  const { listRoles, getRole } = await import(
    '../src/modules/access-control/service.ts'
  );

  // Forbidden: no roles permissions
  let denied = false;
  try {
    await listRoles(
      ctx({
        actor: { userAccountId: memberUserId, personId: null },
        permissions: new Set(['people:read']),
      }),
      { includePermissions: false },
    );
  } catch (err) {
    if (err instanceof AppError && err.code === 'forbidden') denied = true;
    else throw err;
  }
  if (!denied) throw new Error('expected forbidden for member without roles:read');

  const listed = await listRoles(ctx(), { includePermissions: false });
  if (!listed.data?.length) throw new Error('admin expected roles for church A');
  const roleId = listed.data[0].id;

  const own = await getRole(ctx(), roleId);
  if (own.id !== roleId) throw new Error('getRole mismatch');

  let crossTenantHidden = false;
  try {
    await getRole(
      ctx({
        churchId: churchB,
        actor: { userAccountId: adminUserId, personId: null },
      }),
      roleId,
    );
  } catch (err) {
    if (err instanceof AppError && err.code === 'not_found') {
      crossTenantHidden = true;
    } else {
      throw err;
    }
  }
  if (!crossTenantHidden) {
    throw new Error('expected not_found for church A role under church B ctx');
  }

  console.log('SMOKE_ROLES_ACCESS_SERVICE_OK', {
    roles: listed.data.length,
    forbidden: true,
    crossTenant: 'not_found',
  });

  if (baseUrl) {
    const adminHeaders = {
      'x-dev-user-id': adminUserId,
      'x-dev-church-id': churchA,
      'x-dev-permissions': 'roles:read,roles:assign',
    };
    const memberHeaders = {
      'x-dev-user-id': memberUserId,
      'x-dev-church-id': churchA,
      'x-dev-permissions': 'people:read',
    };

    const ok = await fetch(`${baseUrl}/api/v1/roles`, { headers: adminHeaders });
    if (!ok.ok) {
      throw new Error(`admin list roles HTTP ${ok.status}: ${await ok.text()}`);
    }

    const forbid = await fetch(`${baseUrl}/api/v1/roles`, {
      headers: memberHeaders,
    });
    if (forbid.status !== 403) {
      throw new Error(`expected HTTP 403 for member, got ${forbid.status}`);
    }

    const foreign = await fetch(`${baseUrl}/api/v1/roles/${roleId}`, {
      headers: {
        'x-dev-user-id': adminUserId,
        'x-dev-church-id': churchB,
        'x-dev-permissions': 'roles:read,roles:assign',
      },
    });
    if (foreign.status !== 404) {
      throw new Error(
        `expected HTTP 404 cross-tenant getRole, got ${foreign.status}`,
      );
    }

    console.log('SMOKE_ROLES_ACCESS_HTTP_OK', {
      list: ok.status,
      forbidden: forbid.status,
      crossTenant: foreign.status,
    });
  }
}

main().catch((error) => {
  console.error('SMOKE_ROLES_ACCESS_FAIL', error);
  process.exitCode = 1;
});
