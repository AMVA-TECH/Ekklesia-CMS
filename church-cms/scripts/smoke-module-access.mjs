#!/usr/bin/env node
/**
 * Multi-module access smoke (service-layer):
 * people / finance / events — forbidden, cross-tenant not_found, unit scope.
 *
 * Usage: pnpm db:smoke:module-access
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

function ctx(overrides = {}) {
  return {
    churchId: churchA,
    requestId: 'smoke_module_access',
    locale: 'en',
    actor: { userAccountId: adminUserId, personId: null },
    permissions: new Set(),
    ...overrides,
  };
}

function expectAppError(err, code) {
  if (!err || err.name !== 'AppError' || err.code !== code) {
    throw err instanceof Error
      ? err
      : new Error(`expected AppError ${code}, got ${String(err)}`);
  }
}

async function expectRejects(fn, code) {
  try {
    await fn();
  } catch (err) {
    expectAppError(err, code);
    return;
  }
  throw new Error(`expected AppError ${code}`);
}

async function main() {
  const { resetEnvCache } = await import('../src/platform/config/env.ts');
  resetEnvCache();

  const { listPeople, getPerson } = await import(
    '../src/modules/people/service.ts'
  );
  const { listFunds, getFund } = await import(
    '../src/modules/finance/service.ts'
  );
  const { getEvent, listEvents } = await import(
    '../src/modules/events/service.ts'
  );

  // --- People ---
  await expectRejects(
    () =>
      listPeople(
        ctx({
          actor: { userAccountId: memberUserId, personId: null },
          permissions: new Set(['directory:read']),
        }),
        { limit: 5 },
      ),
    'forbidden',
  );

  const people = await listPeople(
    ctx({ permissions: new Set(['people:read']) }),
    { limit: 5 },
  );
  if (!people.data?.length) throw new Error('expected people rows');
  const personId = people.data[0].id;

  const open = await getPerson(
    ctx({ permissions: new Set(['people:read']) }),
    personId,
  );
  if (open.dateOfBirth !== null) {
    throw new Error('dateOfBirth must be null without people:read_restricted');
  }

  const restricted = await getPerson(
    ctx({
      permissions: new Set(['people:read', 'people:read_restricted']),
    }),
    personId,
  );
  // May be null in seed; presence of field is enough — value only if stored.
  if (!('dateOfBirth' in restricted)) {
    throw new Error('restricted DTO missing dateOfBirth key');
  }

  await expectRejects(
    () =>
      getPerson(
        ctx({
          churchId: churchB,
          permissions: new Set(['people:read', 'people:read_restricted']),
        }),
        personId,
      ),
    'not_found',
  );

  // --- Finance ---
  await expectRejects(
    () =>
      listFunds(
        ctx({
          actor: { userAccountId: memberUserId, personId: null },
          permissions: new Set(['people:read']),
        }),
      ),
    'forbidden',
  );

  const funds = await listFunds(
    ctx({ permissions: new Set(['funds:read']) }),
  );
  if (!funds.data?.length) throw new Error('expected funds — seed finance first');
  const fundId = funds.data[0].id;

  await getFund(ctx({ permissions: new Set(['funds:read']) }), fundId);

  await expectRejects(
    () =>
      getFund(
        ctx({
          churchId: churchB,
          permissions: new Set(['funds:read']),
        }),
        fundId,
      ),
    'not_found',
  );

  // --- Events (unit scope) ---
  await expectRejects(
    () =>
      listEvents(
        ctx({
          actor: { userAccountId: memberUserId, personId: null },
          permissions: new Set(['people:read']),
        }),
        { limit: 10 },
      ),
    'forbidden',
  );

  const events = await listEvents(
    ctx({ permissions: new Set(['events:read']) }),
    { limit: 20 },
  );
  const unitEvent = events.data?.find((e) => e.organisationalUnitId);
  if (!unitEvent) {
    throw new Error('expected an event with organisationalUnitId');
  }
  const unitId = unitEvent.organisationalUnitId;
  const otherUnit =
    events.data.find(
      (e) => e.organisationalUnitId && e.organisationalUnitId !== unitId,
    )?.organisationalUnitId ?? '00000000-0000-0000-0000-000000000099';

  await getEvent(
    ctx({
      permissions: new Set(['events:read']),
      scopesByPermission: new Map([
        [
          'events:read',
          [{ type: 'organisational_unit', organisationalUnitId: unitId }],
        ],
      ]),
    }),
    unitEvent.id,
  );

  await expectRejects(
    () =>
      getEvent(
        ctx({
          permissions: new Set(['events:read']),
          scopesByPermission: new Map([
            [
              'events:read',
              [
                {
                  type: 'organisational_unit',
                  organisationalUnitId: otherUnit,
                },
              ],
            ],
          ]),
        }),
        unitEvent.id,
      ),
    'forbidden',
  );

  await expectRejects(
    () =>
      getEvent(
        ctx({
          churchId: churchB,
          permissions: new Set(['events:read']),
        }),
        unitEvent.id,
      ),
    'not_found',
  );

  // --- Membership ---
  const { listMemberships, getMembership } = await import(
    '../src/modules/membership/service.ts'
  );
  await expectRejects(
    () =>
      listMemberships(
        ctx({
          actor: { userAccountId: memberUserId, personId: null },
          permissions: new Set(['people:read']),
        }),
        { limit: 5 },
      ),
    'forbidden',
  );
  const memberships = await listMemberships(
    ctx({ permissions: new Set(['memberships:read']) }),
    { limit: 5 },
  );
  if (!memberships.data?.length) throw new Error('expected memberships');
  const membershipId = memberships.data[0].id;
  await expectRejects(
    () =>
      getMembership(
        ctx({
          churchId: churchB,
          permissions: new Set(['memberships:read']),
        }),
        membershipId,
      ),
    'not_found',
  );

  // --- Governance SoD (policy) ---
  const { assertCanApproveDisbursement, assertCanRequestDisbursement } =
    await import('../src/modules/governance/policies.ts');
  await expectRejects(
    async () =>
      assertCanApproveDisbursement(
        ctx({
          permissions: new Set(['disbursements:request', 'journals:draft']),
        }),
      ),
    'forbidden',
  );
  assertCanRequestDisbursement(
    ctx({ permissions: new Set(['disbursements:request']) }),
  );

  const baseUrl = process.env.BASE_URL || process.env.PILOT_BASE_URL || '';
  if (baseUrl) {
    const adminHeaders = {
      'x-dev-user-id': adminUserId,
      'x-dev-church-id': churchA,
      'x-dev-permissions': 'people:read,funds:read,events:read,memberships:read',
    };
    const memberHeaders = {
      'x-dev-user-id': memberUserId,
      'x-dev-church-id': churchA,
      'x-dev-permissions': 'directory:read',
    };
    const peopleOk = await fetch(`${baseUrl}/api/v1/people?limit=5`, {
      headers: adminHeaders,
    });
    if (!peopleOk.ok) {
      throw new Error(`people HTTP ${peopleOk.status}`);
    }
    const peopleForbid = await fetch(`${baseUrl}/api/v1/people?limit=5`, {
      headers: memberHeaders,
    });
    if (peopleForbid.status !== 403) {
      throw new Error(`expected people 403, got ${peopleForbid.status}`);
    }
    console.log('SMOKE_MODULE_ACCESS_HTTP_OK', {
      people: peopleOk.status,
      forbidden: peopleForbid.status,
    });
  }

  console.log('SMOKE_MODULE_ACCESS_OK', {
    people: people.data.length,
    funds: funds.data.length,
    events: events.data.length,
    memberships: memberships.data.length,
    unitEvent: unitEvent.id,
    checks: [
      'people_forbidden',
      'people_restricted_dob',
      'people_cross_tenant',
      'funds_forbidden',
      'funds_cross_tenant',
      'events_forbidden',
      'events_unit_scope',
      'events_cross_tenant',
      'memberships_forbidden',
      'memberships_cross_tenant',
      'disbursement_sod',
    ],
  });
}

main().catch((error) => {
  console.error('SMOKE_MODULE_ACCESS_FAIL', error);
  process.exitCode = 1;
});
