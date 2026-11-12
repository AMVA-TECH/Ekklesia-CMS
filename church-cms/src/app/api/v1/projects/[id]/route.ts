import { withApiHandler, jsonOk } from '@/platform/http';
import { getProject } from '@/modules/finance';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const project = await getProject(ctx, id);
  return jsonOk(project, ctx.requestId);
});
