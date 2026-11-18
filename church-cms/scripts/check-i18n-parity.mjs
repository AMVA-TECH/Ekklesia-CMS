#!/usr/bin/env node
/**
 * Fail CI when `messages/en.json` and `messages/sw.json` key trees diverge.
 * Usage: node scripts/check-i18n-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function flatten(value, prefix = '', out = []) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push(prefix);
  return out;
}

function load(name) {
  return JSON.parse(readFileSync(join(root, 'messages', name), 'utf8'));
}

const enKeys = new Set(flatten(load('en.json')));
const swKeys = new Set(flatten(load('sw.json')));

const missingInSw = [...enKeys].filter((k) => !swKeys.has(k)).sort();
const missingInEn = [...swKeys].filter((k) => !enKeys.has(k)).sort();

if (missingInSw.length === 0 && missingInEn.length === 0) {
  console.log(
    `i18n parity OK — ${enKeys.size} keys across en/sw (${[...enKeys].filter((k) => k.startsWith('Outbound.')).length} Outbound, ${[...enKeys].filter((k) => k.startsWith('ApiErrors.')).length} ApiErrors)`,
  );
  process.exit(0);
}

if (missingInSw.length) {
  console.error('Missing in messages/sw.json:');
  for (const key of missingInSw) console.error(`  - ${key}`);
}
if (missingInEn.length) {
  console.error('Missing in messages/en.json:');
  for (const key of missingInEn) console.error(`  - ${key}`);
}
process.exit(1);
