import { withApiHandler, jsonOk } from '@/platform/http';
import { getJournal } from '@/modules/finance';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getJournal(ctx, id), ctx.requestId);
});
