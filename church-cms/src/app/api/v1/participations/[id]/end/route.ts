import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { endParticipationBodySchema, endParticipation } from '@/modules/ministries';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, endParticipationBodySchema);
  const participation = await endParticipation(ctx, id, body);
  return jsonOk(participation, ctx.requestId);
});
