import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createAbsenceNoticeBodySchema,
  listAbsenceNoticesQuerySchema,
  createAbsenceNotice,
  listAbsenceNotices,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listAbsenceNoticesQuerySchema);
  const result = await listAbsenceNotices(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAbsenceNoticeBodySchema);
  const notice = await createAbsenceNotice(ctx, body);
  return jsonCreated(notice, ctx.requestId, `/api/v1/absence-notices/${notice.id}`);
});
