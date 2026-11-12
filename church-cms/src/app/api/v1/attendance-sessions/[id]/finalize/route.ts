import { withApiHandler, jsonOk } from '@/platform/http';
import { finalizeAttendanceSession } from '@/modules/events';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const session = await finalizeAttendanceSession(ctx, id);
  return jsonOk(session, ctx.requestId);
});
