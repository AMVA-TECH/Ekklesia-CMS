import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const srcRoot = path.resolve(import.meta.dirname, '../src');

function fileIfExists(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return pathToFileURL(candidate).href;
  }
  return null;
}

function resolveFsPath(basePath) {
  return (
    fileIfExists(basePath) ||
    fileIfExists(`${basePath}.ts`) ||
    fileIfExists(`${basePath}.tsx`) ||
    fileIfExists(path.join(basePath, 'index.ts')) ||
    null
  );
}

function resolveAlias(specifier) {
  return resolveFsPath(path.join(srcRoot, specifier.slice(2)));
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const url = resolveAlias(specifier);
    if (!url) {
      return nextResolve(specifier, context);
    }
    return { shortCircuit: true, url };
  }

  if (
    context.parentURL &&
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !path.extname(specifier)
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const url = resolveFsPath(path.resolve(parentDir, specifier));
    if (url) {
      return { shortCircuit: true, url };
    }
  }

  return nextResolve(specifier, context);
}
