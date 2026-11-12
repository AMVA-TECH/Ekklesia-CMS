import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  createProject,
  listProjects,
} from '@/modules/finance';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listProjectsQuerySchema);
  const result = await listProjects(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createProjectBodySchema);
  const project = await createProject(ctx, body);
  return jsonCreated(project, ctx.requestId, `/api/v1/projects/${project.id}`);
});
