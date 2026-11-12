import { withApiHandler, jsonOk } from '@/platform/http';
import { getImport } from '@/modules/imports';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getImport(ctx, id), ctx.requestId);
});
