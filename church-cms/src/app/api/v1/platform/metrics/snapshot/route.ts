import { withPlatformApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { snapshotMetrics } from '@/modules/platform-ops';

export const POST = withPlatformApiHandler(async (ctx) => {
  const result = await snapshotMetrics(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
