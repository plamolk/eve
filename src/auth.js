// session ของแอดมิน: "<หมดอายุ (unix วินาที)>.<HMAC-SHA256 ของค่าหมดอายุ>" ไม่ต้องใช้ D1
import { safeEqual } from './crypto.js';

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))));
}

export async function signSession(key, exp) {
  return exp + '.' + (await hmac(key, String(exp)));
}

export async function verifySession(key, value, now) {
  const m = /^(\d+)\.([A-Za-z0-9_-]+)$/.exec(typeof value === 'string' ? value : '');
  if (!m || Number(m[1]) <= now) return false;
  return safeEqual(m[2], await hmac(key, m[1]));
}
