import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createDelegationBodySchema,
  listDelegationsQuerySchema,
  createDelegation,
  listDelegations,
} from '@/modules/governance';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listDelegationsQuerySchema);
  const result = await listDelegations(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createDelegationBodySchema);
  const delegation = await createDelegation(ctx, body);
  return jsonCreated(delegation, ctx.requestId, `/api/v1/delegations/${delegation.id}`);
});
