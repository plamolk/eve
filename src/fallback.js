// ส่งคำตอบไปเก็บที่ Google Sheets (Apps Script) เมื่อ D1 ใกล้เต็มหรือใช้ไม่ได้
export async function forwardToSheets(env, { cid, data }) {
  try {
    const r = await fetch(env.SHEETS_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ auth: 'worker', key: env.SHEETS_TOKEN, via: 'worker', cid, data }),
      signal: AbortSignal.timeout(8000)
    });
    const j = await r.json();
    return j && j.ok === true;
  } catch (e) {
    return false;
  }
}
