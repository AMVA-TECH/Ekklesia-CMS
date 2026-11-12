import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createChurchBodySchema,
  createPlatformChurch,
  listPlatformChurches,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  const result = await listPlatformChurches(ctx);
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
