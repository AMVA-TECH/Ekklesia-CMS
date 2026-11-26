import { withApiHandler, jsonOk } from '@/platform/http';
import { listUnitAccessImpact } from '@/modules/access-control';

/**
 * Lists active unit-scoped role assignments for deactivate/reparent review.
 */
export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const impact = await listUnitAccessImpact(ctx, id);
  return jsonOk(impact, ctx.requestId);
});
