import { connection } from 'next/server';

import {
  docsDisabledResponse,
  isApiDocsEnabled,
} from '@/platform/docs/local-only';

const SEED_ADMIN = 'cccccccc-0001-0001-0001-000000000001';
const SEED_CHURCH = '11111111-1111-1111-1111-111111111111';
const SEED_PLATFORM = 'cccccccc-0001-0001-0001-000000000004';

/**
 * Local Swagger UI (CDN). Injects seed x-dev-* headers when ALLOW_DEV_AUTH=1.
 */
export async function GET() {
  await connection();
  if (!isApiDocsEnabled()) return docsDisabledResponse();

  const injectDevHeaders = process.env.ALLOW_DEV_AUTH === '1';
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Church CMS API · Swagger</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" crossorigin="anonymous" />
  <style>
    :root { color-scheme: light; --bg:#f4f6f8; --brand:#0f3d34; --muted:#5b6b73; }
    body { margin:0; background:var(--bg); font-family: ui-sans-serif, system-ui, sans-serif; }
    .intro { background:var(--brand); color:#fff; padding:1.25rem 1.5rem; }
    .intro h1 { margin:0 0 .35rem; font-size:1.35rem; }
    .intro p { margin:0; opacity:.92; max-width:52rem; line-height:1.45; font-size:.95rem; }
    .note { margin:1rem 1.5rem 0; padding:.85rem 1rem; background:#fff; border:1px solid #d5dee3; border-radius:.5rem; color:var(--muted); font-size:.9rem; }
    .note code { color:#123; }
    .swagger-ui .topbar { display:none; }
    #swagger-ui { padding:0 0 2rem; }
  </style>
</head>
<body>
  <header class="intro">
    <h1>Church CMS API</h1>
    <p>Browse and Try it out against local <code>/api/v1</code>. Non-production only. Seed fixtures: admin, member, finance, platform operator.</p>
  </header>
  <p class="note">
    <strong>Simulation:</strong> ${
      injectDevHeaders
        ? 'ALLOW_DEV_AUTH=1 — Try it out attaches admin seed headers automatically. Override in Authorize or per-request headers. Platform routes: set <code>x-dev-platform-operator: 1</code> and user <code>…0004</code>.'
        : 'ALLOW_DEV_AUTH is off — use real login cookies, or set ALLOW_DEV_AUTH=1 for header simulation.'
    }
    Spec: <a href="/api/openapi.json"><code>/api/openapi.json</code></a>
  </p>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    const injectDev = ${injectDevHeaders ? 'true' : 'false'};
    const seed = {
      'x-dev-user-id': '${SEED_ADMIN}',
      'x-dev-church-id': '${SEED_CHURCH}',
      'x-dev-person-id': 'dddddddd-0001-0001-0001-000000000001',
    };
    const platformSeed = {
      'x-dev-user-id': '${SEED_PLATFORM}',
      'x-dev-platform-operator': '1',
      'x-dev-platform-permissions': 'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read',
    };
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      tryItOutEnabled: true,
      persistAuthorization: true,
      requestInterceptor: (req) => {
        // Keep Try it out on this page's origin (avoids localhost ↔ 127.0.0.1 CORS).
        try {
          const u = new URL(req.url, window.location.origin);
          if (u.origin !== window.location.origin && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) {
            req.url = window.location.origin + u.pathname + u.search;
          }
        } catch (_) { /* leave url */ }
        if (!injectDev) return req;
        req.headers = req.headers || {};
        const path = (req.url || '').replace(/^https?:\\/\\/[^/]+/, '');
        const isPlatform = path.includes('/api/v1/platform');
        const defaults = isPlatform ? { ...platformSeed } : { ...seed };
        for (const [k, v] of Object.entries(defaults)) {
          if (!req.headers[k]) req.headers[k] = v;
        }
        return req;
      },
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
