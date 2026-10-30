import { describe, test, expect, beforeEach } from 'vitest';
import { loadBrowser } from '../helpers/load-browser.js';

const FILES = [
  'public/js/data/common.js', 'public/js/data/staff.js', 'public/js/data/donor.js',
  'public/js/data/bus-layout.js', 'public/js/survey/state.js', 'public/js/survey/submit.js'
];

let App;
beforeEach(() => { App = loadBrowser(FILES); });

// Answer every item of a role with valid values (optional items included).
function fullState(role) {
  App.store.reset();
  App.state.role = role;
  for (const sec of App.data.sections[role]) {
    for (const q of sec.items) {
      if (q.type === 'pills') App.store.setAnswer(q.key, q.options[0]);
      if (q.type === 'scale') App.store.setAnswer(q.key, q.options[0].value);
      if (q.type === 'multi') App.store.setAnswer(q.key, [q.options[0]]);
      if (q.type === 'rank') App.store.setAnswer(q.key, q.options.slice(0, q.max));
      if (q.type === 'number') App.store.setAnswer(q.key, '5');
      if (q.type === 'textarea') App.store.setAnswer(q.key, 'ทดสอบ');
    }
    if (sec.component === 'bodyMap') App.store.toggleRegion('คอ');
    if (sec.component === 'busMap') {
      App.store.toggleZoneList('A3', 't', 'คับแคบ');
      App.store.saveZone('A3');
    }
  }
  return App.state;
}

const stepOf = (role, component) => App.data.sections[role].findIndex((s) => s.component === component);

describe('checkAll', () => {
  test('complete staff and donor answers pass', () => {
    expect(App.submit.checkAll(fullState('staff'))).toBeNull();
    expect(App.submit.checkAll(fullState('donor'))).toBeNull();
  });

  test('missing required pills reports its step and key', () => {
    const s = fullState('staff');
    App.store.setAnswer('pos', '');
    expect(App.submit.checkAll(s)).toEqual({ step: 0, key: 'pos', message: 'กรุณาตอบข้อนี้' });
  });

  test('optional ht may be empty', () => {
    const s = fullState('staff');
    App.store.setAnswer('ht', '');
    expect(App.submit.checkAll(s)).toBeNull();
  });

  test.each(['-1', '1e9', '10000', 'abc'])('number %s is rejected', (v) => {
    const s = fullState('staff');
    App.store.setAnswer('yrs', v);
    expect(App.submit.checkAll(s)).toMatchObject({ step: 0, key: 'yrs', message: 'กรุณากรอกตัวเลข 0–9999' });
  });

  test('decimal number is accepted', () => {
    const s = fullState('staff');
    App.store.setAnswer('yrs', '2.5');
    expect(App.submit.checkAll(s)).toBeNull();
  });

  test('blank textarea is required and long textarea is too long', () => {
    let s = fullState('staff');
    s.answers.other = '   ';
    expect(App.submit.checkAll(s)).toMatchObject({ key: 'other', message: 'กรุณาตอบข้อนี้' });
    s = fullState('staff');
    s.answers.other = 'ก'.repeat(2001);
    expect(App.submit.checkAll(s)).toMatchObject({ key: 'other', message: 'ข้อความยาวเกินไป' });
  });

  test('rank must have all 3 places', () => {
    const s = fullState('staff');
    s.answers.rank = s.answers.rank.slice(0, 2);
    expect(App.submit.checkAll(s)).toMatchObject({ key: 'rank', message: 'กรุณาเลือกให้ครบ 3 อันดับ' });
  });

  test('empty multi is required', () => {
    const s = fullState('donor');
    s.answers.again = [];
    expect(App.submit.checkAll(s)).toMatchObject({ key: 'again', message: 'กรุณาตอบข้อนี้' });
  });

  test('data larger than 13824 bytes is too large', () => {
    const s = fullState('staff');
    for (const k of ['rowdiff', 'cleanspot', 'material', 'setup', 'faint', 'worry', 'other']) s.answers[k] = 'ก'.repeat(1000);
    expect(App.submit.checkAll(s)).toMatchObject({ message: 'คำตอบมีขนาดใหญ่เกินไป' });
  });
});

describe('body map (part C)', () => {
  test('needs a region or the none button', () => {
    const s = fullState('staff');
    App.store.toggleRegion('คอ');
    const c = stepOf('staff', 'bodyMap');
    expect(App.submit.checkStep(s, c)).toEqual({ step: c, key: 'msd', message: "กรุณาเลือกจุดบนแผนภาพ หรือกด 'ไม่มีอาการปวดเมื่อย'" });
    App.store.setNone('msd', true);
    expect(s.answers.noMsd).toBe(true);
    expect(App.submit.checkStep(s, c)).toBeNull();
  });

  test('choosing a region clears noMsd, and none clears regions', () => {
    const s = fullState('staff');
    App.store.setNone('msd', true);
    expect(s.msd).toEqual({});
    App.store.toggleRegion('ไหล่');
    expect(s.answers.noMsd).toBeUndefined();
  });

  test.each([12, '', -1])('severity %s is rejected', (v) => {
    const s = fullState('staff');
    s.msd['คอ'].s = v;
    expect(App.submit.checkStep(s, stepOf('staff', 'bodyMap'))).toMatchObject({ key: 'msd.คอ', message: 'กรุณากรอกระดับความรุนแรง 0–10' });
  });
});

describe('bus map (part D)', () => {
  test('needs a saved point or the none button; tmp points do not count', () => {
    const s = fullState('donor');
    App.store.removeZone('A3');
    App.store.toggleZoneList('Z5', 't', 'คับแคบ'); // tmp only
    const d = stepOf('donor', 'busMap');
    expect(App.submit.checkStep(s, d)).toEqual({ step: d, key: 'map', message: "กรุณาบันทึกจุดบนผัง หรือกด 'ไม่พบปัญหา'" });
    App.store.setNone('map', true);
    expect(s.answers.noMap).toBe(true);
    expect(s.map).toEqual({});
    expect(App.submit.checkStep(s, d)).toBeNull();
  });

  test('saving a point clears noMap', () => {
    const s = fullState('donor');
    App.store.setNone('map', true);
    App.store.toggleZoneList('B1', 't', 'คับแคบ');
    App.store.saveZone('B1');
    expect(s.answers.noMap).toBeUndefined();
  });

  test('note longer than 500 is too long', () => {
    const s = fullState('donor');
    s.map.A3.n = 'ก'.repeat(501);
    expect(App.submit.checkStep(s, stepOf('donor', 'busMap'))).toMatchObject({ message: 'ข้อความยาวเกินไป' });
  });

  test('staff part D also requires the zone question', () => {
    const s = fullState('staff');
    App.store.setAnswer('zone', '');
    expect(App.submit.checkStep(s, stepOf('staff', 'busMap'))).toMatchObject({ key: 'zone', message: 'กรุณาตอบข้อนี้' });
  });
});

describe('tmp points', () => {
  const m = () => ({ A3: { t: ['คับแคบ'], p: [], sev: 3, n: '', tmp: 1 }, B1: { t: [], p: [], sev: 3, n: '', tmp: 1 }, Z5: { t: ['คับแคบ'], sev: 2, n: '' } });

  test('pendingZones lists ids with tmp', () => {
    expect(App.submit.pendingZones(m())).toEqual(['A3', 'B1']);
  });

  test('save keeps points without a type as tmp; drop removes all tmp; input untouched', () => {
    const map = m();
    const saved = App.submit.resolveTmp(map, 'save');
    expect(saved.A3.tmp).toBeUndefined();
    expect(saved.B1.tmp).toBe(1);
    const dropped = App.submit.resolveTmp(map, 'drop');
    expect(Object.keys(dropped)).toEqual(['Z5']);
    expect(map.A3.tmp).toBe(1);
  });
});

test('buildData equals legacy toJSON', () => {
  const s = fullState('staff');
  expect(App.submit.buildData(s)).toEqual(JSON.parse(App.store.toJSON()));
});
