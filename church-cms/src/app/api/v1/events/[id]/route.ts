import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { getEvent, updateEvent, updateEventBodySchema } from '@/modules/events';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getEvent(ctx, id), ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateEventBodySchema);
  return jsonOk(await updateEvent(ctx, id, body), ctx.requestId);
});
