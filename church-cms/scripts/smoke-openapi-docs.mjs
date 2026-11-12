#!/usr/bin/env node
/**
 * Smoke: OpenAPI artifact + optional live docs routes.
 * Usage:
 *   node scripts/smoke-openapi-docs.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-openapi-docs.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const baseUrl = process.env.BASE_URL || process.env.PILOT_BASE_URL || '';

function main() {
  const openapi = JSON.parse(
    readFileSync(join(root, 'docs/api/openapi.json'), 'utf8'),
  );
  const ops = Object.values(openapi.paths || {}).reduce(
    (n, item) => n + Object.keys(item).filter((k) => !k.startsWith('x-')).length,
    0,
  );
  if (ops < 167) {
    throw new Error(`expected >=167 operations, got ${ops}`);
  }
  if (!openapi.paths['/api/v1/health']?.get) {
    throw new Error('missing GET /api/v1/health');
  }
  if (!openapi.paths['/api/v1/auth/login']?.post?.requestBody) {
    throw new Error('login overlay missing requestBody');
  }
  console.log('SMOKE_OPENAPI_ARTIFACT_OK', { operations: ops });

  if (!baseUrl) return;

  return (async () => {
    const spec = await fetch(`${baseUrl}/api/openapi.json`);
    if (!spec.ok) {
      throw new Error(`openapi.json HTTP ${spec.status}`);
    }
    const docs = await fetch(`${baseUrl}/api/docs`);
    if (!docs.ok) {
      throw new Error(`docs HTTP ${docs.status}`);
    }
    const html = await docs.text();
    if (!html.includes('swagger-ui')) {
      throw new Error('docs HTML missing swagger-ui');
    }
    console.log('SMOKE_OPENAPI_HTTP_OK', {
      openapi: spec.status,
      docs: docs.status,
    });
  })();
}

Promise.resolve(main()).catch((error) => {
  console.error('SMOKE_OPENAPI_FAIL', error);
  process.exitCode = 1;
});
