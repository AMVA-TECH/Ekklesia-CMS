import { z } from 'zod';
import { getEnv } from '@/platform/config';
import { verifyBriqSignature } from '@/platform/notify/briq-webhook';
import { resolveRequestId, REQUEST_ID_HEADER, toProblemResponse } from '@/platform/http';
import { unauthorized, validationFailed } from '@/platform/errors';
import { applyBriqWebhookEvent } from '@/modules/messaging';

/**
 * Briq Karibu SMS/WhatsApp webhooks.
 * Register this HTTPS URL in the Briq developer app console.
 * @see https://docs.briq.tz/guides/webhooks
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = resolveRequestId(request);
  try {
    const env = getEnv();
    const secret = env.BRIQ_WEBHOOK_SECRET ?? env.NOTIFY_WEBHOOK_SECRET;
    const raw = await request.text();

    if (secret) {
      const signature = request.headers.get('x-briq-signature');
      if (!signature || !verifyBriqSignature(raw, secret, signature)) {
        throw unauthorized('Invalid Briq webhook signature');
      }
    } else if (env.NODE_ENV === 'production') {
      throw unauthorized('BRIQ_WEBHOOK_SECRET required in production');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw validationFailed([
        { field: 'body', code: 'invalid_json', message: 'Body must be JSON' },
      ]);
    }

    const envelope = briqEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      throw validationFailed(
        envelope.error.issues.map((i) => ({
          field: i.path.join('.') || 'body',
          code: 'invalid',
          message: i.message,
        })),
      );
    }

    if (env.BRIQ_APP_ID && envelope.data.app_id !== env.BRIQ_APP_ID) {
      throw unauthorized('Unexpected Briq app_id');
    }

    const result = await applyBriqWebhookEvent({
      event: envelope.data.event,
      jobId: envelope.data.data.job_id,
      messageId: envelope.data.data.message_id,
      error: envelope.data.data.status,
    });

    return Response.json(
      { data: { accepted: true, eventId: envelope.data.id, ...result } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (error) {
    return toProblemResponse(error, requestId);
  }
}

const briqEnvelopeSchema = z
  .object({
    id: z.string().min(1),
    event: z.string().min(1),
    channel: z.string().optional(),
    app_id: z.string().optional(),
    created_at: z.string().optional(),
    data: z
      .object({
        job_id: z.string().optional(),
        message_id: z.string().optional(),
        recipient: z.string().optional(),
        status: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
