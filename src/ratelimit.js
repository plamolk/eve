// จำกัดคำขอต่อ key (เช่น 'submit:<ip>') ด้วย Rate Limiting binding
// ถ้าไม่มี binding ใช้ตัวนับในหน่วยความจำของ isolate แทน (5 ครั้ง / 60 วินาที)
const LIMIT = 5;
const WINDOW_MS = 60000;
const hits = new Map();

export async function allow(env, key) {
  if (env.RATE_LIMIT_OFF === '1') return true;
  if (env.RL && typeof env.RL.limit === 'function') {
    const { success } = await env.RL.limit({ key });
    return success;
  }
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}
