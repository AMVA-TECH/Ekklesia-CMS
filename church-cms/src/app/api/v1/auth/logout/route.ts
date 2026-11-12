import { withPublicApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { logout } from '@/platform/auth';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const response = await logout(request);
  response.headers.set(REQUEST_ID_HEADER, requestId ?? '');
  return response;
});
