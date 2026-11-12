import type { NotifyAdapter, NotifyMessage, NotifySendResult } from './types';

/**
 * Local/dev provider: does not call the network.
 * Marks sends successful with a stub provider ref.
 */
export function createStubNotifyAdapter(): NotifyAdapter {
  return {
    name: 'stub',
    async send(message: NotifyMessage): Promise<NotifySendResult> {
      if (!message.to.trim()) {
        return { ok: false, error: 'empty_to', retryable: false };
      }
      const providerRef = `stub:${message.channel}:${message.idempotencyKey}`;
      if (process.env.NOTIFY_STUB_LOG !== '0') {
        console.info(
          `[notify:stub] ${message.channel} → ${message.to.slice(0, 6)}… (${message.body.length} chars)`,
        );
      }
      return { ok: true, providerRef };
    },
  };
}
