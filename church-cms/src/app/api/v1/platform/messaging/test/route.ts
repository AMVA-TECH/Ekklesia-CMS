import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  messagingTestBodySchema,
  sendMessagingTest,
} from '@/modules/platform-ops';

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, messagingTestBodySchema);
  const result = await sendMessagingTest(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
