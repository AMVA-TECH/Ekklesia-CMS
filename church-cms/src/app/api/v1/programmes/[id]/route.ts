import {
  withApiHandler,
  jsonOk,
  parseJsonBody,
} from '@/platform/http';
import {
  updateProgramme,
  updateProgrammeBodySchema,
} from '@/modules/organisation';

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateProgrammeBodySchema);
  const programme = await updateProgramme(ctx, id, body);
  return jsonOk(programme, ctx.requestId);
});
