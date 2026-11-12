import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  createParticipationRequestBodySchema,
  createParticipationRequest,
} from '@/modules/ministries';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createParticipationRequestBodySchema);
  const row = await createParticipationRequest(ctx, body);
  return jsonCreated(row, ctx.requestId, `/api/v1/participation-requests/${row.id}`);
});
