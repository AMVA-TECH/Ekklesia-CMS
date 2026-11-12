import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  createProjectAssignmentBodySchema,
  assignProjectPerson,
} from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createProjectAssignmentBodySchema);
  const assignment = await assignProjectPerson(ctx, id, body);
  return jsonCreated(
    assignment,
    ctx.requestId,
    `/api/v1/projects/${id}/assignments`,
  );
});
