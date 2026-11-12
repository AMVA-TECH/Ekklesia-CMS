import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { endAppointmentBodySchema, endAppointment } from '@/modules/organisation';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, endAppointmentBodySchema);
  const appointment = await endAppointment(ctx, id, body);
  return jsonOk(appointment, ctx.requestId);
});
