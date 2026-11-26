import { withApiHandler, jsonOk } from '@/platform/http';
import { listAppointmentHistory } from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listAppointmentHistory(ctx, id);
  return jsonOk(result.data, ctx.requestId);
});
