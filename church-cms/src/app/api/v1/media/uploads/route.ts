import { withApiHandler, jsonCreated } from '@/platform/http';
import { validationFailed } from '@/platform/errors';
import { uploadMedia } from '@/modules/media';

export const POST = withApiHandler(async (ctx, request) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw validationFailed([
      { field: 'file', code: 'required', message: 'file is required' },
    ]);
  }
  const kindRaw = form.get('kind');
  const kind = typeof kindRaw === 'string' ? kindRaw : undefined;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';
  const media = await uploadMedia(ctx, { bytes, contentType, kind });
  return jsonCreated(media, ctx.requestId, `/api/v1/media/${media.id}`);
});
