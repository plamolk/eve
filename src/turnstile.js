// ตรวจ Turnstile token กับ Cloudflare
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, ip, env) {
  try {
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
    if (ip) form.set('remoteip', ip);
    const r = await fetch(SITEVERIFY, { method: 'POST', body: form });
    const j = await r.json();
    return { ok: j.success === true, hostname: j.hostname, action: j.action };
  } catch (e) {
    return { ok: false };
  }
}

// strict (production): ต้องมาจาก hostname ที่อนุญาตและ action = submit
export function turnstileAccepted(r, env) {
  if (!r.ok) return false;
  if (env.TURNSTILE_STRICT !== '1') return true;
  const hosts = String(env.ALLOWED_HOSTS || '').split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('REPLACE_WITH'));
  if (!hosts.length) {
    console.error('ALLOWED_HOSTS is not set: every answer is rejected until wrangler.jsonc vars.ALLOWED_HOSTS has the site hostname');
    return false;
  }
  return r.action === 'submit' && hosts.includes(r.hostname);
}
