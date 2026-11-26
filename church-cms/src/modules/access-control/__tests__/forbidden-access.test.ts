import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Ctx } from '../../../platform/auth/ctx.ts';
import { AppError } from '../../../platform/errors/app-error.ts';
import {
  assertCanAssignRoles,
  assertCanReadRoles,
} from '../policies.ts';

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    churchId: 'church-1',
    requestId: 'req_1',
    locale: 'en',
    actor: { userAccountId: 'user-1', personId: 'person-1' },
    permissions: new Set(),
    ...overrides,
  };
}

function assertForbidden(fn: () => void) {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.code, 'forbidden');
    return true;
  });
}

describe('roles API forbidden access', () => {
  it('denies roles:read without roles:read or roles:assign', () => {
    assertForbidden(() => assertCanReadRoles(ctx()));
  });

  it('allows roles:read with roles:read', () => {
    assert.doesNotThrow(() =>
      assertCanReadRoles(ctx({ permissions: new Set(['roles:read']) })),
    );
  });

  it('allows roles:read with roles:assign alone', () => {
    assert.doesNotThrow(() =>
      assertCanReadRoles(ctx({ permissions: new Set(['roles:assign']) })),
    );
  });

  it('denies roles:assign without permission', () => {
    assertForbidden(() =>
      assertCanAssignRoles(
        ctx({ permissions: new Set(['roles:read', 'people:read']) }),
      ),
    );
  });

  it('allows roles:assign with permission', () => {
    assert.doesNotThrow(() =>
      assertCanAssignRoles(ctx({ permissions: new Set(['roles:assign']) })),
    );
  });
});

describe('roles cross-tenant static guards', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));

  it('assignment create rejects users not in the active church', () => {
    const service = fs.readFileSync(path.join(here, '../service.ts'), 'utf8');
    assert.match(service, /getOrganisationUser/);
    assert.match(service, /not_in_church/);
    assert.match(service, /getRoleById\(db, ctx/);
  });

  it('role mutations always load by id + ctx church', () => {
    const repo = fs.readFileSync(path.join(here, '../repository.ts'), 'utf8');
    assert.match(repo, /eq\(roles\.churchId, ctx\.churchId\)/);
    assert.match(
      repo,
      /eq\(userRoleAssignments\.churchId, ctx\.churchId\)/,
    );
  });

  it('API routes gate list/create/assign behind withApiHandler', () => {
    const rolesRoute = fs.readFileSync(
      path.join(here, '../../../app/api/v1/roles/route.ts'),
      'utf8',
    );
    const applyRoute = fs.readFileSync(
      path.join(here, '../../../app/api/v1/roles/apply-templates/route.ts'),
      'utf8',
    );
    const roleById = fs.readFileSync(
      path.join(here, '../../../app/api/v1/roles/[id]/route.ts'),
      'utf8',
    );
    const permsRoute = fs.readFileSync(
      path.join(here, '../../../app/api/v1/roles/[id]/permissions/route.ts'),
      'utf8',
    );
    assert.match(rolesRoute, /withApiHandler/);
    assert.match(rolesRoute, /listRoles/);
    assert.match(rolesRoute, /createRole/);
    assert.match(applyRoute, /withApiHandler/);
    assert.match(applyRoute, /applyRoleTemplates/);
    assert.match(applyRoute, /applyRoleTemplatesBodySchema/);
    assert.match(roleById, /withApiHandler/);
    assert.match(roleById, /getRole|updateRole|deactivateRole/);
    assert.match(permsRoute, /withApiHandler/);
    assert.match(permsRoute, /updateRolePermissions/);
  });
});
