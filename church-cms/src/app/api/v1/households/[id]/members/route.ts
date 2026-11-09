import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { addHouseholdMemberBodySchema, addHouseholdMember } from '@/modules/households';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, addHouseholdMemberBodySchema);
  const household = await addHouseholdMember(ctx, id, body);
  return jsonOk(household, ctx.requestId);
});
