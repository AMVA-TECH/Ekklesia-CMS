import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createAccessReviewBodySchema,
  createAccessReview,
  listAccessReviews,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  const result = await listAccessReviews(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAccessReviewBodySchema);
  const result = await createAccessReview(ctx, body);
  return Response.json(result, {
    status: 201,
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
