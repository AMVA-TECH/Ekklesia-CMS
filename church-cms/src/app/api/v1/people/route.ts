import { withApiHandler, parseJsonBody, parseQuery, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import {
  createPersonBodySchema,
  listPeopleQuerySchema,
  createPerson,
  listPeople,
} from '@/modules/people';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listPeopleQuerySchema);
  const result = await listPeople(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createPersonBodySchema);
  const person = await createPerson(ctx, body);
  return jsonCreated(person, ctx.requestId, `/api/v1/people/${person.id}`);
});
