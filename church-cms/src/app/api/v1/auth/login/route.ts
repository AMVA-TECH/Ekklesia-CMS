import { withPublicApiHandler, parseJsonBody, REQUEST_ID_HEADER } from '@/platform/http';
import { loginBodySchema, loginWithPin } from '@/platform/auth';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, loginBodySchema);
  const response = await loginWithPin(request, body);
  response.headers.set(REQUEST_ID_HEADER, requestId ?? '');
  return response;
});
