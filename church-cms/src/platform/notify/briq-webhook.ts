import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify Briq `X-Briq-Signature: sha256=<hex>` over the raw body. */
export function verifyBriqSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string,
): boolean {
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;
  const expectedHex = signatureHeader.slice(prefix.length);
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(expectedHex, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
