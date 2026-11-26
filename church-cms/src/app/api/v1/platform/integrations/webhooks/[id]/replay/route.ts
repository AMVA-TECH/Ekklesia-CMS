import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  replayWebhookBodySchema,
  replayWebhookEvent,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const body = await parseJsonBody(request, replayWebhookBodySchema);
  const result = await replayWebhookEvent(ctx, id, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
