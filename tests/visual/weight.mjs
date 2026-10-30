// usage: node tests/visual/weight.mjs <baseURL> <out.json> <path...>
// Records every response each page loads: decoded bytes and encoded (transfer) bytes.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [baseURL, out, ...paths] = process.argv.slice(2);
if (!baseURL || !out || !paths.length) {
  console.error('usage: node tests/visual/weight.mjs <baseURL> <out.json> <path...>');
  process.exit(2);
}

const browser = await chromium.launch();
const result = {};
for (const path of paths) {
  const page = await browser.newPage();
  const pending = [];
  page.on('response', (res) => {
    pending.push((async () => {
      const body = await res.body().catch(() => Buffer.alloc(0));
      const sizes = await res.request().sizes().catch(() => ({ responseBodySize: 0 }));
      return { url: res.url(), type: res.request().resourceType(), bytes: body.length, encodedBytes: sizes.responseBodySize };
    })());
  });
  await page.goto(baseURL + path, { waitUntil: 'networkidle' });
  const resources = await Promise.all(pending);
  result[path] = {
    requests: resources.length,
    bytes: resources.reduce((s, r) => s + r.bytes, 0),
    encodedBytes: resources.reduce((s, r) => s + r.encodedBytes, 0),
    resources
  };
  await page.close();
}
await browser.close();
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(Object.entries(result).map(([p, r]) => `${p}: ${r.requests} req, ${r.bytes} B (${r.encodedBytes} B encoded)`).join('\n'));
