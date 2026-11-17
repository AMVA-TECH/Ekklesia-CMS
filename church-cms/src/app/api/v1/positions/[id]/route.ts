import {
  withApiHandler,
  jsonOk,
  parseJsonBody,
} from '@/platform/http';
import {
  getPosition,
  updatePosition,
  updatePositionBodySchema,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const position = await getPosition(ctx, id);
  return jsonOk(position, ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updatePositionBodySchema);
  const position = await updatePosition(ctx, id, body);
  return jsonOk(position, ctx.requestId);
});
