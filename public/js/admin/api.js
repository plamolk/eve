// เรียก /api/admin/* (ไม่แตะ DOM)
window.App = window.App || {};

App.adminApi = (function () {
  const SUMMARY_ROUNDS = 50; // รวม cache ต่อได้สูงสุด 50 × 100 คำตอบต่อการกดอัปเดต 1 ครั้ง

  async function call(method, url, body) {
    const r = await fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    // อ่าน body ให้จบเสมอ (ถ้าไม่อ่าน เบราว์เซอร์จะค้างการเชื่อมต่อของคำตอบ 401 ไว้)
    const text = await r.text();
    if (r.status === 401) throw Object.assign(new Error('auth'), { auth: true });
    if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return text ? JSON.parse(text) : null;
  }

  function qs(params) {
    return Object.keys(params || {})
      .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  async function summaryAll(onProgress) {
    let s = null;
    for (let i = 1; i <= SUMMARY_ROUNDS; i++) {
      s = await call('GET', '/api/admin/summary');
      if (!s.more || i === SUMMARY_ROUNDS) break;
      if (onProgress) onProgress(i);
    }
    return s;
  }

  return {
    call: call,
    summaryAll: summaryAll,
    comments: function (params) { return call('GET', '/api/admin/comments?' + qs(params)); },
    responses: function (params) { return call('GET', '/api/admin/responses?' + qs(params)); },
    response: function (id) { return call('GET', '/api/admin/responses/' + encodeURIComponent(id)); }
  };
})();
