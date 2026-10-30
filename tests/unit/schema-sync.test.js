// The server's copy of the questions must match the files the browser loads.
import { test, expect } from 'vitest';
import { loadBrowser } from '../helpers/load-browser.js';
import { SCHEMA, BODY_REGIONS, ZONES, ZONE_TYPES, ZONE_PARTS } from '../../src/schema.js';

const App = loadBrowser(['public/js/data/common.js', 'public/js/data/staff.js', 'public/js/data/donor.js', 'public/js/data/bus-layout.js', 'public/js/data/body-regions.js']);

function fromSections(role) {
  const out = {};
  for (const sec of App.data.sections[role]) {
    for (const q of sec.items) {
      const s = { type: q.type };
      if (q.options) s.options = q.type === 'scale' ? q.options.map((o) => o.value) : q.options.slice();
      if (q.max) s.max = q.max;
      if (q.only) s.only = q.only;
      if (q.optional) s.optional = true;
      out[q.key] = s;
    }
  }
  return out;
}

test.each(['staff', 'donor'])('%s questions match', (role) => {
  expect(SCHEMA[role].answers).toEqual(fromSections(role));
});

test('body regions match', () => {
  expect(BODY_REGIONS).toEqual(App.data.body.regions.map((r) => r.id));
});

test('bus zones match', () => {
  expect(ZONES).toEqual(Object.fromEntries(App.data.bus.areas.map((a) => [a.id, a.kind])));
});

test('zone form options match', () => {
  expect(ZONE_TYPES).toEqual(App.data.zoneForm.types.options);
  expect(ZONE_PARTS).toEqual(App.data.zoneForm.parts.options);
});

test('msd answers match', () => {
  expect(App.data.msd.year.options).toEqual(['ใช่', 'ไม่']);
  expect(App.data.msd.week.options).toEqual(['ใช่', 'ไม่']);
});
