// Drive the survey UI from a plain answers object.
// spec = { answers: {key: value}, msd: {region: severity}, map: {zoneId: {t: [], p: [], sev}}, noMsd, noMap }
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STUB = readFileSync(resolve(import.meta.dirname, 'fixtures/turnstile-stub.js'), 'utf8');

export const SHEETS = 'http://localhost:8790/exec';
export const CORS = { 'access-control-allow-origin': '*' };

export async function stubTurnstile(page) {
  await page.route('**/turnstile/v0/api.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
}

export async function openSurvey(page, role) {
  await page.goto('/survey.html?role=' + role);
  await page.locator('[role="progressbar"]').waitFor();
}

async function answerSection(page, sec, spec) {
  if (sec.component === 'bodyMap') {
    if (spec.noMsd) await page.locator('[data-action="none"][data-kind="msd"]').click();
    for (const [region, sev] of Object.entries(spec.msd || {})) {
      await page.locator(`g[data-action="body"][data-id="${region}"]`).click();
      await page.locator(`input[data-msd="s"][data-id="${region}"]`).fill(String(sev));
      await page.locator(`input[data-msd="s"][data-id="${region}"]`).dispatchEvent('change');
    }
  }
  if (sec.component === 'busMap') {
    if (spec.noMap) await page.locator('[data-action="none"][data-kind="map"]').click();
    for (const [id, e] of Object.entries(spec.map || {})) {
      await page.locator(`g[data-action="zone"][data-id="${id}"]`).click();
      for (const t of e.t) await page.locator(`[data-action="zlist"][data-field="t"][data-value="${t}"]`).click();
      for (const p of e.p || []) await page.locator(`[data-action="zlist"][data-field="p"][data-value="${p}"]`).click();
      await page.locator(`[data-action="zsev"][data-value="${e.sev}"]`).click();
      await page.getByText('บันทึกจุดนี้', { exact: true }).click();
    }
  }
  for (const q of sec.items) {
    const v = spec.answers[q.key];
    if (v === undefined) continue;
    const sel = (val) => `[data-key="${q.key}"][data-value="${val}"]`;
    if (q.type === 'pills' || q.type === 'scale') await page.locator(sel(v)).click();
    if (q.type === 'multi' || q.type === 'rank') for (const x of v) await page.locator(sel(x)).click();
    if (q.type === 'number' || q.type === 'textarea') await page.locator(`[data-key="${q.key}"]`).fill(v);
  }
}

// Fills every section; stops on the last one (the caller presses "ส่งคำตอบ").
export async function answerAll(page, role, spec) {
  const sections = await page.evaluate((r) => App.data.sections[r].map((s) => ({ component: s.component, items: s.items.map((q) => ({ key: q.key, type: q.type })) })), role);
  for (let i = 0; i < sections.length; i++) {
    await answerSection(page, sections[i], spec);
    if (i < sections.length - 1) await page.getByText('ถัดไป', { exact: true }).click();
  }
}

export const STAFF = {
  answers: {
    pos: 'พยาบาล', yrs: '5', days: '12', beds: '4',
    posture: 'สลับยืน-นั่ง', hard: 'A3', rowdiff: 'แถว A แคบกว่า, เอื้อมยาก', carry: 'บ่อย', squeeze: 'บางครั้ง', vib: 'นาน ๆ ครั้ง', env: 'ไม่เคย',
    zone: 'ข้างเก้าอี้แถว A',
    cable: 'บ่อย', trip: 'เกือบสะดุด', armpad: 'บางครั้ง', cleanspot: 'ซอกใต้เบาะ', cleanmin: '3', material: 'ที่วางแขน', setup: 'ประมาณ 20 นาที', faint: 'ปรับเก้าอี้เอนลง',
    rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น', 'ทำความสะอาดง่าย'], worry: 'ราคา', other: 'ไม่มี'
  },
  msd: { 'คอ': 4 },
  map: { A3: { t: ['คับแคบ'], p: ['พนักพิง'], sev: 4 } }
};

export const STAFF_DATA = {
  role: 'staff',
  answers: STAFF.answers,
  msd: { 'คอ': { y: 'ใช่', w: 'ไม่', s: 4 } },
  map: { A3: { t: ['คับแคบ'], p: ['พนักพิง'], sev: 4, n: '' } }
};

export const DONOR = {
  answers: {
    age: '26-35', sex: 'หญิง', times: '2-5', mobile: 'เคย', mob: 'ไม่มี',
    seat: 4, arm: 3, leg: 4, priv: 2, getin: 5, fit: 'พอดี',
    anx: 2, mood: 'ผ่อนคลายขึ้น', uneasy: ['เห็นเข็ม/ถุงเลือด'], dizzy: 'ไม่เคย', clean: 5,
    again: ['ไม่เจ็บ', 'รถสะอาด'], improve: 'เพิ่มที่วางของ'
  },
  noMap: true
};

export const DONOR_DATA = {
  role: 'donor',
  answers: { ...DONOR.answers, noMap: true },
  msd: {},
  map: {}
};
