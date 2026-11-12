import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  updateMembershipStatusBodySchema,
  getMembership,
  changeMembershipStatus,
} from '@/modules/membership';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const membership = await getMembership(ctx, id);
  return jsonOk(membership, ctx.requestId);
});

/** @deprecated Prefer POST /memberships/{id}/status — kept for existing clients. */
export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateMembershipStatusBodySchema);
  const membership = await changeMembershipStatus(ctx, id, body);
  return jsonOk(membership, ctx.requestId);
});
