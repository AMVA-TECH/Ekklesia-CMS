import { withApiHandler, jsonOk } from '@/platform/http';
import { listMembershipStatusHistory } from '@/modules/membership';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await listMembershipStatusHistory(ctx, id), ctx.requestId);
});
