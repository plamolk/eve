import { describe, test, expect, beforeEach } from 'vitest';
import { loadBrowser } from '../helpers/load-browser.js';

const FILES = [
  'public/js/shared/ui.js', 'public/js/data/bus-layout.js', 'public/js/data/body-regions.js',
  'public/js/components/bus-map.js', 'public/js/components/body-map.js', 'public/js/admin/admin.js'
];

let App;
beforeEach(() => { App = loadBrowser(FILES); });

const usage = { day: 20261030, rw: 160, rr: 170, n: 50, limits: { rw: 100000, rr: 5000000 } };
const empty = { updated: 0, more: false, usage, staff: { n: 0, heat: {}, body: {}, rank: [] }, donor: { n: 0, heat: {} } };

describe('bars', () => {
  test('empty rows show the empty state, never NaN/Infinity', () => {
    const html = App.admin.bars([]);
    expect(html).toContain('ยังไม่มีข้อมูล');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  test('rows render label and score', () => {
    const html = App.admin.bars([['ซ่อนสาย', 13], ['ทางเดินกว้างขึ้น', 11]]);
    expect(html).toContain('ซ่อนสาย');
    expect(html).toContain('>13<');
  });
});

describe('view', () => {
  test('staff tab with no answers shows the empty state on all 3 cards', () => {
    const html = App.admin.view(empty, 'staff');
    expect(html.match(/ยังไม่มีข้อมูล/g)).toHaveLength(3);
  });

  test('donor tab has only the heatmap card', () => {
    const html = App.admin.view(empty, 'donor');
    expect(html).toContain(App.data.admin.heatTitle);
    expect(html).not.toContain(App.data.admin.rankTitle);
    expect(html).not.toContain(App.data.admin.bodyTitle);
  });

  test('quota card shows percentages and the note', () => {
    const html = App.admin.view(empty, 'staff');
    expect(html).toContain('0.16%');
    expect(html).toContain(App.data.admin.quotaNote);
  });

  test('more=true shows the "more data" message', () => {
    expect(App.admin.view({ ...empty, more: true }, 'staff')).toContain('มีข้อมูลใหม่อีก กดอัปเดต');
  });
});

describe('toCSV', () => {
  const rows = [{
    id: 1, cid: 'c1', role: 'staff', created: 0, src: 0,
    data: {
      role: 'staff',
      answers: { other: 'ก, "ข"\nค 🩸', rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น'] },
      msd: { 'คอ': { y: 'ใช่', w: 'ไม่', s: 3 } },
      map: { A3: { t: ['คับแคบ'], p: [], sev: 4, n: '' } }
    }
  }, {
    id: 2, cid: 'c2', role: 'donor', created: 60, src: 1,
    data: { role: 'donor', answers: { age: '18-25', noMap: true }, msd: {}, map: {} }
  }];

  test('starts with a BOM and uses CRLF rows', () => {
    const csv = App.admin.toCSV(rows);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('\r\n').length).toBeGreaterThanOrEqual(3);
  });

  test('header lists base, answers, msd and map columns', () => {
    const header = App.admin.toCSV(rows).slice(1).split('\r\n')[0].split(',');
    expect(header.slice(0, 5)).toEqual(['id', 'created', 'role', 'src', 'cid']);
    expect(header).toEqual(expect.arrayContaining(['answers.other', 'answers.rank', 'answers.age', 'answers.noMap', 'msd.คอ.y', 'msd.คอ.w', 'msd.คอ.s', 'map.A3.t', 'map.A3.p', 'map.A3.sev', 'map.A3.n']));
    expect(header[header.length - 1]).toBe('json');
  });

  test('quotes Thai text with commas, quotes, newlines and emoji (RFC 4180)', () => {
    const csv = App.admin.toCSV(rows);
    expect(csv).toContain('"ก, ""ข""\nค 🩸"');
    expect(csv).toContain('ซ่อนสาย | ทางเดินกว้างขึ้น');
  });

  test('cells Excel would read as formulas are prefixed with an apostrophe', () => {
    const r = [{ id: 3, cid: 'c3', role: 'staff', created: 0, src: 0, data: { role: 'staff', answers: { other: '=HYPERLINK("http://x")', worry: '- ปวดหลัง', setup: '+1', faint: '@x' }, msd: {}, map: {} } }];
    const csv = App.admin.toCSV(r);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain(",'- ปวดหลัง,");
    expect(csv).toContain(",'+1,");
    expect(csv).toContain(",'@x,");
  });

  test('created is Bangkok time', () => {
    const csv = App.admin.toCSV(rows);
    expect(csv).toContain(',1970-01-01 07:00:00,');
    expect(csv).toContain(',1970-01-01 07:01:00,');
  });
});
