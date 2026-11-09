import { newId } from '@/platform/db/ids';

const HEADER = 'x-request-id';

/** Prefer inbound X-Request-Id; otherwise generate one. */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get(HEADER);
  if (incoming && /^[A-Za-z0-9_\-.:]{8,128}$/.test(incoming)) {
    return incoming;
  }
  return `req_${newId()}`;
}

export { HEADER as REQUEST_ID_HEADER };
