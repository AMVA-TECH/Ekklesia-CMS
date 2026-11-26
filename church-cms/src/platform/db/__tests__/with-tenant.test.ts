import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('withTenantTx', () => {
  it('sets app.church_id via setRlsChurchIdSql inside the transaction', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../with-tenant.ts'), 'utf8');
    assert.match(source, /setRlsChurchIdSql/);
    assert.match(source, /\.transaction\(/);
    assert.match(source, /tx\.execute/);
    assert.match(source, /getTransactionalDb/);
    assert.match(source, /shouldUseTenantTransactions/);
  });

  it('uses Neon WebSocket pool for hosted transactional RLS', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(here, '../transactional-client.ts'),
      'utf8',
    );
    assert.match(source, /neon-serverless/);
    assert.match(source, /NeonPool/);
    assert.match(source, /webSocketConstructor/);
    assert.match(source, /DATABASE_TX_MODE/);
  });
});
