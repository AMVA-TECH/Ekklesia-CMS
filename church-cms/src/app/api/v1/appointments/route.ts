import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  createAppointment,
  listAppointments,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listAppointmentsQuerySchema);
  const result = await listAppointments(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAppointmentBodySchema);
  const appointment = await createAppointment(ctx, body);
  return jsonCreated(
    appointment,
    ctx.requestId,
    `/api/v1/appointments/${appointment.id}`,
  );
});
