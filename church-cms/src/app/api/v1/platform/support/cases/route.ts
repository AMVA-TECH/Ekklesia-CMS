import {
  withPlatformApiHandler,
  parseJsonBody,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createSupportCaseBodySchema,
  listSupportCasesQuerySchema,
  createSupportCase,
  listSupportCases,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listSupportCasesQuerySchema);
  const result = await listSupportCases(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createSupportCaseBodySchema);
  const result = await createSupportCase(ctx, body);
  return Response.json(result, {
    status: 201,
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
