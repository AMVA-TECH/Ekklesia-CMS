import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  updateHouseholdBodySchema,
  getHousehold,
  updateHousehold,
} from '@/modules/households';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const household = await getHousehold(ctx, id);
  return jsonOk(household, ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateHouseholdBodySchema);
  const household = await updateHousehold(ctx, id, body);
  return jsonOk(household, ctx.requestId);
});
