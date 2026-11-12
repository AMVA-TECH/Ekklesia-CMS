import { withApiHandler, jsonOk } from '@/platform/http';
import { getOrganisationalUnit } from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const unit = await getOrganisationalUnit(ctx, id);
  return jsonOk(unit, ctx.requestId);
});
