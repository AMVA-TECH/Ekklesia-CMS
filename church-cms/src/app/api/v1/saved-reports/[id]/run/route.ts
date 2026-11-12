import { withApiHandler, jsonOk } from '@/platform/http';
import { runSavedReport } from '@/modules/governance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await runSavedReport(ctx, id);
  return jsonOk(result, ctx.requestId);
});
