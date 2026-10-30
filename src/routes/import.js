// POST /api/import — Apps Script ส่งคำตอบที่เก็บไว้ใน Google Sheets กลับเข้า D1 (ครั้งละไม่เกิน 40)
import { validateData } from '../validate.js';
import { safeEqual } from '../crypto.js';
import { createMeter } from '../meter.js';
import { dayKey, bumpUsage } from '../store.js';
import { knownUsage, overQuota } from '../quota.js';

const MAX_ITEMS = 40; // แผนฟรีจำกัด 50 query ต่อ invocation
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function handleImport(c) {
  const env = c.env;
  const auth = c.req.header('authorization') || '';
  if (!env.IMPORT_TOKEN || !(await safeEqual(auth, 'Bearer ' + env.IMPORT_TOKEN))) return c.json({ error: 'auth' }, 401);

  const day = dayKey();
  const known = knownUsage(day);
  if (known && overQuota(known, env)) return c.json({ error: 'quota' }, 503);

  let body;
  try { body = await c.req.json(); } catch (e) { return c.json({ error: 'invalid', field: 'body' }, 400); }
  const items = body && body.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) return c.json({ error: 'invalid', field: 'items' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const good = [];
  const rejected = [];
  for (const it of items) {
    const cid = it && it.cid;
    if (typeof cid !== 'string' || !UUID_V4.test(cid)) { rejected.push({ cid: cid ?? null, field: 'cid' }); continue; }
    if (!Number.isInteger(it.received) || it.received < 0 || it.received > now + 300) { rejected.push({ cid, field: 'received' }); continue; }
    const v = validateData(it.data);
    if (!v.ok) { rejected.push({ cid, field: v.field }); continue; }
    good.push(it);
  }

  let inserted = 0;
  if (good.length) {
    const m = createMeter();
    const results = await m.batch(env.DB, good.map((it) => env.DB.prepare(
      'INSERT INTO responses (cid, role, data, created, src) VALUES (?, ?, ?, ?, 1) ON CONFLICT(cid) DO NOTHING'
    ).bind(it.cid, it.data.role, JSON.stringify(it.data), it.received)));
    inserted = results.filter((r) => r.meta.changes === 1).length;
    await bumpUsage(env.DB, m, inserted, day);
  }
  return c.json({ accepted: good.map((it) => it.cid), rejected });
}
