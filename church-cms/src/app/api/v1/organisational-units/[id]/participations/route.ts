import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import {
  addParticipationBodySchema,
  addParticipation,
  listParticipations,
} from '@/modules/ministries';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const result = await listParticipations(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, addParticipationBodySchema);
  const participation = await addParticipation(ctx, id, body);
  return jsonCreated(
    participation,
    ctx.requestId,
    `/api/v1/participations/${participation.id}`,
  );
});
