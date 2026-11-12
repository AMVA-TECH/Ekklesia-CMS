import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import {
  createProgrammeUnderUnitBodySchema,
  createProgramme,
  listProgrammes,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listProgrammes(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createProgrammeUnderUnitBodySchema);
  const programme = await createProgramme(ctx, { ...body, ministryUnitId: id });
  return jsonCreated(programme, ctx.requestId, `/api/v1/programmes/${programme.id}`);
});
