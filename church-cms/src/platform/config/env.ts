import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  /**
   * Tenant RLS transaction driver:
   * - `auto` (default): local pg + Neon WebSocket Pool when WebSocket exists
   * - `on`: always use transactional client (Neon WS on hosted)
   * - `off`: skip set_config txs; rely on app church_id filters only
   */
  DATABASE_TX_MODE: z.enum(['auto', 'on', 'off']).default('auto'),
  APP_URL: z.string().url().optional(),

  /**
   * Optional root domain (no protocol). Reserved for future host routing;
   * platform console is path-based at `/platform` on the main app host.
   */
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).optional(),
  /** Legacy subdomain label (default `platform`); redirects to `/platform`. */
  NEXT_PUBLIC_PLATFORM_SUBDOMAIN: z.string().min(1).optional(),
  /** Legacy full host override; redirects to main-app `/platform`. */
  NEXT_PUBLIC_PLATFORM_HOST: z.string().min(1).optional(),

  /** Better Auth (ADR-0002). Required for real login; generate with `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /** Public origin Better Auth uses for callbacks/cookies (defaults to APP_URL). */
  BETTER_AUTH_URL: z.string().url().optional(),
  /**
   * When "1" (and not production), allow x-dev-* headers as a session fallback.
   * Must never be "1" in production deploys.
   */
  ALLOW_DEV_AUTH: z.enum(['0', '1']).default('1'),

  /** stub (default) | smsgate (testing) | briq (prod) | http (generic) */
  NOTIFY_PROVIDER: z.enum(['stub', 'smsgate', 'briq', 'http']).default('stub'),
  NOTIFY_SMS_URL: z.string().url().optional(),
  NOTIFY_WHATSAPP_URL: z.string().url().optional(),
  NOTIFY_API_KEY: z.string().min(1).optional(),
  NOTIFY_SENDER_ID: z.string().min(1).optional(),
  /** Shared secret for generic notify webhooks (Bearer / plain HMAC). */
  NOTIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** When "1", createMessageJob also dispatches via the adapter. */
  NOTIFY_AUTO_DISPATCH: z.enum(['0', '1']).default('0'),

  /**
   * SMSGate (Android SMS Gateway) — testing only, same as RentFlow.
   * @see https://docs.sms-gate.app/
   */
  SMSGATE_URL: z.string().url().optional(),
  SMSGATE_USERNAME: z.string().min(1).optional(),
  SMSGATE_PASSWORD: z.string().min(1).optional(),
  SMSGATE_TIMEOUT: z.coerce.number().int().positive().default(15),
  /** Comma-separated numbers or `*` (allow all). Required when NOTIFY_PROVIDER=smsgate. */
  SMS_TEST_RECIPIENTS: z.string().min(1).optional(),
  /** Comma-separated emails or `*` (allow all) for platform messaging test emails. */
  EMAIL_TEST_RECIPIENTS: z.string().min(1).optional(),

  /** Briq Karibu — https://docs.briq.tz */
  BRIQ_API_KEY: z.string().min(1).optional(),
  BRIQ_BASE_URL: z.string().url().default('https://karibu.briq.tz'),
  BRIQ_SENDER_ID: z.string().min(1).optional(),
  BRIQ_APP_ID: z.string().min(1).optional(),
  BRIQ_WHATSAPP_SENDER: z.string().min(1).optional(),
  /** Webhook signing secret (X-Briq-Signature: sha256=…). Falls back to NOTIFY_WEBHOOK_SECRET. */
  BRIQ_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validate process.env once. Call from server entrypoints only. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper to clear cached env. */
export function resetEnvCache(): void {
  cached = null;
}
