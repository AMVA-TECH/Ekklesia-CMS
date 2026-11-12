import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  resolveCorrectionRequestBodySchema,
  resolveCorrectionRequest,
} from '@/modules/events';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, resolveCorrectionRequestBodySchema);
  const row = await resolveCorrectionRequest(ctx, id, body);
  return jsonOk(row, ctx.requestId);
});
