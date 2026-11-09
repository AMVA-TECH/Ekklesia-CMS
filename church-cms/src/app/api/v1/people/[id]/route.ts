import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { updatePersonBodySchema, getPerson, updatePerson } from '@/modules/people';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const person = await getPerson(ctx, id);
  return jsonOk(person, ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updatePersonBodySchema);
  const person = await updatePerson(ctx, id, body);
  return jsonOk(person, ctx.requestId);
});
