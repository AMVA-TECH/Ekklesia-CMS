import {
  withPlatformApiHandler,
  parseJsonBody,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createChurchBodySchema,
  createPlatformChurch,
  listChurchesQuerySchema,
  listPlatformChurches,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listChurchesQuerySchema);
  const result = await listPlatformChurches(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createChurchBodySchema);
  const result = await createPlatformChurch(ctx, body);
  return Response.json(result, {
    status: 201,
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
