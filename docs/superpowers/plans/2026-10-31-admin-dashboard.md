# หน้าดูข้อมูลแอดมินแบบครบถ้วน — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ขยาย `admin.html` เป็น 4 แท็บ (ภาพรวม / คำถามทั้งหมด / ความคิดเห็น / รายคน) ที่แสดงจำนวนคนตอบ สรุปทุกข้อคำถาม ความคิดเห็นทั้งหมด และคำตอบรายคน

**Architecture:**
- Server: ขยาย cache ผลสรุปแบบเพิ่มทีละส่วนเป็นรุ่น 2 ที่นับทุกข้อคำถาม, จำนวนรายวัน (เวลาไทย) และจำนวนที่มาจากทางสำรอง
- ความคิดเห็นและรายคน: ดึงทีละหน้าผ่าน endpoint ใหม่ `/api/admin/comments` และ `/api/admin/responses?before=` / `/:id`
- หน้าเว็บ: แยกไฟล์ตามแท็บ ใช้ HTML string และ `window.App` เหมือนเดิม

**Tech Stack:** Hono + D1 (Workers), vanilla JS, Tailwind CLI 3.4.17, vitest 5 + @cloudflare/vitest-plugin, Playwright 1.63.0

**Spec:** `docs/superpowers/specs/2026-10-31-admin-dashboard-design.md` (ต่อยอดจาก `docs/superpowers/specs/2026-10-30-blood-mobile-survey-backend-design.md`)

## Global Constraints

- ข้อห้ามและข้อกำหนดของ spec เดิมยังใช้ทั้งหมด: ไม่ใช้บริการที่ต้องใส่บัตร, ห้ามเปลี่ยนหน้าตาหรือข้อความของหน้าแบบสอบถาม, ไม่มี polling หรือ auto-refresh, `window.App` + vanilla JS + `<script defer>`
- รูปแบบเดิมของ `/api/admin/summary` (`staff: {n, heat, body, rank}`, `donor: {n, heat}`, `updated`, `more`, `usage`) ต้องอยู่ครบ ฟิลด์ใหม่เป็นการเพิ่มเท่านั้น
- cache: `v: 2`, รวมครั้งละ 100 แถว, หน้าเว็บเรียกต่อเองขณะ `more === true` ไม่เกิน 50 รอบ
- หน้าความคิดเห็นและรายคน: `limit` ค่าเริ่มต้น 50 (comments 1–100), `q` ยาวไม่เกิน 100 ตัวอักษร
- วันที่ของ "วันนี้" และกราฟรายวันใช้เวลาไทย (UTC+7) รูปแบบ `YYYY-MM-DD`
- ข้อความของผู้ตอบทุกจุดต้องผ่าน `App.ui.esc()` ก่อนใส่ใน HTML
- นับเฉพาะ key และตัวเลือกที่อยู่ใน `SCHEMA` / `ZONES` / `BODY_REGIONS` และใช้ `Object.hasOwn` ทุกครั้งที่เข้าถึง object สะสม
- สีผู้บริจาคเพิ่มใน `tailwind.config.js` เป็น `donor: '#4a6fa5'` (ต่างจาก `blood` #b83227 ทั้งเฉดสีและค่าความสว่าง) ก่อนใช้ให้โหลด skill `dataviz` เพื่อตรวจ ถ้าไม่ผ่านให้ปรับและบันทึก Ruling
- commit ใช้ `.superpowers/tools/c "<msg>" <paths>` (ผู้เขียน `plamolk` + trailer `Co-Authored-By: Claude Opus 5.5` / `Claude-Session`) และห้าม `git add -A`
- ทำงานบน clone `/home/claude/eve` แล้ว sync ไป `C:\eve` ด้วย git bundle (ตั้งชื่อไฟล์ไม่ซ้ำทุกครั้ง)

## Review Focus

1. **ความคิดเห็นหรือคำตอบที่มี HTML/สคริปต์** (`<script>alert(1)</script>`, `<img onerror>`): ต้องแสดงเป็นข้อความตรง ๆ ไม่ถูกรัน → Task 8 และ Task 9
2. **คำค้นที่มีอักขระพิเศษ** (`%`, `_`, `'`, `"`): ต้องค้นแบบตรงตัวอักษร ไม่ error และไม่จับทุกแถว → Task 3
3. **บทบาทที่ยังไม่มีคนตอบ** (เช่น มีแต่เจ้าหน้าที่): แท็บคำถามของบทบาทนั้นต้องแสดง "ยังไม่มีข้อมูล" ไม่ใช่ `NaN%` หรือหารด้วยศูนย์ → Task 7
4. **session หมดอายุระหว่างเปลี่ยนแท็บหรือกด [โหลดเพิ่ม]**: ต้องกลับหน้า login ไม่ค้าง → Task 8
5. **ลิงก์จากความคิดเห็นไปคำตอบที่ไม่มีแล้ว** (404): หน้ารายละเอียดต้องแสดง "ไม่พบคำตอบนี้" และมีปุ่มกลับ → Task 9

---

### Task 1: cache ผลสรุปรุ่น 2 (pure)

**Files:**
- Modify: `src/summary.js`, `src/schema.js` (ต่อท้ายไฟล์)
- Test: `tests/unit/summary.test.js`

**Interfaces:**
- Produces:
  - `TEXT_KEYS: { staff: string[], donor: string[] }` ใน `src/schema.js` หาจาก `SCHEMA[role].answers` ที่ `type === 'textarea'` ตามลำดับในไฟล์ ผลคือ staff `['rowdiff','cleanspot','material','setup','faint','worry','other']` และ donor `['improve']`
  - `emptyAcc() -> { v: 2, staff: Role, donor: Role }` ทั้งสองบทบาทมีชุด key เดียวกัน: `n, src1, days, heat, body, rank, rank1, q, num, msd, noMsd, zt, zp, noMap, text, notes` (ตัวเลขเริ่ม 0, object เริ่ม `{}`)
  - `mergeRows(acc, rows: {id, role, data: string, created: number, src: number}[]) -> acc` (object ใหม่ ไม่แก้ input)
  - `bangkokDay(sec: number) -> 'YYYY-MM-DD'` (export ไว้ทดสอบ)
  - `present(acc)` คืนรูปแบบเดิม + ต่อบทบาท:
    - `src1`, `days: [[date, n]]` (เรียงวันที่จากน้อยไปมาก)
    - `q` และ `num` (ส่งค่าเดิมไป), `rank1`
    - `msd: {region: {n, y, w, avg, dist: number[11]}}`
    - `noMsd`, `noMap`, `text`, `notes`
    - `zones: {zone: {t: [[type,n]], p: [[part,n]]}}` (เรียงจำนวนมากไปน้อย ถ้าเท่ากันเรียงด้วย `localeCompare(…,'th')`)
    - ฟิลด์เดิม `staff: {n, heat, body, rank}` / `donor: {n, heat}` ยังอยู่ และ donor ได้ฟิลด์ใหม่ครบเหมือน staff
- กฎการนับต่อ 1 แถว:
  - `n += 1`; ถ้า `src === 1` ให้ `src1 += 1`; `days[bangkokDay(created)] += 1`
  - ทุก key ใน `SCHEMA[role].answers` ที่มีค่า:
    - pills: `q[key][String(v)] += 1` ถ้า v อยู่ใน options
    - scale: แบบเดียวกับ pills (key เป็น String)
    - multi และ rank: `q[key][opt] += 1` ต่อตัวเลือกที่อยู่ใน options
    - rank: เพิ่ม `rank` ด้วยคะแนน 3/2/1 (เดิม) และ `rank1[v[0]] += 1`
    - number: `num[key][v] += 1`
    - textarea: `text[key] += 1`
  - `answers.noMsd === true` → `noMsd += 1`; `answers.noMap === true` → `noMap += 1`
  - msd ต่อ region ที่รู้จัก: `body[region] += 1` (เดิม) และ `msd[region].n += 1`; ถ้า `y === 'ใช่'` → `msd[region].y += 1`; ถ้า `w === 'ใช่'` → `msd[region].w += 1`; ถ้า s เป็นจำนวนเต็ม 0–10 → `msd[region].s[String(s)] += 1`
  - map ต่อ zone ที่รู้จัก:
    - `heat` (เดิม)
    - `zt[zone][type] += 1` ต่อ type ที่อยู่ใน `ZONE_TYPES`
    - `zp[zone][part] += 1` ต่อ part ที่อยู่ใน `ZONE_PARTS`
    - ถ้า `n.trim() !== ''` → `notes += 1`

- [ ] **Step 1: เขียน test ที่ต้อง fail** (`tests/unit/summary.test.js` เพิ่ม `describe('v2')`)
  - `emptyAcc().v === 2`
  - **staff 2 แถว:** pos `พยาบาล` ×2, ht ตอบแค่แถวเดียว, yrs `'5'` และ `'7'`, rank `['ซ่อนสาย','ทางเดินกว้างขึ้น','ทำความสะอาดง่าย']` และ `['ทางเดินกว้างขึ้น','ซ่อนสาย','ทำความสะอาดง่าย']`, msd คอ `{y:'ใช่', w:'ไม่', s:4}` (แถวแรก), แถวสองมี `noMsd:true`, map A3 `{t:['คับแคบ','เอื้อมยาก'], p:['พนักพิง'], sev:4, n:'แคบ'}`, `other: 'x'` ทั้ง 2 แถว, created `Date.parse('2026-10-30T17:30:00Z')/1000` และ `Date.parse('2026-10-30T16:59:00Z')/1000`, src 0 และ 1
    - `q.pos` deepEqual `{'พยาบาล': 2}`
    - `q.ht` มีผลรวม 1
    - `num.yrs` deepEqual `{'5':1,'7':1}`
    - `rank1` deepEqual `{'ซ่อนสาย':1,'ทางเดินกว้างขึ้น':1}`
    - `msd['คอ']` deepEqual `{n:1, y:1, w:0, avg:4, dist:[0,0,0,0,1,0,0,0,0,0,0]}`
    - `noMsd === 1`
    - `zones.A3.t` deepEqual `[['คับแคบ',1],['เอื้อมยาก',1]]` และ `zones.A3.p` deepEqual `[['พนักพิง',1]]`
    - `notes === 1`, `text.other === 2`, `src1 === 1`
    - `days` deepEqual `[['2026-10-30',1],['2026-10-31',1]]`
  - **donor 1 แถว:** seat 4, uneasy `['แสง','สี']`, noMap true
    - `q.seat` deepEqual `{'4':1}`
    - `q.uneasy` deepEqual `{'แสง':1,'สี':1}`
    - `noMap === 1`
  - รวมทีละส่วนเท่ากับรวมทีเดียว (ใช้แถวชุดข้างบน)
  - ค่าที่ไม่อยู่ใน options (`pos:'หมอ'`, zone type `'ร้อน'`, `s: 12`) ถูกข้าม
  - แถวที่มี `map: JSON.parse('{"__proto__":{"t":["คับแคบ"],"sev":1,"n":"x"}}')` ไม่ถูกนับ และหลังรวมแล้ว `({}).t` ยังเป็น `undefined`
  - `TEXT_KEYS` ตรงกับค่าใน Interfaces
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/summary.test.js`
  Expected: FAIL ที่ test ของ v2
- [ ] **Step 3: Implement ตาม Interfaces** (test ของรุ่นเดิมในไฟล์ต้องยังผ่าน)
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(api): summary cache v2 counts every question, daily totals and fallback rows" src/summary.js src/schema.js tests/unit/summary.test.js`

### Task 2: route summary ใช้ cache รุ่น 2 และอัปเกรดเอง

**Files:**
- Modify: `src/routes/admin.js` (route `/summary`)
- Test: `tests/worker/admin-data.test.js`

**Interfaces:**
- Consumes: `emptyAcc`, `mergeRows`, `present` (Task 1)
- Produces: `GET /api/admin/summary`
  - SELECT แถวใหม่เปลี่ยนเป็น `SELECT id, role, data, created, src FROM responses WHERE id > ? ORDER BY id LIMIT ?`
  - ถ้า `parsed.v !== 2` ให้ทำเหมือน `rebuild=1`
  - response เดิม + ฟิลด์ใหม่จาก `present`

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - `old cache without v:2 is rebuilt from zero`: seed 3 แถว แล้ว `UPDATE summary SET last_id = 3, data = '{"staff":{"n":99,"heat":{},"body":{},"rank":{}},"donor":{"n":0,"heat":{}}}'` → GET summary → `staff.n + donor.n === 3`
  - `summary includes v2 fields`: seed แถว staff ที่มี src 1 → `staff.src1 === 1`, `staff.days` มี 1 วัน, `staff.q` เป็น object
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.workers.config.js tests/worker/admin-data.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement ตาม Interfaces**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.workers.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(api): summary route serves v2 cache and upgrades old caches" src/routes/admin.js tests/worker/admin-data.test.js`

### Task 3: `GET /api/admin/comments`

**Files:**
- Modify: `src/routes/admin.js`
- Test: `tests/worker/admin-comments.test.js` (ใหม่)

**Interfaces:**
- Consumes: `TEXT_KEYS` (Task 1), `requireAdmin`, `createMeter`, `bumpUsage`
- Produces: `GET /api/admin/comments?key=&role=&q=&before=&limit=` → `{items: [{id, role, created, text, zone?}], next: number|null}` ตาม spec หัวข้อ 3.2
  - **ตรวจค่า (ไม่ผ่าน → 400 `{error:'invalid', field}`):**
    - `key` ต้องอยู่ใน `TEXT_KEYS.staff ∪ TEXT_KEYS.donor ∪ {'map'}`
    - `role` ต้องเป็น `staff|donor` หรือไม่ใส่
    - `before` เป็นจำนวนเต็ม ≥ 1 (ไม่ใส่ = `Number.MAX_SAFE_INTEGER`)
    - `limit` 1–100 (ค่าเริ่มต้น 50)
    - `q` หลัง trim ยาวไม่เกิน 100 (ว่าง = ไม่ค้น)
  - **SQL ของข้อความยาว:** path ของ `json_extract` สร้างจาก `key` ที่ตรวจแล้วเท่านั้น การค้นใช้ `instr(text, ?) > 0` (ไม่ใช้ LIKE เพื่อให้ `%` และ `_` ตรงตัวอักษร)
  - **`map`:** ใช้ 2 ขั้นตาม spec ถ้ามี `q` ใช้ขั้นเดียว

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - ไม่มี cookie → 401
  - `key=pos` และ `key=x` → 400 field `key`
  - **seed:**

    | id | role | answers | map |
    |---|---|---|---|
    | 1 | staff | `other:'สายไฟพาดพื้น'` | A3 หมายเหตุ `'แคบ'` และ Z5 หมายเหตุ `''` |
    | 2 | staff | `other:'100% ไม่มี_ปัญหา'` | — |
    | 3 | donor | `improve:'ที่วางของ'` | `noMap` |
    | 4 | staff | `other:"ห้อง 'A'"` | B1 หมายเหตุ `'เก้าอี้โยก'` |

  - `key=other` → ids `[4,2,1]` เรียงใหม่สุดก่อน และ `next === null`
  - `key=other&limit=2` → ids `[4,2]` และ `next === 2` ส่วน `&before=2` → ids `[1]`
  - `key=other&q=สาย` → ids `[1]`
  - `q=%` → ids `[2]` (ไม่ใช่ทุกแถว)
  - `q=_` → `[2]`
  - `q='A'` → `[4]`
  - `key=improve&role=donor` → `[{id:3, role:'donor', text:'ที่วางของ', created: <seed>}]`
  - `key=map` → items deepEqual `[{id:4, zone:'B1', text:'เก้าอี้โยก', …}, {id:1, zone:'A3', text:'แคบ', …}]` (ไม่มี Z5 ที่ว่าง)
  - `key=map&q=โยก` → `[4]`
  - `q` ยาว 101 → 400 field `q`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.workers.config.js tests/worker/admin-comments.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement ตาม Interfaces**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.workers.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(api): admin comments endpoint with search and paging" src/routes/admin.js tests/worker/admin-comments.test.js`

### Task 4: `responses?before=` และ `/responses/:id`

**Files:**
- Modify: `src/routes/admin.js`
- Test: `tests/worker/admin-data.test.js`

**Interfaces:**
- Produces:
  - `GET /api/admin/responses?before=&role=&limit=`: เรียงใหม่สุดก่อน (`WHERE id < ? … ORDER BY id DESC`) และ `next` = id สุดท้ายถ้าได้ครบ limit ถ้าส่งทั้ง `after` และ `before` → 400 field `before`
  - `GET /api/admin/responses/:id` → `{row}` / 404 `{error:'not_found'}` / 400 field `id` (ต้องเป็นจำนวนเต็ม ≥ 1)

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - seed 7 แถว (role donor ทุก id ที่หาร 3 ลงตัว)
  - `?before=8&limit=3` → ids `[7,6,5]`, `next === 5`
  - `?before=5&limit=3&role=donor` → ids `[3]`, `next === null`
  - `?after=1&before=5` → 400 `{error:'invalid', field:'before'}`
  - `/responses/3` → `row.id === 3` และ `typeof row.data === 'object'`
  - `/responses/999` → 404
  - `/responses/abc` และ `/responses/0` → 400
  - ไม่มี cookie → 401
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.workers.config.js tests/worker/admin-data.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement** (test ของ `after` แบบเดิมต้องยังผ่าน)
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.workers.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(api): newest-first responses paging and single response lookup" src/routes/admin.js tests/worker/admin-data.test.js`

### Task 5: `stats.js` และ `api.js` ของหน้าแอดมิน

**Files:**
- Create: `public/js/admin/stats.js`, `public/js/admin/api.js`
- Test: `tests/unit/admin-views.test.js` (ใหม่)

**Interfaces:**
- Produces:
  - `App.adminStats.pct(n, of) -> string`: เช่น `'66.7%'` (ทศนิยม 1 ตำแหน่ง ตัด `.0` ออก ให้ได้ `'50%'`) ถ้า `of === 0` → `'0%'`
  - `App.adminStats.freqStats(freq: {value: count}) -> {n, mean, median, min, max}`: แปลง key เป็น Number และ `n === 0` → `{n:0, mean:null, median:null, min:null, max:null}`
  - `App.adminStats.bins(freq, max = 20) -> [[label, n]]`: ถ้าค่าต่างกันไม่เกิน max ให้ใช้แต่ละค่าเรียงจากน้อยไปมาก ถ้าเกิน แบ่งเป็น max ช่วงเท่ากัน label `'a–b'`
  - `App.adminStats.fillDays(staffDays: [[d,n]], donorDays: [[d,n]]) -> [[d, staff, donor]]`: ทุกวันตั้งแต่วันแรกถึงวันสุดท้าย วันที่ไม่มีข้อมูลเป็น 0
  - `App.adminStats.bangkokDate(sec) -> 'YYYY-MM-DD'` และ `App.adminStats.bangkokTime(sec) -> 'YYYY-MM-DD HH:mm'`
  - `App.adminApi.call(method, url, body) -> Promise<json|null>`: ย้ายมาจาก admin.js เดิม (อ่าน body เสมอ, 401 → throw `{auth:true}`)
  - `App.adminApi.summaryAll(onProgress?: (rounds) => void) -> Promise<summary>`: เรียก `/api/admin/summary` ซ้ำขณะที่ `more === true` ไม่เกิน 50 รอบ แล้วคืนผลล่าสุด
  - `App.adminApi.comments(params)`, `responses(params)`, `response(id)`: สร้าง query string จาก params แล้วเรียก `call('GET', …)`

- [ ] **Step 1: เขียน test ที่ต้อง fail** (โหลดด้วย `loadBrowser([...,'public/js/admin/stats.js','public/js/admin/api.js'], { fetch: stub })`)
  - `pct(2,3) === '66.7%'`, `pct(1,2) === '50%'`, `pct(0,0) === '0%'`
  - `freqStats({'5':1,'7':1}) → {n:2, mean:6, median:6, min:5, max:7}`
  - `freqStats({'1':1,'2':1,'9':1}).median === 2`
  - `freqStats({}).mean === null`
  - `bins({'1':1,'3':2})` deepEqual `[['1',1],['3',2]]`
  - `bins` ของ 30 ค่า (`'1'`…`'30'` ค่าละ 1) ได้ 20 ช่อง และผลรวมเป็น 30
  - `fillDays([['2026-10-30',2]], [['2026-11-01',1]])` deepEqual `[['2026-10-30',2,0],['2026-10-31',0,0],['2026-11-01',0,1]]`
  - `bangkokDate(Date.parse('2026-10-30T17:30:00Z')/1000) === '2026-10-31'`
  - `summaryAll`: stub ตอบ `more:true` 2 ครั้งแล้ว `more:false` → เรียก 3 ครั้ง และ onProgress ได้ 1, 2
  - stub ตอบ `more:true` ตลอด → หยุดที่ 50 ครั้ง
  - `call` เมื่อได้ 401 → reject ด้วย `auth === true`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/admin-views.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement ตาม Interfaces**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(admin): stats helpers and API client" public/js/admin/stats.js public/js/admin/api.js tests/unit/admin-views.test.js`

### Task 6: โครงหน้า 4 แท็บ + แท็บภาพรวม

**Files:**
- Create: `public/js/admin/overview.js`
- Modify: `public/js/admin/admin.js` (เหลือแค่โครงหน้า), `public/admin.html` (ลำดับสคริปต์ตาม spec 4.1), `tailwind.config.js` (`donor` color), `tests/unit/admin-logic.test.js`, `tests/e2e/admin.spec.js`

**Interfaces:**
- Consumes: `App.adminStats`, `App.adminApi` (Task 5) และ `present` v2 (Task 1–2)
- Produces:
  - `App.adminViews.overview(summary, heatTab: 'staff'|'donor') -> html`:
    - ตัวเลขใหญ่ 6 ช่อง (spec 2.1) โดย "วันนี้" = ค่าใน `days` ของ `bangkokDate(now)` รวมทั้ง 2 บทบาท
    - กราฟรายวันเป็น `<svg role="img" aria-label="จำนวนคำตอบรายวัน">` แท่งซ้อน (`fill` = blood / donor) พร้อม `<text>` ยอดรวมบนแท่ง อยู่ใน `<div class="overflow-x-auto">` และเมื่อเกิน 31 วัน ความกว้างของ svg = จำนวนวัน × ความกว้างต่อแท่งคงที่ (เลื่อนแนวนอนได้)
    - การ์ดเดิม heat (มีแท็บย่อย), body, rank และการ์ดโควตา
  - `App.adminViews.bars(rows)`: ย้ายมาจาก `App.admin.bars` (พฤติกรรมเดิม)
  - `App.admin = { toCSV, boot }`: เลิกใช้ `App.admin.view` และ `App.admin.bars`
  - state ของ admin.js ตาม spec 4.2 แท็บหลักเป็นปุ่ม `data-action="tab" data-value="overview|questions|comments|people"` และแท็บย่อยของ heat เป็น `data-action="heattab"`
  - ข้อความใหม่ใน `App.data.admin` ตาม spec 4.3
  - ระหว่าง `summaryAll` ให้ `onProgress(rounds)` แสดงสถานะ `กำลังรวมข้อมูล… {n}` (n = จำนวนรอบ)
- [ ] **Step 1: ปรับ test เดิมและเขียน test ใหม่ที่ต้อง fail**
  - `admin-logic.test.js`: เปลี่ยน `App.admin.view(empty,'staff')` เป็น `App.adminViews.overview(emptyV2, 'staff')` และ `bars` เป็น `App.adminViews.bars` (ต้องโหลดไฟล์ admin ใหม่ทั้งหมด) assertion เดิมยังต้องผ่าน และ `emptyV2` สร้างจาก fixture ที่มีฟิลด์ v2 ว่าง
  - เพิ่ม test:
    - overview ตอนมี `days` ของวันนี้ (staff 2, donor 1) ต้องมีตัวเลข `3` ในช่อง "วันนี้" และ "เข้าทางสำรอง" แสดง `src1` รวม
    - svg มี `<rect` จำนวน 2 × จำนวนวันหลัง `fillDays`
    - `days` 40 วัน → html มี `overflow-x-auto` และ `<rect` 80 อัน
  - `admin.spec.js`: mock summary ใช้รูปแบบ v2 (เพิ่มฟิลด์ใหม่), test เดิมทั้งหมดต้องผ่าน และเพิ่ม test:
    - `tabs switch between the four views`: กด 4 แท็บแล้วเห็นหัวข้อของแต่ละแท็บ
    - `summary keeps loading while more is true`: mock ตอบ `more:true` 1 ครั้งแล้ว `more:false` → นับคำขอได้ 2
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/admin-logic.test.js && npx playwright test -c playwright.config.js tests/e2e/admin.spec.js`
  Expected: FAIL
- [ ] **Step 3: Implement** (โหลด skill `dataviz` ก่อนเขียนกราฟ แท็บที่ยังไม่ทำให้แสดงหัวข้อของแท็บ + "กำลังพัฒนา" ชั่วคราวจนถึง Task 7–9)
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm run build:css && npx vitest run --config vitest.config.js && npx playwright test -c playwright.config.js tests/e2e/admin.spec.js tests/e2e/pages.spec.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(admin): four-tab shell and overview with daily chart" public/js/admin public/admin.html tailwind.config.js tests/unit/admin-logic.test.js tests/e2e/admin.spec.js`

### Task 7: แท็บคำถามทั้งหมด

**Files:**
- Create: `public/js/admin/questions.js`
- Modify: `public/js/admin/admin.js` (ผูกแท็บ + `data-action="qrole"` + ลิงก์ `data-action="gocomments" data-key=`)
- Test: `tests/unit/admin-views.test.js`

**Interfaces:**
- Consumes: `App.data.sections`, `App.data.zoneForm`, `App.data.findArea`, `App.adminStats`
- Produces: `App.adminViews.questions(summary, role) -> html` แสดงตามตารางใน spec 2.2 เมื่อ `summary[role].n === 0` แสดง "ยังไม่มีข้อมูล" ครั้งเดียว
  - pills/scale/multi แสดงทุกตัวเลือกรวมตัวที่ได้ 0 และ % คำนวณจาก "จำนวนคนที่ตอบข้อนี้" ดังนี้
    - pills/scale: ผลรวมของ `q[key]`
    - multi: `n` ของบทบาท (multi เป็นข้อบังคับ)
    - ข้อ optional: ผลรวมของ `q[key]` และแสดง `ตอบ {n} จาก {m} คน`
- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - **staff fixture v2** (`pos: {'พยาบาล':2}`, `ht: {'155-165':1}`, n = 2):
    - ได้ `'พยาบาล'` คู่กับ `2 (100%)`
    - `'อื่น ๆ'` คู่กับ `0 (0%)`
    - มี `'ตอบ 1 จาก 2 คน'`
  - **scale:** donor `seat: {'4':1,'2':1}` → มี `'ค่าเฉลี่ย 3'`
  - **number:** `yrs: {'5':1,'7':1}` → มี `'ค่าเฉลี่ย 6'`, `'มัธยฐาน 6'`, `'ต่ำสุด 5'`, `'สูงสุด 7'`
  - **multi:** donor `uneasy: {'แสง':1,'สี':1}` (n = 1) → `'แสง'` คู่กับ `1 (100%)` และมี `'เลือกได้หลายข้อ ผลรวมเกิน 100% ได้'`
  - **rank:** `rank: {'ซ่อนสาย':5,'ทางเดินกว้างขึ้น':5,'ทำความสะอาดง่าย':2}`, `rank1: {'ซ่อนสาย':1,'ทางเดินกว้างขึ้น':1}` → มี `'อันดับ 1 (คน)'` และ `'ทำความสะอาดง่าย'` อยู่หลัง `'ซ่อนสาย'`
  - **textarea:** `text.other = 2` → มี `'2 ความคิดเห็น'` และ `data-action="gocomments" data-key="other"`
  - **ส่วน C:** แถวของ `'คอ'` มี `1` และค่าเฉลี่ยความรุนแรง `4` และมี `'ไม่มีอาการ 1 คน'`
  - **ส่วน D:** แถว A3 มี `'คับแคบ (1)'` และมี `'ไม่พบปัญหา 0 คน'`
  - ตารางส่วน C/D มี `scope="col"`
  - **(Review Focus 3)** `questions(summaryWithDonorZero, 'donor')` มี `'ยังไม่มีข้อมูล'` และไม่มี `NaN`/`Infinity`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/admin-views.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npx vitest run --config vitest.config.js`
  Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(admin): per-question summary tab" public/js/admin/questions.js public/js/admin/admin.js tests/unit/admin-views.test.js`

### Task 8: แท็บความคิดเห็น

**Files:**
- Create: `public/js/admin/comments.js`
- Modify: `public/js/admin/admin.js`
- Test: `tests/unit/admin-views.test.js`, `tests/e2e/admin.spec.js`

**Interfaces:**
- Consumes: `App.adminApi.comments`, `App.data.sections` (หา label), `App.data.findArea` (ชื่อจุด), `summary[role].text` / `notes` (จำนวน)
- Produces:
  - `App.adminViews.commentKeys() -> [{key, role, label}]` ตามลำดับ: textarea ของ staff ตามลำดับในแบบสอบถาม → textarea ของ donor → `{key:'map', role:null, label:'หมายเหตุจุดบนผัง'}`
  - `App.adminViews.comments(state, summary) -> html`
    - `state = {key, q, items, next, loading, error}`
    - การ์ดใช้ class `whitespace-pre-wrap break-words` และ link `data-action="person" data-id=`
  - การทำงานใน admin.js:
    - action `ckey` (เลือกข้อ → โหลดหน้าแรก), `csearch` (form submit), `cclear`, `cmore` (โหลดเพิ่มด้วย `before = next`)
    - ส่งพารามิเตอร์ `role` ให้ textarea ตาม `commentKeys` ส่วน `map` ไม่ส่ง
    - error 401 → กลับหน้า login
- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - unit: `commentKeys().map(k => k.key)` deepEqual `['rowdiff','cleanspot','material','setup','faint','worry','other','improve','map']`
  - **unit (Review Focus 1):** `comments({key:'other', items:[{id:1, role:'staff', created:0, text:'<script>alert(1)</script>\nบรรทัดสอง'}], next:null}, summary)`
    - มี `&lt;script&gt;`
    - ไม่มี `<script>alert`
    - มี `whitespace-pre-wrap`
    - มี `data-action="person" data-id="1"`
  - unit: `items: []` → มี `'ไม่พบความคิดเห็น'`
  - unit: `key:'map'` กับ item `{id:4, zone:'B1', text:'เก้าอี้โยก'}` → มี `App.data.findArea('B1').label`
  - **e2e (mock):**
    - `comments: choose a question, load more, search`: เห็นจำนวนจาก summary · ได้ 2 หน้า (หน้าแรก `next:5`) · คำขอที่สองมี `before=5` · ค้นแล้ว URL มี `q=`
    - **(Review Focus 4)** `401 on load more returns to login` และ `401 when opening the comments tab returns to login`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/admin-views.test.js && npx playwright test -c playwright.config.js tests/e2e/admin.spec.js`
  Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: คำสั่งเดียวกับ Step 2
  Expected: PASS
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(admin): comments tab with search and load more" public/js/admin/comments.js public/js/admin/admin.js tests/unit/admin-views.test.js tests/e2e/admin.spec.js`

### Task 9: แท็บรายคน

**Files:**
- Create: `public/js/admin/people.js`
- Modify: `public/js/admin/admin.js`
- Test: `tests/unit/admin-views.test.js`, `tests/e2e/admin.spec.js`

**Interfaces:**
- Consumes: `App.adminApi.responses` / `response`, `App.data.sections`, `App.data.msd`, `App.data.zoneForm`, `App.data.findArea`, `App.adminStats.bangkokTime`
- Produces:
  - `App.adminViews.peopleList(state) -> html`
    - `state = {role, rows, next, stack}` (`stack` = รายการ `before` ที่ใช้ย้อนหน้า)
    - แต่ละแถวเป็นปุ่ม `data-action="person" data-id=`
    - ช่องทาง: `src === 1` → `'ทางสำรอง'` ไม่เช่นนั้น `'ตรง'`
  - `App.adminViews.person(row | null) -> html`
    - `null` → `'ไม่พบคำตอบนี้'` + ปุ่ม `data-action="peopleback"`
    - แสดงคำตอบตามชนิด:
      - scale ใช้ `label` ของตัวเลือก
      - multi ใช้ `<ul>` ส่วน rank ใช้ `<ol>`
      - optional ที่ว่างแสดง `—`
      - ส่วน C ใช้ตาราง หรือ `'ไม่มีอาการปวดเมื่อย'`
      - ส่วน D ใช้ตาราง (จุดใช้ `findArea(id).label`) หรือ `'ไม่พบปัญหา'`
    - ข้อความทุกช่องผ่าน `esc`
  - การทำงานใน admin.js:
    - action `prole`, `pnewer`, `polder`, `person` (เรียก `response(id)` แล้วสลับไปแท็บรายคนในโหมดรายละเอียด แม้กดมาจากแท็บความคิดเห็น), `peopleback`
    - 404 → `person(null)`
- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - unit `person(staffRow)` (ใช้ `tests/fixtures/staff-full.json` เป็น data):
    - มี label `'ตำแหน่งงาน'`
    - มีชื่อส่วน `'ส่วน A ข้อมูลทั่วไป'`
    - มี `<ol` สำหรับ rank
    - มีชื่อจุด `findArea('A3').label`
  - unit: donor row ที่ไม่มีข้อ optional (ไม่มี optional ใน donor ให้ใช้ staff ที่ลบ `ht`) → มี `—`
  - **unit (Review Focus 1):** `answers.other = '<img src=x onerror=alert(1)>'` → ไม่มี `<img` แต่มี `&lt;img`
  - unit: `person(null)` มี `'ไม่พบคำตอบนี้'` และ `data-action="peopleback"`
  - **e2e (mock):**
    - `people: list, open detail, go back`
    - `comment link opens that person`
    - **(Review Focus 5)** `missing person shows not found`: mock `/responses/9` → 404
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npx vitest run --config vitest.config.js tests/unit/admin-views.test.js && npx playwright test -c playwright.config.js tests/e2e/admin.spec.js`
  Expected: FAIL
- [ ] **Step 3: Implement** (ลบข้อความ "กำลังพัฒนา" ชั่วคราวจาก Task 6 ออก)
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: คำสั่งเดียวกับ Step 2
  Expected: PASS
- [ ] **Step 5: Commit**
  `.superpowers/tools/c "feat(admin): people tab with full answer detail" public/js/admin/people.js public/js/admin/admin.js tests/unit/admin-views.test.js tests/e2e/admin.spec.js`

### Task 10: ทดสอบกับ Worker จริง เอกสาร และ sync

**Files:**
- Modify: `tests/e2e/full.spec.js`, `docs/operations.md`, `2026-10-30-blood-mobile-survey-frontend-design.md` (หัวข้อ Pages ข้อ 4)

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า

- [ ] **Step 1: เพิ่ม test ใน `full.spec.js`** ต่อจาก test `admin page shows the real counts` และก่อน test over-quota: `dashboard tabs show real data`
  1. login ผ่าน UI แล้วดูแท็บภาพรวม → ต้องเห็น `คำตอบทั้งหมด` และ `2`
  2. แท็บความคิดเห็น เลือก `ข้อเสนอแนะอื่น ๆ` → ต้องเห็น `ไม่มี` (ค่า `STAFF.answers.other`)
  3. กด `ดูคำตอบทั้งหมดของคนนี้` → ต้องเห็น `ตำแหน่งงาน` และ `พยาบาล`
- [ ] **Step 2: รันทั้งชุด**
  Run: `npm test && npx playwright test -c playwright.config.js && BASE_URL=http://localhost:8787 npm run visual`
  Expected: ผ่านทั้งหมด (visual 6 ผ่านแบบไม่ต้องอัปเดตภาพต้นแบบ เพราะหน้าแบบสอบถามไม่เปลี่ยน)
- [ ] **Step 3: อัปเดตเอกสาร**
  - `docs/operations.md` หัวข้อ 4 เพิ่ม "หน้าแอดมิน 4 แท็บ" และต้นทุนตาม spec 3.3
  - design doc เดิม ข้อ 4 เปลี่ยนเป็นคำอธิบาย 4 แท็บ
- [ ] **Step 4: Commit และ sync**
  `.superpowers/tools/c "test+docs: dashboard end to end and operations notes" tests/e2e/full.spec.js docs/operations.md 2026-10-30-blood-mobile-survey-frontend-design.md` แล้วสร้าง bundle ที่ตั้งชื่อตาม hash และ fast-forward ที่ `C:\eve`
