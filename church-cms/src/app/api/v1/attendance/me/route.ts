import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import { myAttendanceQuerySchema, getMyAttendance } from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, myAttendanceQuerySchema);
  const result = await getMyAttendance(ctx, query);
  return jsonOk(result, ctx.requestId);
});
