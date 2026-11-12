import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  openAttendanceSessionBodySchema,
  openAttendanceSession,
  listAttendanceSessions,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listAttendanceSessions(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, openAttendanceSessionBodySchema);
  const session = await openAttendanceSession(ctx, id, body);
  return jsonCreated(
    session,
    ctx.requestId,
    `/api/v1/attendance-sessions/${session.id}`,
  );
});
