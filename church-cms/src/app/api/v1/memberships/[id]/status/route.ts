import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  updateMembershipStatusBodySchema,
  changeMembershipStatus,
} from '@/modules/membership';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateMembershipStatusBodySchema);
  const membership = await changeMembershipStatus(ctx, id, body);
  return jsonOk(membership, ctx.requestId);
});
