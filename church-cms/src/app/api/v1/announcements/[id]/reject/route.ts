import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { rejectAnnouncementBodySchema, rejectAnnouncement } from '@/modules/messaging';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, rejectAnnouncementBodySchema);
  const announcement = await rejectAnnouncement(ctx, id, body.note);
  return jsonOk(announcement, ctx.requestId);
});
