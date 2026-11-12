import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), '.data', 'media');

export function absolutePathForKey(storageKey: string): string {
  const safe = storageKey.replace(/\.\./g, '').replace(/^\/+/, '');
  return path.join(ROOT, safe);
}

export async function writeMediaBytes(
  storageKey: string,
  bytes: Buffer,
): Promise<void> {
  const full = absolutePathForKey(storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export async function readMediaBytes(storageKey: string): Promise<Buffer> {
  return readFile(absolutePathForKey(storageKey));
}
