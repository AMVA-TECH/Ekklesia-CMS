import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  decideProjectInterestBodySchema,
  decideProjectInterest,
} from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideProjectInterestBodySchema);
  const interest = await decideProjectInterest(ctx, id, body);
  return jsonOk(interest, ctx.requestId);
});
