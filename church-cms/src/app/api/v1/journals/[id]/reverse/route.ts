import { withApiHandler, jsonOk } from '@/platform/http';
import { reverseJournal } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await reverseJournal(ctx, id);
  return jsonOk(result, ctx.requestId);
});
