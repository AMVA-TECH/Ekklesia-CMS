/**
 * Tanzania phone helpers (pilot default country).
 * Accepts local `07…` / `7…` and stores/sends E.164 `+255…`.
 */

export const TANZANIA_COUNTRY_CALLING_CODE = '255';

/** National mobile length after dropping the leading 0 (e.g. 712345678). */
export const TANZANIA_NATIONAL_MOBILE_LENGTH = 9;

/** Friendly example shown in forms (local style people already know). */
export const TANZANIA_PHONE_EXAMPLE_LOCAL = '0712 345 678';

export const TANZANIA_PHONE_HINT =
  'Tanzania mobile — you can type 0712 345 678; we save it as +255…';

const TZ_E164_RE = new RegExp(
  `^\\+${TANZANIA_COUNTRY_CALLING_CODE}\\d{${TANZANIA_NATIONAL_MOBILE_LENGTH}}$`,
);

/** True when value is a normalized Tanzania mobile E.164. */
export function isTanzaniaMobileE164(value: string): boolean {
  return TZ_E164_RE.test(value);
}

/**
 * Normalize user input to Tanzania E.164 (`+255XXXXXXXXX`) or `null` if empty/invalid.
 *
 * Accepts:
 * - `0712345678` / `0712 345 678`
 * - `712345678`
 * - `255712345678` / `+255712345678` / `+255 712 345 678`
 */
export function normalizeTanzaniaPhoneE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let national: string;
  if (digits.startsWith(TANZANIA_COUNTRY_CALLING_CODE)) {
    national = digits.slice(TANZANIA_COUNTRY_CALLING_CODE.length);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  // Drop an accidental extra leading 0 after country stripping.
  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (national.length !== TANZANIA_NATIONAL_MOBILE_LENGTH) {
    return null;
  }
  // Tanzania mobiles are typically 6… / 7… after the trunk 0.
  if (!/^[67]\d{8}$/.test(national)) {
    return null;
  }

  return `+${TANZANIA_COUNTRY_CALLING_CODE}${national}`;
}

/** Zod / form message when a Tanzania mobile is required or invalid. */
export const TANZANIA_PHONE_INVALID_MESSAGE = `Enter a Tanzania mobile number, e.g. ${TANZANIA_PHONE_EXAMPLE_LOCAL}`;
