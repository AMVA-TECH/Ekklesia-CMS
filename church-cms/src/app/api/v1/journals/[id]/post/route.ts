import { withApiHandler, jsonOk } from '@/platform/http';
import { postJournal } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await postJournal(ctx, id), ctx.requestId);
});
