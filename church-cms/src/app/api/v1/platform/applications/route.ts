import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listApplicationsQuerySchema,
  listChurchApplications,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listApplicationsQuerySchema);
  const result = await listChurchApplications(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
