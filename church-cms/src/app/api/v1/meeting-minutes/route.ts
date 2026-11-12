import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createMeetingMinutesBodySchema,
  createMeetingMinutes,
  listMeetingMinutes,
} from '@/modules/governance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listMeetingMinutes(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createMeetingMinutesBodySchema);
  const row = await createMeetingMinutes(ctx, body);
  return jsonCreated(row, ctx.requestId, `/api/v1/meeting-minutes/${row.id}`);
});
