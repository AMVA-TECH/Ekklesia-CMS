import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createPositionBodySchema,
  listPositionsQuerySchema,
  createPosition,
  listPositions,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listPositionsQuerySchema);
  const result = await listPositions(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createPositionBodySchema);
  const position = await createPosition(ctx, body);
  return jsonCreated(position, ctx.requestId, `/api/v1/positions/${position.id}`);
});
