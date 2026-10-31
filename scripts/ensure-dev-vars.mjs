// Runs before `npm run dev`: without .dev.vars the local Worker has no Turnstile
// secret and rejects every answer ("ยืนยันตัวตนไม่สำเร็จ"). Copy the example once;
// never overwrite a file the developer already has.
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function ensureDevVars(dir) {
  const target = join(dir, '.dev.vars');
  const example = join(dir, '.dev.vars.example');
  if (existsSync(target) || !existsSync(example)) return false;
  copyFileSync(example, target);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (ensureDevVars(process.cwd())) console.log('Created .dev.vars from .dev.vars.example (local test keys).');
}
