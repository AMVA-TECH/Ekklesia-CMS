import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  jsonOk,
} from '@/platform/http';
import {
  createHouseholdBodySchema,
  listHouseholdsQuerySchema,
  createHousehold,
  listHouseholds,
} from '@/modules/households';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listHouseholdsQuerySchema);
  const result = await listHouseholds(ctx, query);
  return jsonOk(result, ctx.requestId);
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createHouseholdBodySchema);
  const household = await createHousehold(ctx, body);
  return jsonCreated(household, ctx.requestId, `/api/v1/households/${household.id}`);
});
