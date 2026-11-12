import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { getMediaContent } from '@/modules/media';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const media = await getMediaContent(ctx, id);
  return new Response(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      'Content-Type': media.contentType,
      'Content-Length': String(media.byteSize),
      'Cache-Control': 'private, max-age=3600',
      [REQUEST_ID_HEADER]: ctx.requestId,
    },
  });
});
