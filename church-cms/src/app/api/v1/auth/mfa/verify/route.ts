import { withPublicApiHandler, parseJsonBody, REQUEST_ID_HEADER } from '@/platform/http';
import { mfaVerifyBodySchema, verifyMfaOtp } from '@/platform/auth';

/** Public: uses Better Auth 2FA challenge cookie from PIN login, not a full session. */
export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, mfaVerifyBodySchema);
  const response = await verifyMfaOtp(request, body);
  response.headers.set(REQUEST_ID_HEADER, requestId ?? '');
  return response;
});
