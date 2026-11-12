#!/usr/bin/env node
/**
 * Scan App Router API route.ts files into docs/api/openapi.json + ENDPOINT_MAP.md
 * Merges optional overlays from docs/api/overlays JSON files.
 *
 * Usage: pnpm openapi:generate
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src/app/api');
const outDir = join(root, 'docs/api');
const overlaysDir = join(outDir, 'overlays');
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === 'route.ts') out.push(p);
  }
  return out;
}

function tagFor(path) {
  if (path.startsWith('/api/v1/platform')) return 'Platform';
  if (path.startsWith('/api/v1/auth') || path.startsWith('/api/auth')) return 'Auth';
  if (
    path.includes('/people') ||
    path.includes('/directory') ||
    path.includes('/households')
  ) {
    return 'People';
  }
  if (path.includes('/membership')) return 'Membership';
  if (
    path.includes('/organisational') ||
    path.includes('/positions') ||
    path.includes('/appointments') ||
    path.includes('/delegations')
  ) {
    return 'Organisation';
  }
  if (path.includes('/participation')) return 'Ministries';
  if (
    path.includes('/event') ||
    path.includes('/attendance') ||
    path.includes('/absence')
  ) {
    return 'Events & attendance';
  }
  if (
    path.includes('/fund') ||
    path.includes('/account') ||
    path.includes('/journal') ||
    path.includes('/offering') ||
    path.includes('/pledge') ||
    path.includes('/expense') ||
    path.includes('/budget') ||
    path.includes('/financial') ||
    path.includes('/project') ||
    path.includes('/approval')
  ) {
    return 'Finance';
  }
  if (
    path.includes('/message') ||
    path.includes('/announcement') ||
    path.includes('/communication') ||
    path.includes('/webhook')
  ) {
    return 'Messaging';
  }
  if (
    path.includes('/report') ||
    path.includes('/meeting-minutes') ||
    path.includes('/saved-report') ||
    path.includes('/appointment-request')
  ) {
    return 'Governance';
  }
  if (
    path.includes('/role') ||
    path.includes('/audit') ||
    path.includes('/export') ||
    path.includes('/import') ||
    path.includes('/media') ||
    path.includes('/church')
  ) {
    return 'Access & ops';
  }
  if (path.includes('/health')) return 'Health';
  return 'Other';
}

function openApiPath(filePath) {
  let rel = relative(join(root, 'src/app'), filePath).replace(/\\/g, '/');
  rel = rel.replace(/\/route\.ts$/, '');
  rel = `/${rel}`;
  rel = rel.replace(/\[\[\.\.\.([^\]]+)\]\]/g, '{$1}');
  rel = rel.replace(/\[\.\.\.([^\]]+)\]/g, '{$1}');
  rel = rel.replace(/\[([^\]]+)\]/g, '{$1}');
  return rel;
}

function deepMerge(base, overlay) {
  if (Array.isArray(overlay)) return overlay.slice();
  if (overlay && typeof overlay === 'object') {
    const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
    for (const [k, v] of Object.entries(overlay)) {
      out[k] = k in out ? deepMerge(out[k], v) : deepMerge(undefined, v);
    }
    return out;
  }
  return overlay;
}

function loadOverlays() {
  if (!existsSync(overlaysDir)) return {};
  let merged = {};
  for (const name of readdirSync(overlaysDir).sort()) {
    if (!name.endsWith('.json')) continue;
    const raw = JSON.parse(readFileSync(join(overlaysDir, name), 'utf8'));
    merged = deepMerge(merged, raw);
  }
  return merged;
}

const files = walk(apiRoot);
const paths = {};
const summary = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const path = openApiPath(file);
  const ops = {};
  for (const m of methods) {
    const re = new RegExp(`export const ${m}\\b`);
    if (!re.test(src)) continue;

    const isPublic =
      /withPublicApiHandler/.test(src) &&
      new RegExp(`export const ${m} = withPublicApiHandler`).test(src);
    const isPlatform =
      /withPlatformApiHandler/.test(src) &&
      new RegExp(`export const ${m} = withPlatformApiHandler`).test(src);

    const params = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
      name: match[1],
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        ...(match[1] === 'id' || match[1].endsWith('Id') || match[1] === 'reportId'
          ? { format: 'uuid' }
          : {}),
      },
    }));

    const security = isPublic
      ? []
      : isPlatform
        ? [{ DevPlatformOperator: [] }, { DevAuth: [] }]
        : [{ DevAuth: [] }, { SessionCookie: [] }];

    const op = {
      tags: [tagFor(path)],
      summary: `${m} ${path.replace(/^\/api\/v1/, '') || path}`,
      operationId: `${m.toLowerCase()}_${path
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}`,
      parameters: [
        ...params,
        { $ref: '#/components/parameters/DevChurchId' },
        { $ref: '#/components/parameters/DevPermissions' },
        { $ref: '#/components/parameters/DevPersonId' },
        { $ref: '#/components/parameters/DevPlatformPermissions' },
      ],
      security,
      responses: {
        '200': { description: 'Success' },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/problem+json': {
              schema: { $ref: '#/components/schemas/ProblemDetails' },
            },
          },
        },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '422': { description: 'Validation failed' },
      },
    };

    if (m === 'POST' || m === 'PATCH' || m === 'PUT') {
      op.requestBody = {
        required: false,
        content: {
          'application/json': {
            schema: { type: 'object', additionalProperties: true },
          },
        },
      };
    }

    ops[m.toLowerCase()] = op;
    summary.push({
      method: m,
      path,
      tag: tagFor(path),
      auth: isPublic ? 'public' : isPlatform ? 'platform' : 'session',
    });
  }
  if (Object.keys(ops).length) paths[path] = ops;
}

const baseDoc = {
  openapi: '3.0.3',
  info: {
    title: 'Church CMS API',
    version: '0.1.0',
    description: [
      'CrossLife / multi-church CMS REST API (`/api/v1`).',
      '',
      '## Auth for Try it out',
      '- **Dev simulation** (`ALLOW_DEV_AUTH=1`): Swagger injects seed headers by default.',
      '  - Admin: `x-dev-user-id=cccccccc-0001-0001-0001-000000000001`',
      '  - Church: `x-dev-church-id=11111111-1111-1111-1111-111111111111`',
      '  - Member `…0002` · Finance `…0003` · Platform operator `…0004`',
      '- **Platform ops**: set `x-dev-platform-operator: 1` (and platform user id).',
      '- **Real login**: `POST /api/v1/auth/login` (+ MFA for admins) → session cookie.',
      '',
      'SMS testing: `NOTIFY_PROVIDER=smsgate` (SMSGate, same as RentFlow).',
      '',
      'Local docs: `/api/docs` · Raw: `/api/openapi.json` (non-production only).',
    ].join('\n'),
  },
  servers: [
    // Relative so Try it out stays same-origin (localhost vs 127.0.0.1 is CORS).
    { url: '/', description: 'Same origin (recommended)' },
    { url: 'http://127.0.0.1:3000', description: 'Local Next.js (127.0.0.1)' },
    { url: 'http://localhost:3000', description: 'Local Next.js (localhost)' },
    {
      url: 'http://platform.localhost:3000',
      description: 'Platform operator host (local)',
    },
  ],
  tags: [...new Set(summary.map((s) => s.tag))]
    .sort()
    .map((name) => ({ name })),
  components: {
    securitySchemes: {
      SessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description: 'Better Auth session cookie (set by login)',
      },
      DevAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-dev-user-id',
        description: 'Dev user UUID (ALLOW_DEV_AUTH=1)',
      },
      DevPlatformOperator: {
        type: 'apiKey',
        in: 'header',
        name: 'x-dev-platform-operator',
        description: 'Set to `1` for /api/v1/platform/*',
      },
    },
    parameters: {
      DevChurchId: {
        name: 'x-dev-church-id',
        in: 'header',
        required: false,
        schema: {
          type: 'string',
          format: 'uuid',
          default: '11111111-1111-1111-1111-111111111111',
        },
        description: 'Active church for ALLOW_DEV_AUTH',
      },
      DevPermissions: {
        name: 'x-dev-permissions',
        in: 'header',
        required: false,
        schema: { type: 'string' },
        description: 'Comma-separated permission codes (optional; admin seed may omit)',
      },
      DevPersonId: {
        name: 'x-dev-person-id',
        in: 'header',
        required: false,
        schema: { type: 'string', format: 'uuid' },
      },
      DevPlatformPermissions: {
        name: 'x-dev-platform-permissions',
        in: 'header',
        required: false,
        schema: {
          type: 'string',
          default:
            'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read',
        },
      },
    },
    schemas: {
      ProblemDetails: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
  },
  paths,
};

const overlays = loadOverlays();
const doc = deepMerge(baseDoc, overlays);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'openapi.json'), `${JSON.stringify(doc, null, 2)}\n`);
writeFileSync(
  join(outDir, 'ENDPOINT_MAP.md'),
  [
    '# API endpoint map',
    '',
    `Generated from \`src/app/api/**/route.ts\` (${summary.length} operations).`,
    '',
    'Regenerate: `pnpm openapi:generate`',
    '',
    '| Method | Path | Tag | Auth |',
    '|---|---|---|---|',
    ...summary
      .sort(
        (a, b) =>
          a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
      )
      .map(
        (s) =>
          `| \`${s.method}\` | \`${s.path}\` | ${s.tag} | ${s.auth} |`,
      ),
    '',
  ].join('\n'),
);

console.log(
  `OPENAPI_OK operations=${summary.length} overlays=${existsSync(overlaysDir) ? readdirSync(overlaysDir).filter((n) => n.endsWith('.json')).length : 0}`,
);
