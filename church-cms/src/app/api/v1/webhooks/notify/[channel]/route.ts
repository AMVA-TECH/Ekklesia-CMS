import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/platform/config';
import { resolveRequestId, REQUEST_ID_HEADER, toProblemResponse } from '@/platform/http';
import { applyProviderDeliveryUpdate } from '@/modules/messaging';
import { unauthorized, validationFailed } from '@/platform/errors';
import { z } from 'zod';

const bodySchema = z
  .object({
    providerRef: z.string().min(1).max(200),
    status: z.enum(['delivered', 'failed']),
    error: z.string().max(500).optional(),
  })
  .strict();

type RouteCtx = { params: Promise<{ channel: string }> };

/**
 * Provider delivery callbacks (SMS / WhatsApp).
 * Auth: Authorization Bearer NOTIFY_WEBHOOK_SECRET, or
 * X-Notify-Signature = hex(hmac_sha256(rawBody, secret)).
 */
export async function POST(request: Request, routeCtx: RouteCtx): Promise<Response> {
  const requestId = resolveRequestId(request);
  try {
    const channel = (await routeCtx.params).channel;
    if (channel !== 'sms' && channel !== 'whatsapp') {
      throw validationFailed([
        { field: 'channel', code: 'unsupported', message: 'sms or whatsapp only' },
      ]);
    }

    const secret = getEnv().NOTIFY_WEBHOOK_SECRET;
    if (!secret) {
      throw unauthorized('Webhook secret not configured');
    }

    const raw = await request.text();
    assertWebhookAuth(request, raw, secret);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw validationFailed([
        { field: 'body', code: 'invalid_json', message: 'Body must be JSON' },
      ]);
    }
    const parsedBody = bodySchema.safeParse(parsed);
    if (!parsedBody.success) {
      throw validationFailed(
        parsedBody.error.issues.map((i) => ({
          field: i.path.join('.') || 'body',
          code: 'invalid',
          message: i.message,
        })),
      );
    }
    const result = await applyProviderDeliveryUpdate(parsedBody.data);
    return Response.json(
      { data: { ...result, channel } },
      { headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (error) {
    return toProblemResponse(error, requestId);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function assertWebhookAuth(request: Request, raw: string, secret: string): void {
  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    const token = bearer.slice('Bearer '.length);
    if (safeEqual(token, secret)) return;
    throw unauthorized();
  }

  const signature = request.headers.get('x-notify-signature');
  if (signature) {
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (safeEqual(signature, expected)) return;
    throw unauthorized();
  }

  throw unauthorized();
}
