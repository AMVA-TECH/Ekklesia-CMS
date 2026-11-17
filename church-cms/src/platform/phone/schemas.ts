import { z } from 'zod';

import {
  TANZANIA_PHONE_INVALID_MESSAGE,
  normalizeTanzaniaPhoneE164,
} from './tanzania';

/**
 * Required Tanzania mobile.
 * Accepts local `07…` / `7…` / `+255…` and outputs `+255XXXXXXXXX`.
 */
export const tanzaniaPhoneE164Schema = z
  .string()
  .trim()
  .min(1, TANZANIA_PHONE_INVALID_MESSAGE)
  .transform((value, ctx) => {
    const normalized = normalizeTanzaniaPhoneE164(value);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: TANZANIA_PHONE_INVALID_MESSAGE,
      });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Optional Tanzania mobile. Empty / whitespace → undefined.
 */
export const optionalTanzaniaPhoneE164Schema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value, ctx) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const normalized = normalizeTanzaniaPhoneE164(trimmed);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: TANZANIA_PHONE_INVALID_MESSAGE,
      });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Profile-style optional phone: explicit `null` clears; empty → undefined.
 */
export const nullableTanzaniaPhoneE164Schema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = normalizeTanzaniaPhoneE164(trimmed);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: TANZANIA_PHONE_INVALID_MESSAGE,
      });
      return z.NEVER;
    }
    return normalized;
  });
