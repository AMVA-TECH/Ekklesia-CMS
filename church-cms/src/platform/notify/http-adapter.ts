import type { NotifyAdapter, NotifyChannel, NotifyMessage, NotifySendResult } from './types';

export type HttpNotifyConfig = {
  smsUrl?: string;
  whatsappUrl?: string;
  apiKey?: string;
  senderId?: string;
  timeoutMs?: number;
};

/**
 * Generic HTTP gateway adapter.
 * Wire Africa's Talking / Beem / Twilio-compatible proxies via NOTIFY_*_URL.
 * Expects JSON response with `providerRef` or `id`.
 */
export function createHttpNotifyAdapter(config: HttpNotifyConfig): NotifyAdapter {
  return {
    name: 'http',
    async send(message: NotifyMessage): Promise<NotifySendResult> {
      const url = urlFor(message.channel, config);
      if (!url) {
        return {
          ok: false,
          error: `NOTIFY_${message.channel.toUpperCase()}_URL not configured`,
          retryable: false,
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 10_000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            channel: message.channel,
            to: message.to,
            body: message.body,
            senderId: config.senderId ?? message.senderId,
            idempotencyKey: message.idempotencyKey,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return {
            ok: false,
            error: `http_${res.status}:${text.slice(0, 200)}`,
            retryable: res.status >= 500 || res.status === 429,
          };
        }
        const json = (await res.json().catch(() => ({}))) as {
          providerRef?: string;
          id?: string;
        };
        const providerRef = json.providerRef ?? json.id;
        if (!providerRef) {
          return { ok: false, error: 'missing_provider_ref', retryable: true };
        }
        return { ok: true, providerRef: String(providerRef) };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { ok: false, error: msg, retryable: true };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function urlFor(channel: NotifyChannel, config: HttpNotifyConfig): string | undefined {
  return channel === 'sms' ? config.smsUrl : config.whatsappUrl;
}
