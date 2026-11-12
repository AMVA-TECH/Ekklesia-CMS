import {
  withApiHandler,
  parseJsonBody,
  jsonOk,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  recordAttendanceBodySchema,
  recordAttendance,
  listSessionRecords,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listSessionRecords(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, recordAttendanceBodySchema);
  const session = await recordAttendance(ctx, id, body);
  return jsonOk(session, ctx.requestId);
});
