import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  updateMyProfileBodySchema,
  getMyProfile,
  updateMyProfile,
} from '@/modules/people';

export const GET = withApiHandler(async (ctx) => {
  const person = await getMyProfile(ctx);
  return jsonOk(person, ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, updateMyProfileBodySchema);
  const person = await updateMyProfile(ctx, body);
  return jsonOk(person, ctx.requestId);
});
