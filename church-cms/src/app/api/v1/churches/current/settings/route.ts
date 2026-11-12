import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  getCurrentChurchSettings,
  updateCurrentChurchSettings,
  updateChurchSettingsBodySchema,
} from '@/modules/churches';

export const GET = withApiHandler(async (ctx) => {
  return jsonOk(await getCurrentChurchSettings(ctx), ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, updateChurchSettingsBodySchema);
  return jsonOk(await updateCurrentChurchSettings(ctx, body), ctx.requestId);
});
