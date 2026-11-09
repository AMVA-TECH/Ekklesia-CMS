import { resolveRequestId, REQUEST_ID_HEADER, jsonOk } from '@/platform/http';

/** Public liveness probe — no auth, no data. */
export function GET(request: Request): Response {
  const requestId = resolveRequestId(request);
  return jsonOk(
    { status: 'ok', service: 'church-cms' },
    requestId,
    { headers: { [REQUEST_ID_HEADER]: requestId } },
  );
}
