import {
  withApiHandler,
  jsonOk,
  parseJsonBody,
} from '@/platform/http';
import {
  getOrganisationalUnit,
  updateOrganisationalUnit,
  updateUnitBodySchema,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const unit = await getOrganisationalUnit(ctx, id);
  return jsonOk(unit, ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateUnitBodySchema);
  const unit = await updateOrganisationalUnit(ctx, id, body);
  return jsonOk(unit, ctx.requestId);
});
