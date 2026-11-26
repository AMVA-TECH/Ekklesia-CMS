import {
  withApiHandler,
  parseQuery,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createRole,
  createRoleBodySchema,
  listRoles,
  listRolesQuerySchema,
} from '@/modules/access-control';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listRolesQuerySchema);
  const result = await listRoles(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createRoleBodySchema);
  const role = await createRole(ctx, body);
  return Response.json(
    { data: role },
    { status: 201, headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});
