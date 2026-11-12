import { withPlatformApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { getHealth } from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  const result = await getHealth(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
