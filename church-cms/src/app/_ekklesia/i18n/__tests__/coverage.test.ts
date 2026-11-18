import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import ts from 'typescript';

import { sw } from '../sw.ts';

const APP = path.resolve(import.meta.dirname, '../../..');
const SKIP = [/\/api\//, /\/platform\//, /ui-preview/, /\/_ekklesia\/i18n\//, /__tests__/];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (SKIP.some((re) => re.test(p))) return [];
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

/** Every literal first argument of t()/tk() in the app, with one location. */
function collectKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const file of sourceFiles(APP)) {
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 't' || n.expression.text === 'tk')) {
        const a = n.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && !keys.has(a.text)) {
          keys.set(a.text, path.relative(APP, file));
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return keys;
}

const placeholders = (s: string): string => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');

describe('Swahili UI translations', () => {
  const keys = collectKeys();

  it('finds the UI text in the app', () => {
    assert.ok(keys.size > 1000, `expected the app's UI text, found ${keys.size} phrases`);
  });

  it('has Swahili for every t()/tk() phrase', () => {
    const missing = [...keys].filter(([k]) => !(k in sw)).map(([k, f]) => `${f}: ${JSON.stringify(k)}`);
    assert.deepEqual(missing, [], `Add these to src/app/_ekklesia/i18n/sw/*.ts:\n${missing.join('\n')}`);
  });

  it('keeps the same {n} placeholders in Swahili', () => {
    const mismatched = Object.entries(sw)
      .filter(([en, s]) => placeholders(en) !== placeholders(s))
      .map(([en, s]) => `${JSON.stringify(en)} → ${JSON.stringify(s)}`);
    assert.deepEqual(mismatched, []);
  });

  it('has no empty translations', () => {
    assert.deepEqual(Object.entries(sw).filter(([, s]) => !s.trim()).map(([en]) => en), []);
  });
});
