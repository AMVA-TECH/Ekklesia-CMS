import type { NotifyAdapter, NotifyMessage, NotifySendResult } from './types';

export type BriqConfig = {
  apiKey: string;
  baseUrl?: string;
  senderId: string;
  appId?: string;
  whatsappSender?: string;
  timeoutMs?: number;
};

/**
 * Briq Karibu adapter — https://docs.briq.tz
 * SMS: POST /v1/message/send-instant
 * WhatsApp text: POST /v1/whatsapp/messages/text (needs open 24h window)
 */
export function createBriqNotifyAdapter(config: BriqConfig): NotifyAdapter {
  const baseUrl = (config.baseUrl ?? 'https://karibu.briq.tz').replace(/\/$/, '');

  return {
    name: 'briq',
    async send(message: NotifyMessage): Promise<NotifySendResult> {
      if (message.channel === 'sms') {
        return sendSms(baseUrl, config, message);
      }
      return sendWhatsAppText(baseUrl, config, message);
    },
  };
}

/** Briq accepts 255…, +255…, or national; we send E.164 digits with optional +. */
export function normalizeBriqRecipient(to: string): string {
  const trimmed = to.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  return trimmed.replace(/\D/g, '');
}

async function sendSms(
  baseUrl: string,
  config: BriqConfig,
  message: NotifyMessage,
): Promise<NotifySendResult> {
  const recipient = normalizeBriqRecipient(message.to);
  if (!recipient) {
    return { ok: false, error: 'empty_to', retryable: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 15_000);
  try {
    const res = await fetch(`${baseUrl}/v1/message/send-instant`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-API-Key': config.apiKey,
        ...(config.appId ? { 'X-App-ID': config.appId } : {}),
      },
      body: JSON.stringify({
        content: message.body,
        recipients: [recipient],
        sender_id: config.senderId,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: {
      success?: boolean;
      job_id?: string;
      status?: string;
      message?: string;
      errors?: { message?: string }[];
      detail?: unknown;
    } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-json */
    }

    if (!res.ok) {
      const err =
        json.errors?.[0]?.message ??
        json.message ??
        `http_${res.status}:${text.slice(0, 200)}`;
      return {
        ok: false,
        error: err,
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    if (json.success === false || !json.job_id) {
      return {
        ok: false,
        error: json.message ?? 'briq_send_rejected',
        retryable: false,
      };
    }

    // Correlate webhooks via data.job_id (submit) then message_id (DLR).
    return { ok: true, providerRef: `briq:job:${json.job_id}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

async function sendWhatsAppText(
  baseUrl: string,
  config: BriqConfig,
  message: NotifyMessage,
): Promise<NotifySendResult> {
  const to = normalizeBriqRecipient(message.to);
  if (!to) {
    return { ok: false, error: 'empty_to', retryable: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 15_000);
  try {
    const payload: Record<string, string> = { to, body: message.body };
    if (config.whatsappSender) payload.sender = config.whatsappSender;

    const res = await fetch(`${baseUrl}/v1/whatsapp/messages/text`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: {
      message_id?: string;
      status?: string;
      detail?: string | { code?: string; message?: string };
      errors?: { code?: string; message?: string }[];
    } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-json */
    }

    if (!res.ok) {
      const code =
        typeof json.detail === 'object' && json.detail?.code
          ? json.detail.code
          : json.errors?.[0]?.code;
      const err =
        (typeof json.detail === 'string' ? json.detail : json.detail?.message) ??
        json.errors?.[0]?.message ??
        `http_${res.status}:${text.slice(0, 200)}`;
      return {
        ok: false,
        error: code ? `${code}:${err}` : err,
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    if (!json.message_id) {
      return { ok: false, error: 'missing_message_id', retryable: true };
    }
    return { ok: true, providerRef: `briq:msg:${json.message_id}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}
