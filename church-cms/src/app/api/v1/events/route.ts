import { withApiHandler, parseJsonBody, parseQuery, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import {
  createEventBodySchema,
  listEventsQuerySchema,
  createEvent,
  listEvents,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listEventsQuerySchema);
  const result = await listEvents(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createEventBodySchema);
  const event = await createEvent(ctx, body);
  return jsonCreated(event, ctx.requestId, `/api/v1/events/${event.id}`);
});
