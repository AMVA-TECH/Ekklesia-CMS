import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import { listDirectoryQuerySchema, listDirectory } from '@/modules/people';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listDirectoryQuerySchema);
  const result = await listDirectory(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
