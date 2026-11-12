import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import { listRoles, listRolesQuerySchema } from '@/modules/access-control';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listRolesQuerySchema);
  const result = await listRoles(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
