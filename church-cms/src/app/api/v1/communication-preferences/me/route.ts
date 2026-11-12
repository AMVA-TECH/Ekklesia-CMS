import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { updatePreferencesBodySchema, getMyPreferences, updateMyPreferences } from '@/modules/messaging';

export const GET = withApiHandler(async (ctx) => {
  return jsonOk(await getMyPreferences(ctx), ctx.requestId);
});

export const PUT = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, updatePreferencesBodySchema);
  return jsonOk(await updateMyPreferences(ctx, body), ctx.requestId);
});
