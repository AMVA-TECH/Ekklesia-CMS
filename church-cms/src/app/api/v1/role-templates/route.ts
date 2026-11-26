import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { listRoleTemplates } from '@/modules/access-control';

export const GET = withApiHandler(async (ctx) => {
  const result = await listRoleTemplates(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
