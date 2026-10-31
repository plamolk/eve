// ตัวช่วยคำนวณของหน้าแอดมิน (ไม่แตะ DOM)
window.App = window.App || {};

App.adminStats = (function () {
  const DAY = 86400;
  const BKK = 7 * 3600; // เวลาไทย UTC+7

  function round1(x) { return Math.round(x * 10) / 10; }

  function pct(n, of) {
    if (!of) return '0%';
    return round1((n / of) * 100) + '%';
  }

  // {ค่า: จำนวน} → สถิติพื้นฐาน
  function freqStats(freq) {
    const pairs = Object.keys(freq).map(function (k) { return [Number(k), freq[k]]; })
      .filter(function (p) { return Number.isFinite(p[0]) && p[1] > 0; })
      .sort(function (a, b) { return a[0] - b[0]; });
    const n = pairs.reduce(function (a, p) { return a + p[1]; }, 0);
    if (!n) return { n: 0, mean: null, median: null, min: null, max: null };
    const sum = pairs.reduce(function (a, p) { return a + p[0] * p[1]; }, 0);
    function nth(i) { // ค่าลำดับที่ i (เริ่ม 0) เมื่อเรียงจากน้อยไปมาก
      let seen = 0;
      for (const p of pairs) { seen += p[1]; if (i < seen) return p[0]; }
      return pairs[pairs.length - 1][0];
    }
    const median = n % 2 ? nth((n - 1) / 2) : (nth(n / 2 - 1) + nth(n / 2)) / 2;
    return { n: n, mean: round1(sum / n), median: round1(median), min: pairs[0][0], max: pairs[pairs.length - 1][0] };
  }

  // แท่งความถี่: ค่าต่างกันไม่เกิน max → ทีละค่า, เกิน → max ช่วงกว้างเท่ากัน
  function bins(freq, max) {
    max = max || 20;
    const pairs = Object.keys(freq).map(function (k) { return [Number(k), freq[k]]; })
      .filter(function (p) { return Number.isFinite(p[0]); })
      .sort(function (a, b) { return a[0] - b[0]; });
    if (pairs.length <= max) return pairs.map(function (p) { return [String(p[0]), p[1]]; });
    const lo = pairs[0][0];
    const hi = pairs[pairs.length - 1][0];
    const w = (hi - lo) / max;
    const out = [];
    for (let i = 0; i < max; i++) out.push([round1(lo + i * w) + '–' + round1(i === max - 1 ? hi : lo + (i + 1) * w), 0]);
    pairs.forEach(function (p) { out[Math.min(max - 1, Math.floor((p[0] - lo) / w))][1] += p[1]; });
    return out;
  }

  function dayIndex(d) { return Date.parse(d + 'T00:00:00Z') / 1000 / DAY; }

  // [[วันที่, เจ้าหน้าที่, ผู้บริจาค]] ทุกวันตั้งแต่วันแรกถึงวันสุดท้าย
  function fillDays(staffDays, donorDays) {
    const map = {};
    staffDays.forEach(function (d) { map[d[0]] = [d[1], 0]; });
    donorDays.forEach(function (d) { map[d[0]] = [(map[d[0]] || [0])[0], d[1]]; });
    const keys = Object.keys(map).sort();
    if (!keys.length) return [];
    const out = [];
    for (let i = dayIndex(keys[0]); i <= dayIndex(keys[keys.length - 1]); i++) {
      const d = new Date(i * DAY * 1000).toISOString().slice(0, 10);
      const v = map[d] || [0, 0];
      out.push([d, v[0], v[1]]);
    }
    return out;
  }

  function bangkokIso(sec) { return new Date((sec + BKK) * 1000).toISOString(); }
  function bangkokDate(sec) { return bangkokIso(sec).slice(0, 10); }
  function bangkokTime(sec) { return bangkokIso(sec).slice(0, 16).replace('T', ' '); }

  return { pct: pct, freqStats: freqStats, bins: bins, fillDays: fillDays, bangkokDate: bangkokDate, bangkokTime: bangkokTime };
})();
