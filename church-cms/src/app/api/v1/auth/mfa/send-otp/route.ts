import { withPublicApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { peekDevOtp, sendMfaOtp } from '@/platform/auth';

/** Public: uses Better Auth 2FA challenge cookie from PIN login, not a full session. */
export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const response = await sendMfaOtp(request);
  const rid = requestId ?? '';

  if (!response.ok) {
    response.headers.set(REQUEST_ID_HEADER, rid);
    return response;
  }

  // Local UI only: surface the OTP so operators can finish MFA without SMS/SMTP.
  const devOtp = peekDevOtp();
  if (devOtp) {
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, rid);
    headers.set('content-type', 'application/json');
    return Response.json(
      {
        data: {
          sent: true,
          channel: 'dev',
          message: 'Dev mode: use the code shown on screen.',
          devOtp,
        },
      },
      { status: 200, headers },
    );
  }

  response.headers.set(REQUEST_ID_HEADER, rid);
  return response;
});
