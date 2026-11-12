import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import {
  leadershipAttendanceStatsQuerySchema,
  getLeadershipAttendanceStats,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, leadershipAttendanceStatsQuerySchema);
  const result = await getLeadershipAttendanceStats(ctx, query);
  return jsonOk(result, ctx.requestId);
});
