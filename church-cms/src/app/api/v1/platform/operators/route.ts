import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listOperators,
  addOperator,
  addOperatorBodySchema,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  const result = await listOperators(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, addOperatorBodySchema);
  const result = await addOperator(ctx, body);
  return Response.json(result, {
    status: 201,
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
