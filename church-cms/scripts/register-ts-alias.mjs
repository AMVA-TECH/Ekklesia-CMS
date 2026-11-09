import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-alias-hooks.mjs', pathToFileURL('./scripts/register-ts-alias.mjs'));
