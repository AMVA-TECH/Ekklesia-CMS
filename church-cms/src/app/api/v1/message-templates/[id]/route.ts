import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  getMessageTemplate,
  updateMessageTemplate,
  updateTemplateBodySchema,
} from '@/modules/messaging';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getMessageTemplate(ctx, id), ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateTemplateBodySchema);
  return jsonOk(await updateMessageTemplate(ctx, id, body), ctx.requestId);
});
