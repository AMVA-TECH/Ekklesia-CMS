import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listWebhookEventsQuerySchema,
  listWebhookEvents,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listWebhookEventsQuerySchema);
  const result = await listWebhookEvents(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
