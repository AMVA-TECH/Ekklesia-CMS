import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Session } from '@/app/_ekklesia/session';
import { DEFAULT_ADMIN_NAV_LABELS } from '../admin-nav-labels.ts';
import { buildAdminGroups } from '../nav-groups.ts';

function sessionWith(permissions: string[]): Session {
  return { permissions } as unknown as Session;
}

function hrefs(permissions: string[]): string[] {
  return buildAdminGroups(sessionWith(permissions)).flatMap((g) => g.items.map((i) => i.href));
}

describe('buildAdminGroups', () => {
  it('shows only the dashboard without permissions', () => {
    assert.deepEqual(hrefs([]), ['/admin/dashboard']);
  });

  it('gates finance ledger screens by their own permissions', () => {
    const viewer = hrefs(['funds:read']);
    assert.ok(viewer.includes('/admin/finance/funds'));
    assert.ok(!viewer.includes('/admin/finance/journals'));
    assert.ok(!viewer.includes('/admin/finance/expenses'));

    const officer = hrefs(['journals:read', 'disbursements:request', 'budgets:read', 'accounts:read']);
    for (const href of [
      '/admin/finance/journals',
      '/admin/finance/expenses',
      '/admin/finance/budgets',
      '/admin/finance/accounts',
    ]) {
      assert.ok(officer.includes(href), href);
    }
  });

  it('shows approvals to approvers and audit/exports to their holders', () => {
    const links = hrefs(['disbursements:approve', 'audit:read', 'exports:run']);
    assert.ok(links.includes('/admin/approvals'));
    assert.ok(links.includes('/admin/audit'));
    assert.ok(links.includes('/admin/exports'));
    assert.ok(!links.includes('/admin/settings'));
  });

  it('shows roles workspace for roles:read or roles:assign', () => {
    assert.ok(hrefs(['roles:read']).includes('/admin/roles'));
    assert.ok(hrefs(['roles:assign']).includes('/admin/roles'));
    assert.ok(!hrefs(['people:read']).includes('/admin/roles'));
  });

  it('hides modules switched off for the church', () => {
    const session = {
      permissions: ['journals:read', 'projects:read'],
      church: { config: { modules: { finance: false } } },
    } as unknown as Session;
    const links = buildAdminGroups(session).flatMap((g) => g.items.map((i) => i.href));
    assert.ok(!links.includes('/admin/finance/journals'));
    assert.ok(!links.includes('/admin/projects'));
  });

  it('uses locale nav labels when church terminology is still the English default', () => {
    const session = {
      permissions: ['memberships:read', 'units:read'],
      church: {
        config: {
          modules: { membership: true, organisation: true },
          terminology: {
            organisationalUnitSingular: 'Ministry',
            organisationalUnitPlural: 'Ministries',
            membershipLabel: 'Membership',
          },
        },
      },
    } as unknown as Session;
    const labels = {
      ...DEFAULT_ADMIN_NAV_LABELS,
      memberships: 'Uanachama',
      ministries: 'Huduma',
    };
    const items = buildAdminGroups(session, labels).flatMap((g) => g.items);
    assert.equal(
      items.find((i) => i.href === '/admin/memberships')?.label,
      'Uanachama',
    );
    assert.equal(
      items.find((i) => i.href === '/admin/ministries')?.label,
      'Huduma',
    );
  });

  it('keeps customized church terminology in the nav', () => {
    const session = {
      permissions: ['memberships:read'],
      church: {
        config: {
          modules: { membership: true },
          terminology: { membershipLabel: 'Fellowship' },
        },
      },
    } as unknown as Session;
    const items = buildAdminGroups(session).flatMap((g) => g.items);
    assert.equal(
      items.find((i) => i.href === '/admin/memberships')?.label,
      'Fellowship',
    );
  });
});
