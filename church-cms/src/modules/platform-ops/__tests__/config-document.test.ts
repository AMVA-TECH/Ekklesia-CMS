import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  deepMergeConfig,
  resolvePlatformDefaultsConfig,
  resolvePlatformGlobalConfig,
  validateGlobalConfigDocument,
} from '../config-document.ts';
import {
  getPlatformConfigQuerySchema,
  patchPlatformConfigBodySchema,
} from '../config-schemas.ts';
import { analyticsQuerySchema } from '../analytics-schemas.ts';

describe('resolvePlatformGlobalConfig', () => {
  it('applies built-in defaults', () => {
    const resolved = resolvePlatformGlobalConfig({});
    assert.equal(resolved.identity.productName, 'Ekklesia');
    assert.equal(resolved.security.supportSessionDefaultAccess, 'read');
    assert.equal(resolved.featureFlags.breakGlassEnabled, true);
  });

  it('merges stored patches', () => {
    const resolved = resolvePlatformGlobalConfig({
      identity: { productName: 'Pilot CMS' },
    });
    assert.equal(resolved.identity.productName, 'Pilot CMS');
    assert.equal(resolved.auth.sessionMaxAgeHours, 168);
  });
});

describe('resolvePlatformDefaultsConfig', () => {
  it('keeps module defaults', () => {
    const resolved = resolvePlatformDefaultsConfig({});
    assert.equal(resolved.modules.finance, true);
    assert.equal(resolved.locale.defaultLocale, 'sw');
  });
});

describe('deepMergeConfig', () => {
  it('null deletes keys', () => {
    const out = deepMergeConfig(
      { a: 1, nested: { x: 1, y: 2 } },
      { nested: { y: null } },
    );
    const nested = out.nested as Record<string, unknown>;
    assert.equal(nested.x, 1);
    assert.equal('y' in nested, false);
  });
});

describe('validateGlobalConfigDocument', () => {
  it('rejects billing-like unknown nested when schema is strict', () => {
    const errors = validateGlobalConfigDocument({
      identity: { productName: 'X' },
      billing: { plan: 'pro' },
    });
    assert.ok(errors.length > 0);
  });
});

describe('getPlatformConfigQuerySchema', () => {
  it('requires churchId for tenant scope', () => {
    assert.throws(() =>
      getPlatformConfigQuerySchema.parse({ scope: 'tenant' }),
    );
    const ok = getPlatformConfigQuerySchema.parse({
      scope: 'tenant',
      churchId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    assert.equal(ok.scope, 'tenant');
  });
});

describe('patchPlatformConfigBodySchema', () => {
  it('requires a reason', () => {
    assert.throws(() =>
      patchPlatformConfigBodySchema.parse({
        scope: 'global',
        document: {},
        reason: 'short',
      }),
    );
  });
});

describe('analyticsQuerySchema', () => {
  it('defaults days to 30', () => {
    const parsed = analyticsQuerySchema.parse({});
    assert.equal(parsed.days, 30);
  });
});
