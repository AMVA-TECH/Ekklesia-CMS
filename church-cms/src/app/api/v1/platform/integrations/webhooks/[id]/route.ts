import {
  withPlatformApiHandler,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { getWebhookEvent } from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const GET = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const result = await getWebhookEvent(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
