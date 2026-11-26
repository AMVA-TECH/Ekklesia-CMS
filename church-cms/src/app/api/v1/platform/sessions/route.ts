import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listSessionsQuerySchema,
  listAccountSessions,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listSessionsQuerySchema);
  const result = await listAccountSessions(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
