import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { issueQrTokenBodySchema, issueSessionQrToken } from '@/modules/events';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, issueQrTokenBodySchema);
  const issued = await issueSessionQrToken(ctx, id, body);
  return jsonCreated(
    issued,
    ctx.requestId,
    `/api/v1/attendance-sessions/${id}/qr`,
  );
});
