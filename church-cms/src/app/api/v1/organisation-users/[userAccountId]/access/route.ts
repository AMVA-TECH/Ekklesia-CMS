import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { getMemberAccess } from '@/modules/access-control';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx!.params;
  const access = await getMemberAccess(ctx, params.userAccountId);
  return Response.json(
    { data: access },
    { headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});
