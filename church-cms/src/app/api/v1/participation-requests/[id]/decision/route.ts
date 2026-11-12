import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  decideParticipationRequestBodySchema,
  decideParticipationRequest,
} from '@/modules/ministries';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideParticipationRequestBodySchema);
  const row = await decideParticipationRequest(ctx, id, body);
  return jsonOk(row, ctx.requestId);
});
