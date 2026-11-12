import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { conflict } from '@/platform/errors';
import { qrCheckInBodySchema, checkInWithQr } from '@/modules/events';

/** Authenticated self / usher QR check-in. */
export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const sessionId = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, qrCheckInBodySchema);
  const result = await checkInWithQr(ctx, body);
  if (result.sessionId !== sessionId) {
    throw conflict('QR token does not belong to this session.');
  }
  return jsonOk(result, ctx.requestId);
});
