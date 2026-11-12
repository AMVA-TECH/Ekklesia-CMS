import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { createPersonContactBodySchema, addPersonContact } from '@/modules/people';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createPersonContactBodySchema);
  const person = await addPersonContact(ctx, id, body);
  return jsonOk(person, ctx.requestId);
});
