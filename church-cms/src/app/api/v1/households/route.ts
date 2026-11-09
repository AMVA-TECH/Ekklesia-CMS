import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { createHouseholdBodySchema, createHousehold } from '@/modules/households';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createHouseholdBodySchema);
  const household = await createHousehold(ctx, body);
  return jsonCreated(household, ctx.requestId, `/api/v1/households/${household.id}`);
});
