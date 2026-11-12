import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import { familyAttendanceQuerySchema, getFamilyAttendance } from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, familyAttendanceQuerySchema);
  const result = await getFamilyAttendance(ctx, query);
  return jsonOk(result, ctx.requestId);
});
