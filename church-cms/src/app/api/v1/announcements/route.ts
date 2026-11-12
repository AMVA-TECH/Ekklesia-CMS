import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createAnnouncementBodySchema, createAnnouncement, listAnnouncements } from '@/modules/messaging';

export const GET = withApiHandler(async (ctx) => {
  const result = await listAnnouncements(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAnnouncementBodySchema);
  const announcement = await createAnnouncement(ctx, body);
  return jsonCreated(announcement, ctx.requestId, `/api/v1/announcements/${announcement.id}`);
});
