import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { connection } from 'next/server';

import {
  docsDisabledResponse,
  isApiDocsEnabled,
} from '@/platform/docs/local-only';

/** Raw OpenAPI 3 contract — non-production only. */
export async function GET() {
  await connection();
  if (!isApiDocsEnabled()) return docsDisabledResponse();

  const path = join(process.cwd(), 'docs/api/openapi.json');
  const body = readFileSync(path, 'utf8');
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
