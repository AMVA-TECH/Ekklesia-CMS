import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createEventRegistrationBodySchema,
  listEventRegistrations,
  registerForEvent,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listEventRegistrations(ctx, id);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createEventRegistrationBodySchema);
  const registration = await registerForEvent(ctx, id, body);
  return jsonCreated(
    registration,
    ctx.requestId,
    `/api/v1/events/${id}/registrations`,
  );
});
