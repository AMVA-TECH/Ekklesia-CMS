import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { confirmOperatorPin, reauthBodySchema } from '@/modules/platform-ops';

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, reauthBodySchema);
  const result = await confirmOperatorPin(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
