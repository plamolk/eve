// ตรวจคำขอแบบเบา: key ที่รู้จัก, ชนิดค่า, ช่วงค่า, ข้อบังคับ, ขนาด
// คืน { ok: true } หรือ { ok: false, field } (field = path ของจุดแรกที่ผิด)
import { SCHEMA, NONE_KEYS, BODY_REGIONS, ZONES, ZONE_TYPES, ZONE_PARTS, MSD_YN, LIMITS } from './schema.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const NUMBER = /^\d+(\.\d+)?$/;
const bad = (field) => ({ ok: false, field });
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const byteLength = (s) => new TextEncoder().encode(s).length;
// ใช้เฉพาะ key ของ object เอง (กัน __proto__, constructor, toString ฯลฯ)
const own = (obj, k) => Object.hasOwn(obj, k);

function uniqueIn(list, options) {
  return Array.isArray(list) && new Set(list).size === list.length &&
    list.every((x) => typeof x === 'string' && options.includes(x));
}

// คืน true ถ้าค่าถูกต้องตามชนิดคำถาม
function validAnswer(q, v) {
  switch (q.type) {
    case 'pills': return typeof v === 'string' && q.options.includes(v);
    case 'scale': return Number.isInteger(v) && q.options.includes(v);
    case 'multi':
      if (!uniqueIn(v, q.options) || v.length < 1 || v.length > (q.max || q.options.length)) return false;
      return !(q.only && v.includes(q.only) && v.length !== 1);
    case 'rank': return uniqueIn(v, q.options) && v.length === q.max;
    case 'number': return typeof v === 'string' && v.length <= 8 && NUMBER.test(v) && Number(v) <= LIMITS.numberMax;
    case 'textarea': return typeof v === 'string' && v.trim() !== '' && v.length <= LIMITS.textarea;
  }
  return false;
}

function checkAnswers(role, answers) {
  if (!isObj(answers)) return 'answers';
  const schema = SCHEMA[role].answers;
  for (const k of Object.keys(answers)) {
    if (NONE_KEYS[role].includes(k)) {
      if (answers[k] !== true) return 'answers.' + k;
      continue;
    }
    if (!own(schema, k) || !validAnswer(schema[k], answers[k])) return 'answers.' + k;
  }
  for (const [k, q] of Object.entries(schema)) {
    if (!q.optional && !(k in answers)) return 'answers.' + k;
  }
  return null;
}

function checkMsd(role, msd, answers) {
  if (!isObj(msd)) return 'msd';
  const ids = Object.keys(msd);
  if (!SCHEMA[role].msd) return ids.length ? 'msd' : null;
  if (!ids.length === !answers.noMsd) return 'msd'; // ต้องมีอย่างใดอย่างหนึ่งเท่านั้น
  for (const id of ids) {
    const e = msd[id];
    if (!BODY_REGIONS.includes(id) || !isObj(e)) return 'msd.' + id;
    const keys = Object.keys(e).sort().join(',');
    if (keys !== 's,w,y') return 'msd.' + id;
    if (!MSD_YN.includes(e.y)) return 'msd.' + id + '.y';
    if (!MSD_YN.includes(e.w)) return 'msd.' + id + '.w';
    if (typeof e.s !== 'number' || !Number.isFinite(e.s) || e.s < 0 || e.s > 10) return 'msd.' + id + '.s';
  }
  return null;
}

function checkMap(map, answers) {
  if (!isObj(map)) return 'map';
  const ids = Object.keys(map);
  if (!ids.length === !answers.noMap) return 'map';
  for (const id of ids) {
    const e = map[id];
    const kind = own(ZONES, id) ? ZONES[id] : null;
    if (!kind || !isObj(e)) return 'map.' + id;
    for (const k of Object.keys(e)) {
      if (!['t', 'p', 'sev', 'n'].includes(k)) return 'map.' + id + '.' + k;
    }
    if (!uniqueIn(e.t, ZONE_TYPES) || e.t.length < 1) return 'map.' + id + '.t';
    if (kind === 'chair' ? !uniqueIn(e.p, ZONE_PARTS) : 'p' in e) return 'map.' + id + '.p';
    if (!Number.isInteger(e.sev) || e.sev < 1 || e.sev > 5) return 'map.' + id + '.sev';
    if (typeof e.n !== 'string' || e.n.length > LIMITS.note) return 'map.' + id + '.n';
  }
  return null;
}

export function validateData(data) {
  if (!isObj(data)) return bad('data');
  const keys = Object.keys(data).sort().join(',');
  if (keys !== 'answers,map,msd,role') return bad('data');
  if (typeof data.role !== 'string' || !own(SCHEMA, data.role)) return bad('role');
  const field = checkAnswers(data.role, data.answers) ||
    checkMsd(data.role, data.msd, data.answers) ||
    checkMap(data.map, data.answers);
  if (field) return bad(field);
  if (byteLength(JSON.stringify(data)) > LIMITS.dataBytes) return bad('data');
  return { ok: true };
}

export function validateEnvelope(body) {
  if (!isObj(body)) return bad('body');
  if (body.v !== 1) return bad('v');
  if (typeof body.cid !== 'string' || !UUID_V4.test(body.cid)) return bad('cid');
  if (typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 4096) return bad('token');
  if (typeof body.hp !== 'string') return bad('hp');
  const r = validateData(body.data);
  if (!r.ok) return r;
  return { ok: true, env: { v: 1, cid: body.cid, token: body.token, hp: body.hp, data: body.data } };
}
