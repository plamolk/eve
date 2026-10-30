// Run classic browser scripts (window.App namespace) inside a node:vm context.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

export function loadBrowser(files, globals = {}) {
  const ctx = { console, crypto: globalThis.crypto, TextEncoder, ...globals };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    vm.runInContext(readFileSync(resolve(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.window.App;
}
