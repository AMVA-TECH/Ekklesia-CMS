import { getEnv } from '@/platform/config';
import { createBriqNotifyAdapter } from './briq-adapter';
import { createHttpNotifyAdapter } from './http-adapter';
import { createSmsGateNotifyAdapter } from './smsgate-adapter';
import { createStubNotifyAdapter } from './stub-adapter';
import type { NotifyAdapter } from './types';

export type { NotifyAdapter, NotifyChannel, NotifyMessage, NotifySendResult } from './types';
export { createStubNotifyAdapter } from './stub-adapter';
export { createHttpNotifyAdapter } from './http-adapter';
export {
  createSmsGateNotifyAdapter,
  normalizeSmsGatePhone,
} from './smsgate-adapter';
export { createBriqNotifyAdapter, normalizeBriqRecipient } from './briq-adapter';
export { verifyBriqSignature } from './briq-webhook';

let cached: NotifyAdapter | null = null;

/** Resolve outbound notify adapter from env (stub by default). */
export function getNotifyAdapter(): NotifyAdapter {
  if (cached) return cached;
  const env = getEnv();

  if (env.NOTIFY_PROVIDER === 'briq') {
    if (!env.BRIQ_API_KEY || !env.BRIQ_SENDER_ID) {
      throw new Error('NOTIFY_PROVIDER=briq requires BRIQ_API_KEY and BRIQ_SENDER_ID');
    }
    cached = createBriqNotifyAdapter({
      apiKey: env.BRIQ_API_KEY,
      baseUrl: env.BRIQ_BASE_URL,
      senderId: env.BRIQ_SENDER_ID,
      appId: env.BRIQ_APP_ID,
      whatsappSender: env.BRIQ_WHATSAPP_SENDER,
    });
  } else if (env.NOTIFY_PROVIDER === 'smsgate') {
    if (!env.SMSGATE_URL || !env.SMSGATE_USERNAME || !env.SMSGATE_PASSWORD) {
      throw new Error(
        'NOTIFY_PROVIDER=smsgate requires SMSGATE_URL, SMSGATE_USERNAME, SMSGATE_PASSWORD',
      );
    }
    if (!env.SMS_TEST_RECIPIENTS) {
      throw new Error(
        'NOTIFY_PROVIDER=smsgate requires SMS_TEST_RECIPIENTS (comma list or *)',
      );
    }
    cached = createSmsGateNotifyAdapter({
      url: env.SMSGATE_URL,
      username: env.SMSGATE_USERNAME,
      password: env.SMSGATE_PASSWORD,
      timeoutMs: env.SMSGATE_TIMEOUT * 1000,
      testRecipients: env.SMS_TEST_RECIPIENTS,
    });
  } else if (env.NOTIFY_PROVIDER === 'http') {
    cached = createHttpNotifyAdapter({
      smsUrl: env.NOTIFY_SMS_URL,
      whatsappUrl: env.NOTIFY_WHATSAPP_URL,
      apiKey: env.NOTIFY_API_KEY,
      senderId: env.NOTIFY_SENDER_ID,
    });
  } else {
    cached = createStubNotifyAdapter();
  }
  return cached;
}

/** Test helper. */
export function setNotifyAdapterForTests(adapter: NotifyAdapter | null): void {
  cached = adapter;
}
