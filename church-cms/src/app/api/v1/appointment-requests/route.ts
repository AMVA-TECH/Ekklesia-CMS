import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createAppointmentRequestBodySchema,
  createAppointmentRequest,
  listAppointmentRequests,
} from '@/modules/governance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listAppointmentRequests(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAppointmentRequestBodySchema);
  const row = await createAppointmentRequest(ctx, body);
  return jsonCreated(row, ctx.requestId, `/api/v1/appointment-requests/${row.id}`);
});
