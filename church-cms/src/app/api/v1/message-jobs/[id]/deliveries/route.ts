import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { listMessageJobDeliveries } from '@/modules/messaging';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listMessageJobDeliveries(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
