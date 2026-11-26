import {
  withPlatformApiHandler,
  parseJsonBody,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  getPlatformConfigQuerySchema,
  patchPlatformConfigBodySchema,
  getPlatformConfig,
  patchPlatformConfig,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), getPlatformConfigQuerySchema);
  const result = await getPlatformConfig(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const PATCH = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, patchPlatformConfigBodySchema);
  const result = await patchPlatformConfig(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
