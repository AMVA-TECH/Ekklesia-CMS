import { withApiHandler, jsonOk } from '@/platform/http';
import { getMediaMeta } from '@/modules/media';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getMediaMeta(ctx, id), ctx.requestId);
});
