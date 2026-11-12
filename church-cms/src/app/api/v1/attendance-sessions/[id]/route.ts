import { withApiHandler, jsonOk } from '@/platform/http';
import { getAttendanceSession } from '@/modules/events';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const session = await getAttendanceSession(ctx, id);
  return jsonOk(session, ctx.requestId);
});
