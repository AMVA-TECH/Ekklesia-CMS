import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  getCurrentChurch,
  updateCurrentChurch,
  updateChurchBodySchema,
} from '@/modules/churches';

export const GET = withApiHandler(async (ctx) => {
  return jsonOk(await getCurrentChurch(ctx), ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, updateChurchBodySchema);
  return jsonOk(await updateCurrentChurch(ctx, body), ctx.requestId);
});
