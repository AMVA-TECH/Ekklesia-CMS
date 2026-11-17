import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deepMergeSettings,
  resolveChurchSettings,
  validateChurchSettingsDocument,
} from '../settings-schema.ts';

describe('resolveChurchSettings', () => {
  it('applies defaults when empty', () => {
    const resolved = resolveChurchSettings({});
    assert.equal(resolved.branding.productName, 'Ekklesia');
    assert.equal(resolved.modules.finance, true);
    assert.equal(resolved.workflows.announcementDualControl, true);
  });

  it('prefers branding.logoMediaId over flat key', () => {
    const resolved = resolveChurchSettings({
      logoMediaId: '00000000-0000-4000-8000-000000000001',
      branding: { logoMediaId: '00000000-0000-4000-8000-000000000002' },
    });
    assert.equal(
      resolved.branding.logoMediaId,
      '00000000-0000-4000-8000-000000000002',
    );
  });
});

describe('validateChurchSettingsDocument', () => {
  it('rejects invalid branding productName type', () => {
    const errors = validateChurchSettingsDocument({
      branding: { productName: 12 },
    });
    assert.ok(errors.length > 0);
  });

  it('accepts valid namespaces', () => {
    const errors = validateChurchSettingsDocument({
      branding: { productName: 'CrossLife', primaryColor: '#1B3A4B' },
      modules: { finance: false },
      identity: { motto: 'Raising Sons, Revealing Christ' },
      location: { country: 'Tanzania', city: 'Dar es Salaam' },
      presence: { website: 'https://www.crosslife.live' },
    });
    assert.equal(errors.length, 0);
  });

  it('resolves identity and location defaults as null', () => {
    const resolved = resolveChurchSettings({});
    assert.equal(resolved.identity.motto, null);
    assert.equal(resolved.location.country, null);
    assert.equal(resolved.presence.website, null);
    assert.equal(resolved.branding.primaryColor, null);
  });
});

describe('deepMergeSettings', () => {
  it('merges nested objects and deletes nulls', () => {
    const merged = deepMergeSettings(
      { branding: { productName: 'A', logoMediaId: 'x' }, modules: { finance: true } },
      { branding: { productName: 'B' }, modules: { finance: null } },
    );
    assert.deepEqual(merged.branding, { productName: 'B', logoMediaId: 'x' });
    assert.deepEqual(merged.modules, {});
  });
});
