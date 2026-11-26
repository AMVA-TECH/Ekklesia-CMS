import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  monitoringCorrelateQuerySchema,
  monitoringJobsQuerySchema,
} from '../monitoring-schemas.ts';

describe('monitoringJobsQuerySchema', () => {
  it('defaults limit and accepts status', () => {
    const parsed = monitoringJobsQuerySchema.parse({ status: 'failed' });
    assert.equal(parsed.status, 'failed');
    assert.equal(parsed.limit, 50);
  });
});

describe('monitoringCorrelateQuerySchema', () => {
  it('requires a request id', () => {
    assert.throws(() => monitoringCorrelateQuerySchema.parse({ requestId: 'ab' }));
    const ok = monitoringCorrelateQuerySchema.parse({
      requestId: 'req-1234',
    });
    assert.equal(ok.requestId, 'req-1234');
  });
});
