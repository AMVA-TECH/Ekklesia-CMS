import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  decideJoinRequest,
  decideJoinRequestBodySchema,
} from '@/modules/membership';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideJoinRequestBodySchema);
  return jsonOk(await decideJoinRequest(ctx, id, body), ctx.requestId);
});
