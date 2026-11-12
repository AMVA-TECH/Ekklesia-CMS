import { withApiHandler, jsonOk } from '@/platform/http';
import { revokeDelegation } from '@/modules/governance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const delegation = await revokeDelegation(ctx, id);
  return jsonOk(delegation, ctx.requestId);
});
