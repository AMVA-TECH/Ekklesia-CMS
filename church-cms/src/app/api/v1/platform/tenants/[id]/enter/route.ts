import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { enterTenant, enterTenantBodySchema } from '@/modules/platform-ops';

export const POST = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = routeCtx ? await routeCtx.params : {};
  const id = params.id;
  if (!id) {
    return Response.json({ error: 'missing id' }, { status: 400 });
  }
  const body = await parseJsonBody(request, enterTenantBodySchema);
  const result = await enterTenant(ctx, id, body, request);

  const headers = new Headers({ [REQUEST_ID_HEADER]: ctx.requestId });
  for (const cookie of result.setCookieHeaders) {
    headers.append('Set-Cookie', cookie);
  }

  const { setCookieHeaders: _cookies, ...payload } = result;
  return Response.json(payload, { headers });
});
