import { hashPassword } from 'better-auth/crypto';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { account, user as authUser } from './db-schema';

export type ProvisionCredentialInput = {
  userAccountId: string;
  displayName: string;
  email: string;
  phoneE164?: string | null;
  pin: string;
  /** Admins require OTP MFA after PIN. */
  twoFactorEnabled: boolean;
};

/**
 * Insert Better Auth `user` + credential `account` for an issued PIN.
 * `user.id` must equal `user_accounts.id` (ADR-0002).
 * Never log `pin`.
 */
export async function provisionCredentialAccount(
  db: Db,
  input: ProvisionCredentialInput,
): Promise<void> {
  if (!/^\d{4,8}$/.test(input.pin)) {
    throw new Error('PIN must be 4–8 digits');
  }

  const passwordHash = await hashPassword(input.pin);

  await db.insert(authUser).values({
    id: input.userAccountId,
    name: input.displayName,
    email: input.email,
    emailVerified: true,
    phoneNumber: input.phoneE164 ?? null,
    phoneNumberVerified: Boolean(input.phoneE164),
    twoFactorEnabled: input.twoFactorEnabled,
  });

  await db.insert(account).values({
    id: newId(),
    accountId: input.userAccountId,
    providerId: 'credential',
    userId: input.userAccountId,
    password: passwordHash,
  });
}
