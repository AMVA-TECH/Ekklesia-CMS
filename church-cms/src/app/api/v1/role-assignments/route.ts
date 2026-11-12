import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createRoleAssignment,
  createRoleAssignmentBodySchema,
  listRoleAssignments,
  listRoleAssignmentsQuerySchema,
} from '@/modules/access-control';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listRoleAssignmentsQuerySchema);
  const result = await listRoleAssignments(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createRoleAssignmentBodySchema);
  const assignment = await createRoleAssignment(ctx, body);
  return jsonCreated(
    assignment,
    ctx.requestId,
    `/api/v1/role-assignments/${assignment.id}`,
  );
});
