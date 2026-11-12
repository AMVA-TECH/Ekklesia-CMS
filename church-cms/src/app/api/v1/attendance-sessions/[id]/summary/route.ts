import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  upsertAttendanceSummaryBodySchema,
  upsertAttendanceSummary,
} from '@/modules/events';

export const PUT = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, upsertAttendanceSummaryBodySchema);
  const session = await upsertAttendanceSummary(ctx, id, body);
  return jsonOk(session, ctx.requestId);
});
