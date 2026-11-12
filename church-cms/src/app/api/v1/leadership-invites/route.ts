import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  inviteLeadership,
  inviteLeadershipBodySchema,
} from '@/modules/access-control';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, inviteLeadershipBodySchema);
  const result = await inviteLeadership(ctx, body);
  return jsonCreated(
    result,
    ctx.requestId,
    `/api/v1/leadership-invites/${result.userAccountId}`,
  );
});
