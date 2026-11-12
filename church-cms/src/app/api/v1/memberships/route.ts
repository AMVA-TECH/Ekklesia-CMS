import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  jsonOk,
} from '@/platform/http';
import {
  createMembershipBodySchema,
  listMembershipsQuerySchema,
  createMembership,
  listMemberships,
} from '@/modules/membership';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listMembershipsQuerySchema);
  const result = await listMemberships(ctx, query);
  return jsonOk(result, ctx.requestId);
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createMembershipBodySchema);
  const membership = await createMembership(ctx, body);
  return jsonCreated(membership, ctx.requestId, `/api/v1/memberships/${membership.id}`);
});
