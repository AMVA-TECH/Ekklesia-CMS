import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure transition rules for ending appointments (service mirrors these).
 */
function canEnd(status: string): boolean {
  return status === 'active';
}

function resolveEffectiveTo(
  existingFrom: string,
  requested?: string,
  today = '2026-11-09',
): { ok: true; effectiveTo: string } | { ok: false; code: string } {
  const effectiveTo = requested ?? today;
  if (effectiveTo < existingFrom) {
    return { ok: false, code: 'invalid_range' };
  }
  return { ok: true, effectiveTo };
}

describe('appointment end transitions', () => {
  it('allows ending an active appointment', () => {
    assert.equal(canEnd('active'), true);
  });

  it('rejects ending an already-ended appointment', () => {
    assert.equal(canEnd('ended'), false);
  });

  it('defaults effectiveTo to today when omitted', () => {
    const result = resolveEffectiveTo('2026-01-01', undefined, '2026-11-09');
    assert.deepEqual(result, { ok: true, effectiveTo: '2026-11-09' });
  });

  it('rejects effectiveTo before effectiveFrom', () => {
    const result = resolveEffectiveTo('2026-06-01', '2026-05-01');
    assert.deepEqual(result, { ok: false, code: 'invalid_range' });
  });
});
