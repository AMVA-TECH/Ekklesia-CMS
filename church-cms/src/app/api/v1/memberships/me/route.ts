import { withApiHandler, jsonOk } from '@/platform/http';
import { getMyMembership } from '@/modules/membership';

export const GET = withApiHandler(async (ctx) => {
  const membership = await getMyMembership(ctx);
  return jsonOk(membership, ctx.requestId);
});
