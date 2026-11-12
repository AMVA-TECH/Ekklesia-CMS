import { withApiHandler, jsonOk } from '@/platform/http';
import { validateImport } from '@/modules/imports';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await validateImport(ctx, id), ctx.requestId);
});
