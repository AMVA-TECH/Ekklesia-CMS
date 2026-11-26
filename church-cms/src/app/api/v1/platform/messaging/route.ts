import { withPlatformApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { getMessagingOpsOverview } from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  const result = await getMessagingOpsOverview(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
