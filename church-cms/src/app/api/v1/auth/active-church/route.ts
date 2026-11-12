import { withApiHandler, parseJsonBody, jsonOk, REQUEST_ID_HEADER } from '@/platform/http';
import { activeChurchBodySchema, setActiveChurch } from '@/platform/auth';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, activeChurchBodySchema);
  const { me, setCookieHeaders } = await setActiveChurch(ctx, request, body);
  const response = jsonOk(me, ctx.requestId);
  for (const cookie of setCookieHeaders) {
    response.headers.append('set-cookie', cookie);
  }
  response.headers.set(REQUEST_ID_HEADER, ctx.requestId);
  return response;
});
