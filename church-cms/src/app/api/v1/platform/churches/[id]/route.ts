import { withPlatformApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { getPlatformChurch } from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const params = routeCtx ? await routeCtx.params : {};
  const id = params.id;
  if (!id) {
    return Response.json({ error: 'missing id' }, { status: 400 });
  }
  const result = await getPlatformChurch(ctx, id);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
