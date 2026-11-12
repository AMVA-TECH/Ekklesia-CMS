export type NotifyChannel = 'sms' | 'whatsapp';

export type NotifyMessage = {
  channel: NotifyChannel;
  to: string;
  body: string;
  /** Correlation for provider + our delivery row. */
  idempotencyKey: string;
  senderId?: string;
};

export type NotifySendResult =
  | { ok: true; providerRef: string }
  | { ok: false; error: string; retryable?: boolean };

/** Outbound SMS / WhatsApp adapter — secrets from env only. */
export interface NotifyAdapter {
  readonly name: string;
  send(message: NotifyMessage): Promise<NotifySendResult>;
}
