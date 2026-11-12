import { withApiHandler, jsonOk } from '@/platform/http';
import { previewImport } from '@/modules/imports';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await previewImport(ctx, id), ctx.requestId);
});
