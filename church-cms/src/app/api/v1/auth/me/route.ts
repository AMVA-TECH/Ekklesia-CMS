import { withApiHandler, jsonOk } from '@/platform/http';
import { getAuthMe } from '@/platform/auth';

export const GET = withApiHandler(async (ctx) => {
  return jsonOk(await getAuthMe(ctx), ctx.requestId);
});
