// POST /api/submit — 1 คนตอบ = 1 คำขอ = 1 แถว
// ลำดับ: ขนาด → validate → honeypot → rate limit → Turnstile → โควตา → D1 (→ Sheets ถ้า D1 ใช้ไม่ได้)
import { validateEnvelope } from '../validate.js';
import { LIMITS } from '../schema.js';
import { verifyTurnstile, turnstileAccepted } from '../turnstile.js';
import { allow } from '../ratelimit.js';
import { forwardToSheets } from '../fallback.js';
import { createMeter } from '../meter.js';
import { dayKey, insertResponse, bumpUsage } from '../store.js';
import { knownUsage, overQuota } from '../quota.js';

export async function handleSubmit(c) {
  const env = c.env;
  const ip = c.req.header('cf-connecting-ip') || '';

  if (Number(c.req.header('content-length') || 0) > LIMITS.bodyBytes) return c.json({ error: 'too_large' }, 413);
  const raw = await c.req.text();
  if (new TextEncoder().encode(raw).length > LIMITS.bodyBytes) return c.json({ error: 'too_large' }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return c.json({ error: 'invalid', field: 'body' }, 400);
  }
  const v = validateEnvelope(body);
  if (!v.ok) return c.json({ error: 'invalid', field: v.field }, 400);
  const { cid, token, hp, data } = v.env;

  if (hp !== '') return c.json({ ok: true }, 201); // บอต: ทำเหมือนสำเร็จ แต่ไม่บันทึก

  if (!(await allow(env, 'submit:' + ip))) return c.json({ error: 'rate' }, 429);

  if (!turnstileAccepted(await verifyTurnstile(token, ip, env), env)) return c.json({ error: 'turnstile' }, 403);

  const day = dayKey();
  const known = knownUsage(day);
  if (known && overQuota(known, env)) {
    return (await forwardToSheets(env, { cid, data }))
      ? c.json({ ok: true, queued: true }, 202)
      : c.json({ error: 'unavailable' }, 503);
  }

  try {
    const m = createMeter();
    const inserted = await insertResponse(m, env.DB, {
      cid, role: data.role, data: JSON.stringify(data), created: Math.floor(Date.now() / 1000), src: 0
    });
    await bumpUsage(env.DB, m, inserted ? 1 : 0, day);
    return c.json({ ok: true }, 201);
  } catch (e) {
    console.error('D1 write failed, forwarding to Sheets', e);
    return (await forwardToSheets(env, { cid, data }))
      ? c.json({ ok: true, queued: true }, 202)
      : c.json({ error: 'unavailable' }, 503);
  }
}
