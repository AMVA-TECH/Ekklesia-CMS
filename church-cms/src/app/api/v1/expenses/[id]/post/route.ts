import { withApiHandler, jsonOk } from '@/platform/http';
import { postExpense } from '@/modules/governance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const expense = await postExpense(ctx, id);
  return jsonOk(expense, ctx.requestId);
});
