import { withPublicApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { sendMfaOtp } from '@/platform/auth';

/** Public: uses Better Auth 2FA challenge cookie from PIN login, not a full session. */
export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const response = await sendMfaOtp(request);
  response.headers.set(REQUEST_ID_HEADER, requestId ?? '');
  return response;
});
