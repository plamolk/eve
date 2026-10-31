import { describe, test, expect, beforeEach } from 'vitest';
import { loadBrowser } from '../helpers/load-browser.js';
import { emptyAcc, present } from '../../src/summary.js';

export const ADMIN_FILES = [
  'public/js/shared/ui.js', 'public/js/data/common.js', 'public/js/data/staff.js', 'public/js/data/donor.js',
  'public/js/data/bus-layout.js', 'public/js/data/body-regions.js',
  'public/js/components/bus-map.js', 'public/js/components/body-map.js',
  'public/js/admin/stats.js', 'public/js/admin/api.js', 'public/js/admin/overview.js', 'public/js/admin/questions.js', 'public/js/admin/comments.js', 'public/js/admin/people.js', 'public/js/admin/admin.js'
];

let App;
beforeEach(() => { App = loadBrowser(ADMIN_FILES); });

const usage = { day: 20261030, rw: 160, rr: 170, n: 50, limits: { rw: 100000, rr: 5000000 } };
const empty = { updated: 0, more: false, usage, ...present(emptyAcc()) };
const todayBkk = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const withDays = (staffDays, donorDays, src1 = [0, 0]) => ({
  ...empty,
  staff: { ...empty.staff, n: 2, src1: src1[0], days: staffDays },
  donor: { ...empty.donor, n: 1, src1: src1[1], days: donorDays }
});
const stat = (html, key) => (html.match(new RegExp('data-stat="' + key + '"[^]*?<p[^>]*data-value[^>]*>([^<]*)<')) || [])[1];

describe('bars', () => {
  test('empty rows show the empty state, never NaN/Infinity', () => {
    const html = App.adminViews.bars([]);
    expect(html).toContain('ยังไม่มีข้อมูล');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  test('rows render label and score', () => {
    const html = App.adminViews.bars([['ซ่อนสาย', 13], ['ทางเดินกว้างขึ้น', 11]]);
    expect(html).toContain('ซ่อนสาย');
    expect(html).toContain('>13<');
  });
});

describe('overview', () => {
  test('no answers shows the empty state on the chart, heatmap, body and rank cards', () => {
    const html = App.adminViews.overview(empty, 'staff');
    expect(html.match(/ยังไม่มีข้อมูล/g)).toHaveLength(4);
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  test('the heat sub-tab switches only the heatmap; body and rank stay', () => {
    const html = App.adminViews.overview(empty, 'donor');
    expect(html).toContain(App.data.admin.heatTitle);
    expect(html).toContain(App.data.admin.rankTitle);
    expect(html).toContain(App.data.admin.bodyTitle);
    expect(html).toContain('data-action="heattab" data-value="donor"');
  });

  test('quota card shows percentages and the note', () => {
    const html = App.adminViews.overview(empty, 'staff');
    expect(html).toContain('0.16%');
    expect(html).toContain(App.data.admin.quotaNote);
  });

  test('more=true shows the "more data" message', () => {
    expect(App.adminViews.overview({ ...empty, more: true }, 'staff')).toContain('มีข้อมูลใหม่อีก กดอัปเดต');
  });

  test('six stat tiles: total, roles, today (Bangkok), fallback and last update', () => {
    const html = App.adminViews.overview(withDays([[todayBkk(), 2]], [[todayBkk(), 1]], [1, 1]), 'staff');
    expect(stat(html, 'total')).toBe('3');
    expect(stat(html, 'staff')).toBe('2');
    expect(stat(html, 'donor')).toBe('1');
    expect(stat(html, 'today')).toBe('3');
    expect(stat(html, 'src1')).toBe('2');
    expect(stat(html, 'updated')).toBe('—');
    for (const label of ['คำตอบทั้งหมด', 'เจ้าหน้าที่', 'ผู้บริจาค', 'วันนี้', 'เข้าทางสำรอง', 'อัปเดตล่าสุด']) expect(html).toContain(label);
  });

  test('daily chart draws a stacked pair of bars per day, including empty days', () => {
    const html = App.adminViews.overview(withDays([['2026-10-28', 2]], [['2026-10-30', 1]]), 'staff');
    const svg = html.slice(html.indexOf('<svg role="img" aria-label="จำนวนคำตอบรายวัน"'));
    expect(svg.length).toBeGreaterThan(0);
    expect((svg.slice(0, svg.indexOf('</svg>')).match(/<rect/g) || []).length).toBe(2 * 3);
    expect(html).toContain('จำนวนคำตอบรายวัน');
  });

  test('more than 31 days scrolls sideways', () => {
    const days = [];
    for (let i = 0; i < 40; i++) days.push([new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), 1]);
    const html = App.adminViews.overview(withDays(days, []), 'staff');
    expect(html).toContain('overflow-x-auto');
    const svg = html.slice(html.indexOf('<svg role="img" aria-label="จำนวนคำตอบรายวัน"'));
    expect((svg.slice(0, svg.indexOf('</svg>')).match(/<rect/g) || []).length).toBe(80);
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
