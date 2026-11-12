import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { phoneNumber, twoFactor } from 'better-auth/plugins';
import { and, eq, isNull } from 'drizzle-orm';

import { getEnv } from '@/platform/config';
import { getDb } from '@/platform/db/client';
import { organisationUsers } from '@/modules/people/db-schema';
import * as authSchema from './db-schema';
import { deliverAuthOtp } from './otp-delivery';

function resolveBaseURL(env: ReturnType<typeof getEnv>): string {
  return (
    env.BETTER_AUTH_URL ??
    env.APP_URL ??
    'http://127.0.0.1:3000'
  );
}

function createAuth() {
  const env = getEnv();
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required (min 32 chars)');
  }

  return betterAuth({
    baseURL: resolveBaseURL(env),
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
        // modelName override maps Better Auth "twoFactor" → SQL/drizzle "two_factor"
        two_factor: authSchema.twoFactor,
        twoFactor: authSchema.twoFactor,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      /** Member/admin PIN is 4–8 digits. */
      minPasswordLength: 4,
      maxPasswordLength: 8,
    },
    session: {
      additionalFields: {
        activeChurchId: {
          type: 'string',
          required: false,
          input: true,
          returned: true,
        },
      },
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const db = getDb();
            const [row] = await db
              .select({ churchId: organisationUsers.churchId })
              .from(organisationUsers)
              .where(
                and(
                  eq(organisationUsers.userAccountId, session.userId),
                  eq(organisationUsers.status, 'active'),
                  isNull(organisationUsers.deletedAt),
                ),
              )
              .limit(1);
            return {
              data: {
                ...session,
                activeChurchId: row?.churchId ?? null,
              },
            };
          },
        },
      },
    },
    plugins: [
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          const result = await deliverAuthOtp({
            otp: code,
            phoneNumber: phone,
          });
          if (!result.ok) {
            throw new Error(result.error);
          }
        },
        phoneNumberValidator: async (value) => /^\+[1-9]\d{6,14}$/.test(value),
        requireVerification: false,
      }),
      twoFactor({
        issuer: 'CrossLife CMS',
        schema: {
          twoFactor: {
            modelName: 'two_factor',
          },
        },
        totpOptions: { disable: true },
        otpOptions: {
          period: 3,
          digits: 6,
          sendOTP: async ({ user, otp }) => {
            const result = await deliverAuthOtp({
              userId: user.id,
              otp,
              phoneNumber:
                (user as { phoneNumber?: string | null }).phoneNumber ?? null,
              email: user.email,
            });
            if (!result.ok) {
              throw new Error(result.error);
            }
          },
        },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let singleton: Auth | null = null;

/** Lazily create the Better Auth instance (needs DATABASE_URL + BETTER_AUTH_SECRET). */
export function getAuth(): Auth {
  if (!singleton) {
    singleton = createAuth();
  }
  return singleton;
}

/** Test helper. */
export function resetAuthForTests(): void {
  singleton = null;
}
