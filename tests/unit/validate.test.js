import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateData, validateEnvelope } from '../../src/validate.js';

const fx = (name) => JSON.parse(readFileSync(new URL('../fixtures/' + name + '.json', import.meta.url), 'utf8'));
const staff = () => fx('staff-full');
const donor = () => fx('donor-full');

describe('validateData accepts', () => {
  test.each(['staff-full', 'donor-full', 'staff-none'])('%s', (name) => {
    expect(validateData(fx(name))).toEqual({ ok: true });
  });

  test('staff without optional ht', () => {
    const d = staff(); delete d.answers.ht;
    expect(validateData(d)).toEqual({ ok: true });
  });

  test('chair point with empty parts', () => {
    const d = staff(); d.map.A3.p = [];
    expect(validateData(d)).toEqual({ ok: true });
  });

  test('decimal number answer', () => {
    const d = staff(); d.answers.yrs = '2.5';
    expect(validateData(d)).toEqual({ ok: true });
  });
});

describe('validateData rejects', () => {
  const cases = [
    ['negative number', staff, (d) => { d.answers.yrs = '-1'; }, 'answers.yrs'],
    ['exponent number', staff, (d) => { d.answers.yrs = '1e9'; }, 'answers.yrs'],
    ['number over 9999', staff, (d) => { d.answers.yrs = '10000'; }, 'answers.yrs'],
    ['unknown answer key', staff, (d) => { d.answers.unknown = 'x'; }, 'answers.unknown'],
    ['other role key', donor, (d) => { d.answers.rank = ['ซ่อนสาย']; }, 'answers.rank'],
    ['pills value not in options', staff, (d) => { d.answers.pos = 'หมอ'; }, 'answers.pos'],
    ['scale out of range', donor, (d) => { d.answers.seat = 6; }, 'answers.seat'],
    ['multi with only + other', donor, (d) => { d.answers.uneasy = ['แสง', 'ไม่มี']; }, 'answers.uneasy'],
    ['multi over max', donor, (d) => { d.answers.again = ['เก้าอี้สบาย', 'ไม่เจ็บ', 'รถสะอาด', 'ไม่ต้องรอนาน']; }, 'answers.again'],
    ['missing required', staff, (d) => { delete d.answers.pos; }, 'answers.pos'],
    ['blank textarea', staff, (d) => { d.answers.other = '  '; }, 'answers.other'],
    ['textarea over 2000', staff, (d) => { d.answers.other = 'ก'.repeat(2001); }, 'answers.other'],
    ['rank with 2 places', staff, (d) => { d.answers.rank = d.answers.rank.slice(0, 2); }, 'answers.rank'],
    ['severity out of range', staff, (d) => { d.msd['คอ'].s = 12; }, 'msd.คอ.s'],
    ['empty severity', staff, (d) => { d.msd['คอ'].s = ''; }, 'msd.คอ.s'],
    ['msd y not yes/no', staff, (d) => { d.msd['คอ'].y = 'x'; }, 'msd.คอ.y'],
    ['unknown body region', staff, (d) => { d.msd['หัว'] = { y: 'ใช่', w: 'ไม่', s: 1 }; }, 'msd.หัว'],
    ['donor with msd', donor, (d) => { d.msd = { 'คอ': { y: 'ใช่', w: 'ไม่', s: 1 } }; }, 'msd'],
    ['staff without msd or noMsd', staff, (d) => { d.msd = {}; }, 'msd'],
    ['staff with msd and noMsd', staff, (d) => { d.answers.noMsd = true; }, 'msd'],
    ['donor with noMsd', donor, (d) => { d.answers.noMsd = true; }, 'answers.noMsd'],
    ['noMap not true', donor, (d) => { d.answers.noMap = 1; }, 'answers.noMap'],
    ['empty map without noMap', donor, (d) => { d.map = {}; }, 'map'],
    ['map and noMap', donor, (d) => { d.answers.noMap = true; }, 'map'],
    ['tmp key', staff, (d) => { d.map.A3.tmp = 1; }, 'map.A3.tmp'],
    ['parts on a zone', staff, (d) => { d.map.Z5.p = []; }, 'map.Z5.p'],
    ['chair without parts', staff, (d) => { delete d.map.A3.p; }, 'map.A3.p'],
    ['no type', staff, (d) => { d.map.A3.t = []; }, 'map.A3.t'],
    ['type not in options', staff, (d) => { d.map.A3.t = ['ร้อน']; }, 'map.A3.t'],
    ['sev 0', staff, (d) => { d.map.A3.sev = 0; }, 'map.A3.sev'],
    ['note over 500', staff, (d) => { d.map.A3.n = 'ก'.repeat(501); }, 'map.A3.n'],
    ['unknown zone', staff, (d) => { d.map.Z9 = { t: ['คับแคบ'], sev: 2, n: '' }; }, 'map.Z9'],
    ['unknown role', staff, (d) => { d.role = 'x'; }, 'role'],
    ['extra top-level key', staff, (d) => { d.extra = 1; }, 'data'],
    ['data over 13824 bytes', staff, (d) => { for (const k of ['rowdiff', 'cleanspot', 'material', 'setup', 'faint', 'worry', 'other']) d.answers[k] = 'ก'.repeat(800); }, 'data']
  ];
  test.each(cases)('%s', (_name, make, mutate, field) => {
    const d = make(); mutate(d);
    expect(validateData(d)).toEqual({ ok: false, field });
  });

  test.each([null, 'x', [], 5])('non-object data %j', (d) => {
    expect(validateData(d)).toEqual({ ok: false, field: 'data' });
  });
});

describe('validateEnvelope', () => {
  const env = () => ({ v: 1, cid: '6f1c2b3a-1111-4222-8333-444455556666', token: 'XXXX.DUMMY.TOKEN.XXXX', hp: '', data: donor() });

  test('valid envelope', () => {
    const r = validateEnvelope(env());
    expect(r.ok).toBe(true);
    expect(r.env.cid).toBe('6f1c2b3a-1111-4222-8333-444455556666');
  });

  test.each([
    ['v 2', (e) => { e.v = 2; }, 'v'],
    ['bad cid', (e) => { e.cid = 'abc'; }, 'cid'],
    ['uuid v1 cid', (e) => { e.cid = '6f1c2b3a-1111-1222-8333-444455556666'; }, 'cid'],
    ['no token', (e) => { delete e.token; }, 'token'],
    ['hp not string', (e) => { e.hp = 1; }, 'hp'],
    ['bad data', (e) => { e.data.answers.pos = 'x'; }, 'answers.pos']
  ])('%s', (_n, mutate, field) => {
    const e = env(); mutate(e);
    expect(validateEnvelope(e)).toEqual({ ok: false, field });
  });

  test('non-object body', () => {
    expect(validateEnvelope('x')).toEqual({ ok: false, field: 'body' });
  });
});

describe('inherited object keys are not "known"', () => {
  const parse = (o) => JSON.parse(o);
  test.each([
    ['__proto__ zone', '{"role":"donor","answers":' + JSON.stringify(donor().answers) + ',"msd":{},"map":{"__proto__":{"t":["คับแคบ"],"sev":3,"n":""}}}', 'map.__proto__'],
    ['toString zone', '{"role":"donor","answers":' + JSON.stringify(donor().answers) + ',"msd":{},"map":{"toString":{"t":["คับแคบ"],"sev":3,"n":""}}}', 'map.toString'],
    ['constructor role', '{"role":"constructor","answers":{},"msd":{},"map":{}}', 'role'],
    ['__proto__ role', '{"role":"__proto__","answers":{},"msd":{},"map":{}}', 'role'],
    ['toString answer', '{"role":"donor","answers":' + JSON.stringify({ ...donor().answers, toString: 'x' }) + ',"msd":{},"map":' + JSON.stringify(donor().map) + '}', 'answers.toString']
  ])('%s', (_n, json, field) => {
    expect(validateData(parse(json))).toEqual({ ok: false, field });
  });
});
