# แบบสอบถามรถรับบริจาคโลหิต — Frontend Prep + Free-tier Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แยก SPA เดิมเป็นหลายหน้าที่เบาลง เอาข้อมูลจำลองออก แล้วต่อเข้ากับ backend บน Cloudflare Workers + D1 ที่อยู่ในโควตาฟรี และมี Google Sheets เป็นทางสำรองเมื่อโควตาใกล้เต็มหรือ Worker ล่ม

**Architecture:** ไฟล์หน้าเว็บอยู่ใน `public/` และเสิร์ฟเป็น Workers Static Assets (ฟรีไม่จำกัด) ส่วน Worker (Hono) ทำงานเฉพาะ `/api/*` บันทึกลง D1 ด้วยรูปแบบ 1 คำตอบ = 1 แถว ถ้ายอดของวันถึง 80% หรือ D1 error จะส่งต่อไป Apps Script ถ้า Worker ล่ม เบราว์เซอร์จะส่งตรงไป Apps Script และ Apps Script ซิงก์กลับ D1 ทุกชั่วโมง หน้าแอดมินอ่านผลสรุปจาก cache ที่อัปเดตแบบเพิ่มทีละส่วน

**Tech Stack:** HTML + vanilla JS (`window.App`, `<script defer>`), Tailwind CLI 3.4.17, Cloudflare Workers + Static Assets + D1 + Rate Limiting binding + Turnstile, Hono, Google Apps Script, vitest + @cloudflare/vitest-pool-workers, Playwright

**Spec:** `docs/superpowers/specs/2026-10-30-blood-mobile-survey-backend-design.md`

## Global Constraints

- ห้ามใช้บริการที่ต้องใส่บัตรเครดิตหรือมีค่าใช้จ่ายแอบแฝง (ไม่ใช้ R2 และไม่ใช้ Cloudflare Access)
- ห้ามเปลี่ยนหน้าตาหรือข้อความคำถามเดิม ยกเว้นส่วนที่เกี่ยวกับข้อมูลจำลอง โดยใช้ visual test (Task 2) เป็นตัวตัดสิน
- `data` ต้องเป็น `{role, answers, msd, map}` ตรงกับ `App.store.toJSON()` เดิม และ envelope ต้องเป็น `{"v":1,"cid":"<uuid>","token":"<turnstile>","hp":"","data":{…}}`
- localStorage ใช้เก็บร่างสำรองเท่านั้น (key `eve-draft`) ทุกการเรียกต้องห่อ try/catch และต้องลบเมื่อได้ 201/202
- ห้ามลบไฟล์นอกกลุ่ม (ก) และ (ข) ในหัวข้อ 14 ของ spec จนกว่าผู้ใช้จะอนุมัติตารางใน Task 9
- ใช้ `window.App` + vanilla JS + `<script defer>` ไม่ใช้ framework ฝั่งหน้าเว็บ
- version ที่ pin ไว้: `tailwindcss 3.4.17`, `hono 4.13.14`, `wrangler 4.156.0`, `vitest 4.1.12`, `@cloudflare/vitest-pool-workers 0.23.0`, `@playwright/test 1.63.0` และ Node ≥ 22 (wrangler กำหนดไว้ใน engines)
- ขีดจำกัด (ใช้ค่าเดียวกันทั้ง client และ server): body ≤ 16384 bytes, data ≤ 13824 bytes, textarea ≤ 2000 ตัวอักษร, หมายเหตุจุดผัง ≤ 500, คำตอบตัวเลข 0–9999 (เก็บเป็น string), msd `s` 0–10 หรือ `""`, scale/sev เป็นจำนวนเต็ม 1–5, เกณฑ์โควตา 0.8 ของ 100000 rows written / 5000000 rows read, rate limit 5 ครั้ง/60 วินาที/IP, cookie อายุ 28800 วินาที, รวมผลสรุปครั้งละ 100 แถว, หน้ารายการดิบไม่เกิน 200 แถว, import ครั้งละไม่เกิน 40 รายการ
- ไม่บันทึก IP หรือ User-Agent ลงที่เก็บใด ๆ
- ทุก commit ใช้ `git -c user.name=plamolk -c user.email=nongvigo1234@gmail.com commit …` และท้ายข้อความมี 2 บรรทัด:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` และ `Claude-Session: https://claude.ai/code/session_01227fSaWviR7iidFB5zUcgo` (คำสั่ง commit ในแต่ละ task เขียนย่อไว้)
- `git add` ระบุไฟล์ทุกครั้ง ห้ามใช้ `git add -A` เพราะ `backend-prompt.md`, `img/` และ `Claude outputs/` ต้องไม่อยู่ใน git

**สภาพแวดล้อมตอนรัน:** repo อยู่ที่ `C:\eve` บนเครื่องผู้ใช้ งานแก้โค้ด, `npm`, `wrangler` และ vitest รันที่นั่น ส่วน Playwright ต้องมี Chromium ถ้าเครื่องที่รันไม่มี ให้ใช้ `npx playwright install chromium` (หรือรันบนเครื่องที่มี Chromium รุ่นของ Playwright 1.63.0 ติดตั้งอยู่แล้ว โดยใช้สำเนาของ working tree)

## Review Focus

1. **ตัวเลขที่พิมพ์เกินช่วง** (ความรุนแรงส่วน C = 12, ประสบการณ์ = "-1" หรือ "1e9"): ผู้ตอบต้องเห็นข้อความที่บอกว่าผิดที่ส่วนไหน และหน้าจอพาไปส่วนนั้น ไม่ใช่เจอ 400 จาก server → ทดสอบใน Task 6 และ Task 10
2. **กด "ส่งคำตอบ" ซ้ำเร็ว ๆ หรือกดส่งอีกครั้งหลัง timeout:** ต้องเกิดคำขอเดียวและแถวเดียว (ปุ่มถูก disable ระหว่างส่ง + กันซ้ำด้วย `cid`) → ทดสอบใน Task 7 และ Task 12
3. **session แอดมินหมดอายุระหว่างเปิดหน้าอยู่:** เมื่อกด [อัปเดต] ต้องกลับไปที่ฟอร์มเข้าสู่ระบบ ไม่ใช่หน้าพัง → ทดสอบใน Task 8
4. **CSV ที่มีภาษาไทยปนจุลภาค เครื่องหมายคำพูด ขึ้นบรรทัดใหม่ และอีโมจิ:** ต้องเปิดใน Excel ได้ถูกต้อง (มี BOM และ quote ตาม RFC 4180) → ทดสอบใน Task 8
5. **สคริปต์ Turnstile ถูกบล็อกหรือโหลดไม่ได้** (ad blocker หรือเน็ตหลุด): กดส่งแล้วต้องได้ข้อความให้ลองใหม่และปุ่มคัดลอก โดยไม่มี uncaught error → ทดสอบใน Task 7

---

## Phase 0 — ขั้นที่ 0

### Task 1: Snapshot งานค้าง + ทำ line ending ให้คงที่

**Files:**
- Create: `.gitattributes`
- Modify: ไฟล์ข้อความที่อยู่ใน git ทุกไฟล์ (แปลง CRLF → LF เท่านั้น)

**Interfaces:** ไม่มี

- [ ] **Step 1: ตรวจสถานะก่อนเริ่ม**
  Run: `git status --short`
  Expected: มีบรรทัด ` M` 16 บรรทัด และ `??` 3 บรรทัด (`Claude outputs/`, `backend-prompt.md`, `img/`)
- [ ] **Step 2: Commit snapshot (เฉพาะไฟล์ที่อยู่ใน git อยู่แล้ว)**
  ```bash
  git add -u
  git commit -m "chore: snapshot pending frontend work before restructure"
  ```
- [ ] **Step 3: สร้าง `.gitattributes`**
  ```
  * text=auto eol=lf
  *.png binary
  *.jpg binary
  ```
- [ ] **Step 4: แปลง working tree เป็น LF แล้ว renormalize**
  ```bash
  git ls-files -z -- '*.html' '*.js' '*.css' '*.md' | xargs -0 sed -i 's/\r$//'
  git add .gitattributes && git add --renormalize .
  ```
- [ ] **Step 5: ตรวจว่าเปลี่ยนแค่ line ending**
  Run: `git diff --cached --ignore-cr-at-eol --stat`
  Expected: มีแค่ `.gitattributes`
  Run: `git ls-files --eol | grep -c crlf`
  Expected: `0`
- [ ] **Step 6: Commit**
  `git commit -m "chore: normalize line endings to LF via .gitattributes"`

### Task 2: Tooling + baseline ของ visual test + น้ำหนักหน้าก่อนปรับ

**Files:**
- Create: `package.json`, `package-lock.json`, `.gitignore`, `playwright.visual.config.js`, `tests/visual/screens.visual.spec.js`, `tests/visual/weight.mjs`, `docs/reports/weights-before.json`

**Interfaces:**
- Produces:
  - npm scripts:
    - `dev` = `wrangler dev`
    - `build:css` = `tailwindcss -c tailwind.config.js -i src/styles.css -o public/css/app.css --minify`
    - `test` = `npm run test:unit && npm run test:worker`
    - `test:unit` = `vitest run --config vitest.config.js`
    - `test:worker` = `vitest run --config vitest.workers.config.js`
    - `visual` = `playwright test -c playwright.visual.config.js`
    - `e2e` = `playwright test -c playwright.config.js`
  - `node tests/visual/weight.mjs <baseURL> <out.json> <path...>` → JSON `{ "<path>": { requests, bytes, encodedBytes, resources: [{url, type, bytes, encodedBytes}] } }`
  - visual test ชื่อ `intro`, `staff-A`…`staff-F`, `donor-A`…`donor-E`, `thanks-pilot`, `summary-mock` (ทุกหน้าใช้การกดตามข้อความ จึงรันได้ทั้งกับ SPA เดิมและหน้าใหม่)

- [ ] **Step 1: สร้าง `package.json`**
  ใส่ `"private": true`, `"type": "module"`, `"engines": {"node": ">=22"}` และ scripts ตามด้านบน
  - `dependencies`: `hono 4.13.14`
  - `devDependencies` (pin exact): `wrangler 4.156.0`, `tailwindcss 3.4.17`, `vitest 4.1.12`, `@cloudflare/vitest-pool-workers 0.23.0`, `@playwright/test 1.63.0`

  จากนั้นรัน `npm install`
- [ ] **Step 2: สร้าง `.gitignore`**
  ```
  node_modules/
  .wrangler/
  .dev.vars
  public/css/app.css
  test-results/
  playwright-report/
  tests/visual/__baseline__/
  ```
- [ ] **Step 3: เขียน `playwright.visual.config.js`**
  - `use.baseURL = process.env.BASE_URL`
  - `snapshotPathTemplate: 'tests/visual/__baseline__/{projectName}/{arg}{ext}'`
  - `expect.toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled' }`
  - 2 projects: `mobile` (viewport 390×844) และ `desktop` (1280×900)
  - ไม่มี webServer (ผู้รันต้องเปิด server เอง)
- [ ] **Step 4: เขียน `tests/visual/screens.visual.spec.js`**
  - helper `step(page, name)`: รอ `page.waitForLoadState('networkidle')` และรอให้ `#app` มี element ลูก (หน้าใหม่โหลดสคริปต์ของบทบาทแบบ async) แล้วจึง `await expect(page).toHaveScreenshot(name + '.png', { fullPage: true })`
  - `intro`: goto `/` → step
  - `staff-*`: goto `/` → `getByText('เจ้าหน้าที่', {exact:true}).click()` → ถ่ายภาพ A แล้วกด `getByText('ถัดไป', {exact:true})` ทีละส่วนจนถึง F
  - `donor-*`: แบบเดียวกันสำหรับ `'ผู้บริจาคโลหิต'` ส่วน A–E
  - `thanks-pilot`: ไล่ staff ไปถึง F → กด `'ส่งคำตอบ'` → step
  - `summary-mock`: goto `/` → กด `'ดูตัวอย่างหน้าสรุปผล (ข้อมูลจำลอง)'` → step
  - หัวไฟล์มีคอมเมนต์ว่า `thanks-pilot` และ `summary-mock` จะถูกลบใน Task 7–8
- [ ] **Step 5: เขียน `tests/visual/weight.mjs`**
  ใช้ chromium จาก `@playwright/test` แล้วทำทีละ path:
  1. เปิดหน้าใหม่
  2. ฟัง `page.on('response')` เก็บ `bytes = (await res.body()).length`, `encodedBytes = (await res.request().sizes()).responseBodySize` และ `type = res.request().resourceType()`
  3. `goto(baseURL + path, {waitUntil: 'networkidle'})`
  4. รวมผลแล้วเขียนไฟล์ JSON
- [ ] **Step 6: สร้าง baseline จากโค้ดเดิม**
  ```bash
  python3 -m http.server 8000 &          # เสิร์ฟจาก root ของ repo (ยังไม่ย้ายไฟล์)
  BASE_URL=http://localhost:8000 npx playwright test -c playwright.visual.config.js --update-snapshots
  node tests/visual/weight.mjs http://localhost:8000 docs/reports/weights-before.json /index.html
  ```
  Expected: มีภาพ baseline 15 ภาพต่อ project และ `weights-before.json` มี resource ของ `cdn.tailwindcss.com` (ประมาณ 407 KB ก่อนบีบอัด)
- [ ] **Step 7: ยืนยันว่ารันซ้ำแล้วผ่าน**
  Run: `BASE_URL=http://localhost:8000 npm run visual`
  Expected: 30 passed
- [ ] **Step 8: Commit**
  ```bash
  git add package.json package-lock.json .gitignore playwright.visual.config.js tests/visual docs/reports/weights-before.json
  git commit -m "test: add visual baseline and page-weight tooling"
  ```
  baseline ภาพอยู่ใน `.gitignore` จึงไม่ถูก commit และต้องรันบนเครื่องและเบราว์เซอร์เดิมตลอดทั้งงาน

## Phase 1 — ขั้นที่ 1 (แยกหน้า)

### Task 3: ย้ายไฟล์หน้าเว็บเข้า `public/` และให้ wrangler เสิร์ฟ

**Files:**
- Move: `index.html` → `public/index.html`, `css/` → `public/css/`, `js/` → `public/js/`
- Create: `wrangler.jsonc`

**Interfaces:**
- Produces: `npm run dev` เปิด `http://localhost:8787` และเสิร์ฟ `public/`

- [ ] **Step 1: ย้ายไฟล์**
  `mkdir public && git mv index.html css js public/`
- [ ] **Step 2: สร้าง `wrangler.jsonc`**
  ```jsonc
  { "$schema": "node_modules/wrangler/config-schema.json",
    "name": "eve-survey", "compatibility_date": "2026-10-01",
    "assets": { "directory": "./public" } }
  ```
- [ ] **Step 3: ตรวจว่าหน้าเว็บเหมือนเดิม**
  Run: `npm run dev` (เปิดค้างไว้) แล้ว `BASE_URL=http://localhost:8787 npm run visual`
  Expected: 30 passed
- [ ] **Step 4: Commit**
  ```bash
  git add wrangler.jsonc public
  git commit -m "refactor: serve static files from public/ via Workers static assets"
  ```

### Task 4: เปลี่ยน Tailwind Play CDN เป็น Tailwind CLI 3.4.17

**Files:**
- Create: `tailwind.config.js`
- Move: `public/css/styles.css` → `src/styles.css`
- Modify: `public/index.html` (`<head>`), `wrangler.jsonc`

**Interfaces:**
- Produces: `public/css/app.css` ได้จาก `npm run build:css` และ `wrangler dev`/`deploy` จะ build ให้เองก่อนทุกครั้ง

- [ ] **Step 1: สร้าง `tailwind.config.js`**
  ```js
  export default {
    content: ['./public/**/*.html', './public/js/**/*.js'],
    theme: { extend: /* คัดลอก object theme.extend จาก <script> ใน public/index.html มาแบบไม่แก้ */ }
  };
  ```
- [ ] **Step 2: ย้าย CSS เดิมแล้วเติม directive**
  `git mv public/css/styles.css src/styles.css` แล้วเพิ่ม 3 บรรทัดที่หัวไฟล์:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- [ ] **Step 3: แก้ `<head>` ของ `public/index.html`**
  ลบ `<script src="https://cdn.tailwindcss.com/3.4.17">` และ `<script>tailwind.config = …</script>` แล้วเปลี่ยน `css/styles.css` เป็น `css/app.css`
- [ ] **Step 4: ใส่ build command ใน `wrangler.jsonc`**
  `"build": { "command": "npm run build:css" }`
- [ ] **Step 5: ตรวจ class ที่ประกอบขึ้นตอนรัน**
  Run: `grep -rnE "class=\"[^\"]*'\s*\+|'\s*\+\s*'[a-z:-]*\[" public/js`
  Expected: เจอแค่ `bus-map.js` (ค่าเป็น `area`/`hit`/`is-set`/`is-open` ซึ่งเป็น CSS เขียนเอง ไม่ใช่ Tailwind) ถ้าเจอ token ของ Tailwind ที่ประกอบขึ้นตอนรัน ให้ใส่ใน `safelist` ของ config
- [ ] **Step 6: build และตรวจภาพ**
  Run: `npm run build:css && wc -c public/css/app.css`
  Expected: ไฟล์ขนาดหลักสิบ KB
  Run: เปิด dev ใหม่ แล้ว `BASE_URL=http://localhost:8787 npm run visual`
  Expected: 30 passed
- [ ] **Step 7: Commit**
  ```bash
  git add tailwind.config.js src/styles.css public/index.html wrangler.jsonc
  git commit -m "build: replace Tailwind Play CDN with Tailwind CLI 3.4.17"
  ```

### Task 5: แยก SPA เป็น index / survey / admin และแยกคำถามตามบทบาท

**Files:**
- Modify: `public/index.html` (เป็นหน้าแรกแบบ static ไม่มี JS)
- Create: `public/survey.html`, `public/admin.html` (ช่วงเปลี่ยนผ่าน แสดงข้อมูลจำลอง), `public/js/admin/admin.js` (ช่วงเปลี่ยนผ่าน), `playwright.config.js`, `tests/e2e/pages.spec.js`
- Move: `public/js/components/ui.js` → `public/js/shared/ui.js`, `public/js/state.js` → `public/js/survey/state.js`, `public/js/app.js` → `public/js/survey/survey.js`, `public/js/data/questions.js` → `public/js/data/common.js`
- Create (ตัดออกมาจาก common.js): `public/js/data/staff.js`, `public/js/data/donor.js`
- Delete (กลุ่ม ก): `public/js/pages/survey.js` (รวมเข้า survey.js), `public/js/pages/intro.js` (กลายเป็น HTML)
- Keep ไว้ชั่วคราวจนถึง Task 7–8: `public/js/pages/thanks.js`, `public/js/pages/summary.js`, `public/js/data/mock-summary.js`

**Interfaces:**
- Produces:
  - `App.data.scales = { FREQ, AGREE, ANXIETY }` และ `App.data.mapNote` (common.js ซึ่งต้องโหลดก่อน staff.js/donor.js) และ `App.data.zoneForm`, `App.data.nav`, `App.data.thanks` ยังอยู่ใน common.js
  - `App.data.sections.staff` + `App.data.msd` → staff.js และ `App.data.sections.donor` → donor.js
  - `App.survey.ROLE_SCRIPTS = { staff: ['js/data/staff.js','js/data/body-regions.js','js/components/body-map.js'], donor: ['js/data/donor.js'] }`
  - `App.survey.boot()`: อ่าน `?role` ถ้าไม่ใช่ `staff|donor` → `location.replace('index.html')` ถ้าถูกต้อง → ใส่สคริปต์ตามลำดับ (`async = false`) → เมื่อโหลดครบ: `App.store.reset(); App.state.role = role; render({top:true})`
  - `App.state.screen ∈ {'survey','thanks'}` (thanks จะหายไปใน Task 7) การกด back ที่ step 0 และ restart → `location.href = 'index.html'` ส่วน action `role`, `summary`, `home` ถูกลบออกจาก survey.js
  - ลำดับสคริปต์ใน survey.html (defer): `js/shared/ui.js`, `js/data/common.js`, `js/data/bus-layout.js`, `js/components/bus-map.js`, `js/survey/state.js`, `js/pages/thanks.js`, `js/survey/survey.js` และย้าย `<div id="toast">` เดิมมาไว้ที่นี่ (จะลบใน Task 9)
  - admin.html ช่วงเปลี่ยนผ่าน (defer): ui, bus-layout, body-regions, bus-map, body-map, `data/mock-summary.js`, `pages/summary.js`, `admin/admin.js` โดย admin.js render `App.pages.summary.render()` ลงใน `#app` และจับ `data-action="home"` → `location.href='index.html'`
  - `playwright.config.js`: `baseURL http://localhost:8787` และ `webServer: { command: 'npx wrangler dev --port 8787', url: 'http://localhost:8787', reuseExistingServer: true }` (Task 17 จะขยายไฟล์นี้)

- [ ] **Step 1: เขียน e2e ที่ต้อง fail ก่อน** (`tests/e2e/pages.spec.js`)
  - `test('donor survey does not load staff-only scripts')`: เก็บ URL ของทุกคำขอขณะเปิด `/survey.html?role=donor` แล้ว `expect(urls.filter(u => /staff\.js|body-map\.js|body-regions\.js/.test(u))).toEqual([])`
  - `test('invalid role redirects to index')`: goto `/survey.html?role=x` → `await expect(page).toHaveURL(/\/(index\.html)?$/)`
  - `test('no console errors or 404 on any page')`: ทำกับ `/`, `/survey.html?role=staff`, `/survey.html?role=donor`, `/admin.html` เก็บ `console` ระดับ error, `pageerror` และ response ที่ status ≥ 400 แล้ว expect ว่าเป็น `[]`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run e2e -- tests/e2e/pages.spec.js`
  Expected: FAIL (ยังไม่มี survey.html)
- [ ] **Step 3: แยกไฟล์ข้อมูล**
  `git mv public/js/data/questions.js public/js/data/common.js` แล้วย้าย `sections.staff` + `msd` ไป staff.js, `sections.donor` ไป donor.js และเปลี่ยนการอ้าง `FREQ`/`AGREE`/`ANXIETY`/`MAP_NOTE` เป็น `App.data.scales.*` / `App.data.mapNote` ลบ `App.data.intro` (ข้อความย้ายไปอยู่ใน HTML) ส่วนข้อความคำถามห้ามแก้แม้แต่ตัวอักษรเดียว
- [ ] **Step 4: ย้าย ui.js กับ state.js และรวม survey.js**
  `git mv` ui.js และ state.js ไปที่ใหม่ แล้ว `git mv public/js/app.js public/js/survey/survey.js` จากนั้นรวม `App.pages.survey.render` จาก `pages/survey.js` เข้ามาเป็นฟังก์ชัน render ใน survey.js เพิ่ม `App.survey.boot()` และ `git rm public/js/pages/survey.js public/js/pages/intro.js`
- [ ] **Step 5: เขียน `public/index.html` แบบ static**
  HTML ต้องให้ผลเหมือน `intro.render()` เดิม: ใช้ class ของ `ui.card`/`ui.label`/`ui.pillGroup` และข้อความ `title` (นำหน้าด้วย `🩸 `), `lead`, `note`, `roleLabel`, `consent`
  - ปุ่มบทบาทเป็น `<a href="survey.html?role=staff|donor">` ที่ใช้ class pill (`PILL` + `PILL_OFF` จาก ui.js)
  - ปุ่มข้อมูลจำลอง (ช่วงเปลี่ยนผ่าน) เป็น `<a href="admin.html">` ที่ใช้ class ของ secondaryButton โดยใช้ `text-sm font-semibold` แทน `text-[15px] font-medium` และเพิ่ม `inline-block`
  - ไม่มี `<script>` เลย
- [ ] **Step 6: สร้าง `survey.html`, `admin.html` และ `admin.js` ตาม Interfaces**
- [ ] **Step 7: รันแล้วต้องผ่านทั้งหมด**
  Run: `npm run e2e -- tests/e2e/pages.spec.js`
  Expected: 3 passed
  Run: `BASE_URL=http://localhost:8787 npm run visual`
  Expected: 30 passed
- [ ] **Step 8: Commit**
  ```bash
  git add -u public && git add public/survey.html public/admin.html public/js playwright.config.js tests/e2e/pages.spec.js
  git commit -m "refactor: split SPA into index/survey/admin pages and per-role question files"
  ```

## Phase 2 — ขั้นที่ 2 (เอาข้อมูลจำลองออก + ส่งคำตอบจริง)

### Task 6: ตรรกะเตรียมก่อนส่ง (จุด tmp, สร้าง data, ตรวจค่า)

**Files:**
- Create: `public/js/survey/submit.js` (ส่วน pure), `tests/helpers/load-browser.js`, `tests/unit/submit-logic.test.js`, `vitest.config.js`
- Modify: `public/js/data/common.js` (เพิ่ม `App.data.submit`), `public/survey.html` (เพิ่ม submit.js ก่อน survey.js), `public/js/survey/survey.js` (กล่องเตือนจุด tmp และกล่องแจ้ง error)

**Interfaces:**
- Produces:
  - `loadBrowser(files: string[], globals?: object) -> App`: รันไฟล์ใน `node:vm` context ที่มี `window` (และ `window.window = window`) พร้อม global เริ่มต้น `console`, `crypto`, `TextEncoder` (รวมกับ `globals` ที่ส่งมา) แล้วคืน `window.App`
  - `App.submit.pendingZones(map) -> string[]`: id ที่มี `tmp`
  - `App.submit.resolveTmp(map, mode: 'save'|'drop') -> object`: คืน map ใหม่ (save = ลบ key `tmp`, drop = ลบทั้ง entry) โดยไม่แก้ input
  - `App.submit.buildData(state) -> {role, answers, msd, map}`: deep copy
  - `App.submit.check(data, sections) -> null | { step: number, key: string, message: string }`
  - `App.state.notice ∈ null | {kind:'tmp', ids} | {kind:'error', message}` แสดงเหนือปุ่ม nav ด้วย `ui.callout` และ action `tmpsave` / `tmpdrop` / `tmpback` (tmpback ไปที่ step ของส่วนที่มี `component: 'busMap'`)
  - `App.data.submit` (ข้อความชุดแรก):
    - `empty: 'ยังไม่ได้ตอบข้อใดเลย'`
    - `number: 'กรุณากรอกตัวเลข 0–9999'`
    - `severity: 'ระดับความรุนแรงต้องอยู่ระหว่าง 0–10'`
    - `tooLong: 'ข้อความยาวเกินไป'`
    - `tooLarge: 'คำตอบมีขนาดใหญ่เกินไป'`
    - `tmpTitle: 'มี {n} จุดบนผังที่ยังไม่ได้กด "บันทึกจุดนี้"'`
    - `tmpSave: 'บันทึกทั้งหมดแล้วส่ง'`
    - `tmpDrop: 'ทิ้งจุดเหล่านี้แล้วส่ง'`
    - `tmpBack: 'กลับไปแก้ ส่วน D'`
- กฎของ `check` (เช็กตามลำดับ และคืนปัญหาแรกที่เจอ):
  1. ไม่มีอะไรใน answers/msd/map → `empty` (step 0)
  2. คำตอบชนิด number ต้องตรงกับ `/^\d+(\.\d+)?$/`, มีค่า ≤ 9999 และยาวไม่เกิน 8 → ไม่ผ่านเป็น `number`
  3. msd `s` ต้องเป็น `""` หรือตัวเลข 0–10 → ไม่ผ่านเป็น `severity` (step ของส่วนที่มี `component: 'bodyMap'`)
  4. textarea ยาวไม่เกิน 2000 และหมายเหตุ `n` ของจุดผังยาวไม่เกิน 500 → ไม่ผ่านเป็น `tooLong`
  5. ขนาด `TextEncoder` ของ `JSON.stringify(data)` ไม่เกิน 13824 → ไม่ผ่านเป็น `tooLarge`

- [ ] **Step 1: เขียน test ที่ต้อง fail** (`tests/unit/submit-logic.test.js`)
  โหลดด้วย `loadBrowser(['public/js/data/common.js','public/js/data/staff.js','public/js/data/donor.js','public/js/data/bus-layout.js','public/js/survey/state.js','public/js/survey/submit.js'])` แล้วเขียน test ต่อไปนี้:
  - `pendingZones({A3:{t:[],sev:3,n:'',tmp:1}, Z5:{t:['คับแคบ'],sev:2,n:''}})` → `['A3']`
  - `resolveTmp(m,'save').A3` ไม่มี `tmp` และ `resolveTmp(m,'drop')` ไม่มี `A3` ส่วน `m` ยังมี `tmp` อยู่
  - `buildData(state)` deepEqual `JSON.parse(App.store.toJSON())` (ใช้ state ที่มีครบทุกชนิดคำตอบ)
  - `check({role:'staff',answers:{},msd:{},map:{}}, S)` → `{step:0, key:'', message:'ยังไม่ได้ตอบข้อใดเลย'}`
  - ค่า `'-1'`, `'1e9'`, `'10000'` ใน `answers.yrs` → `message === 'กรุณากรอกตัวเลข 0–9999'` และ `step === 0`
  - `'2.5'` ใน `answers.yrs` → `null`
  - `msd['คอ'].s = 12` → `{step:2, message:'ระดับความรุนแรงต้องอยู่ระหว่าง 0–10'}`
  - `msd['คอ'].s = ''` → `null`
  - textarea ยาว 2001 → `tooLong` และหมายเหตุจุดผังยาว 501 → `tooLong`
  - data ที่ใหญ่กว่า 13824 bytes (textarea ภาษาไทยหลายช่อง) → `tooLarge`
  - map ที่มีแต่จุด tmp แล้ว `resolveTmp(...,'drop')` → `check` คืน `empty`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:unit -- tests/unit/submit-logic.test.js`
  Expected: FAIL (`App.submit` undefined)
- [ ] **Step 3: เขียน `submit.js` (ส่วน pure), เพิ่มข้อความ และเพิ่ม UI กล่องแจ้งใน survey.js ตาม Interfaces**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm run test:unit -- tests/unit/submit-logic.test.js`
  Expected: PASS
  Run: `BASE_URL=http://localhost:8787 npm run visual`
  Expected: 30 passed (ยังไม่มีกล่องแจ้งปรากฏในภาพ)
- [ ] **Step 5: Commit**
  `git commit -m "feat(survey): pre-submit checks and unsaved map point warning"` (add ไฟล์ตามรายการ Files)

### Task 7: ส่งคำตอบ, ทางสำรอง, ร่างสำรอง, thanks.html

**Files:**
- Create: `public/js/config.js`, `public/thanks.html`, `tests/e2e/submit.spec.js`, `tests/e2e/fixtures/turnstile-stub.js`
- Modify: `public/js/survey/submit.js`, `public/js/survey/state.js`, `public/js/survey/survey.js`, `public/js/data/common.js`, `public/survey.html`
- Delete (กลุ่ม ข): `public/js/pages/thanks.js` และลบ `copyAnswers` ออกจาก survey.js (ย้ายไปอยู่ใน submit.js), ลบ screen `thanks`, ลบ `App.data.thanks` ทั้ง object (ย้าย `copy`/`copied` ไปไว้ที่ `App.data.submit`)

**Interfaces:**
- Consumes: `App.submit.*` จาก Task 6
- Produces:
  - `App.config = { turnstileSiteKey, sheetsUrl }`: บน `localhost`/`127.0.0.1` ใช้ `'1x00000000000000000000AA'` และ `'http://localhost:8790/exec'` ที่อื่นใช้ `'REPLACE_WITH_SITE_KEY'` และ `'REPLACE_WITH_APPS_SCRIPT_URL'` (ใส่ค่าจริงตอน deploy ตาม Task 18)
  - `App.submit.classify({status, json}) -> 'ok'|'turnstile'|'rate'|'invalid'|'down'`:

    | เงื่อนไข | ผล |
    |---|---|
    | 201/202 และ `json.ok` | `ok` |
    | 403 และ `json.error === 'turnstile'` | `turnstile` |
    | 429 และ `json.error === 'rate'` | `rate` |
    | 400/413 และ `json` ไม่ใช่ null | `invalid` |
    | กรณีอื่นทั้งหมด (รวม `json === null`) | `down` |
  - `App.draft.save(d)`, `App.draft.load() -> d|null`, `App.draft.clear()`: ใช้ key `'eve-draft'` ห่อ try/catch ทุกครั้ง และรูปแบบร่างคือ `{v:1, cid, role, step, answers, msd, map}`
  - `App.state.cid` สร้างใน `App.store.reset()` ด้วย `crypto.randomUUID()` และมี `App.store.restore(draft)` สำหรับกู้ร่าง
  - `App.submit.token() -> Promise<string>`: render ครั้งเดียวลง `#ts` ด้วย `{sitekey, execution:'execute', action:'submit', appearance:'interaction-only'}` แล้ว `turnstile.execute`
    - ถ้า `window.turnstile` ไม่มี, `error-callback` ถูกเรียก หรือรอเกิน 30 วินาที → reject
    - ถ้าเรียกซ้ำ → `turnstile.reset` แล้ว execute ใหม่
  - `App.submit.run() -> Promise<void>` (action `submit`):
    1. `state.sending = true` → ปุ่มขึ้นข้อความ `sending` และถูก disable
    2. ทำการตรวจของ Task 6
    3. `draft.save`
    4. ขอ token
    5. `fetch('/api/submit', {method:'POST', headers:{'content-type':'application/json'}, body})` แล้วส่งผลให้ `classify`
    6. แยกตามผล:
       - `ok` → `draft.clear()` แล้ว `location.replace('thanks.html')`
       - `turnstile` / `rate` / `invalid` → แสดง notice ของกรณีนั้น (invalid มีปุ่มคัดลอกด้วย)
       - `down` (รวม network error) → ขอ token ใหม่ แล้ว POST แบบ `text/plain` ไปที่ `App.config.sheetsUrl` ด้วย body `{auth:'turnstile', token, cid, data}` ถ้าได้ `{ok:true}` ให้ทำแบบเดียวกับ `ok` ถ้าไม่ได้ ให้แสดง notice `unavailable` พร้อมปุ่ม `retry` และ `copy`
    7. ถ้า token reject → notice `noTurnstile` + ปุ่ม `copy`
  - `App.state.notice` เพิ่มชนิด `{kind:'send', code}` และ `{kind:'draft'}` ตอน boot ถ้า `draft.role === role` จะแสดงแถบร่างพร้อม action `draftresume` (restore แล้วไปที่ `draft.step`) และ `draftdiscard`
  - `App.data.submit` (เพิ่มเติม):
    - `sending: 'กำลังส่ง…'`
    - `turnstile: 'ยืนยันตัวตนไม่สำเร็จ กรุณากดส่งอีกครั้ง'`
    - `rate: 'ส่งถี่เกินไป รอสักครู่แล้วลองใหม่'`
    - `invalid: 'ข้อมูลไม่ถูกต้อง กรุณาคัดลอกคำตอบแล้วส่งให้ผู้จัดทำ'`
    - `unavailable: 'ระบบรับคำตอบขัดข้องชั่วคราว คำตอบยังอยู่ในเครื่องนี้ ลองใหม่ภายหลังได้ (โควตารีเซ็ต 07:00 น.)'`
    - `noTurnstile: 'โหลดระบบยืนยันตัวตนไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วกดส่งอีกครั้ง'`
    - `retry: 'ส่งอีกครั้ง'`, `copy: 'คัดลอกคำตอบ'`, `copied: 'คัดลอกแล้ว'`
    - `draft: 'มีคำตอบที่ยังส่งไม่สำเร็จจากครั้งก่อน'`, `draftResume: 'ส่งต่อ'`, `draftDiscard: 'ทิ้ง'`
  - survey.html เพิ่ม `<script defer src="js/config.js">`, `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer>`, `<div id="ts"></div>` และ honeypot `<div class="absolute -left-[9999px]" aria-hidden="true"><input id="hp" name="website" tabindex="-1" autocomplete="off"></div>` (ค่าของ `#hp` ส่งไปในฟิลด์ `hp`)
  - thanks.html (static ไม่มี JS): `ui.pageTitle('ขอบคุณค่ะ 🙏')` + card ข้อความ `'ส่งคำตอบเรียบร้อยแล้ว ขอบคุณที่สละเวลาตอบแบบสอบถาม'` + `<a href="index.html">เริ่มใหม่</a>` ที่ใช้ class ของ secondaryButton และ `inline-block`

- [ ] **Step 1: เขียน unit test ที่ต้อง fail** (เพิ่มใน `tests/unit/submit-logic.test.js`)
  - ตาราง `classify` ครบทุกแถวของ Interfaces รวมกรณี `{status:429, json:null}` → `'down'` และ `{status:502, json:null}` → `'down'`
  - `draft.*` กับ `localStorage` stub ที่ throw ทุก method → `load()` เป็น `null` และไม่มีการ throw ออกมา
- [ ] **Step 2: เขียน e2e ที่ต้อง fail** (`tests/e2e/submit.spec.js`)
  - fixture `turnstile-stub.js` กำหนด `window.turnstile = {render(el,o){…return 'w1'}, execute(){setTimeout(()=>o.callback('XXXX.DUMMY.TOKEN.XXXX'))}, reset(){}}` และ serve ผ่าน `page.route('**/turnstile/v0/api.js*')`
  - ทุก route ที่ fulfill ไป `http://localhost:8790/exec` ต้องใส่ header `access-control-allow-origin: *`
  - test ที่ต้องมี:
    - `staff run posts envelope with legacy data`: เลือก pos=พยาบาล, yrs=5, scale ใน B (ถ้ามี), multi, rank 3 อันดับ, body คอ, จุด A3 (t คับแคบ, p พนักพิง, sev 4) กดบันทึก, textarea ภาษาไทย แล้ว mock `/api/submit` 201 `{ok:true}` → expect `v===1`, `cid` ตรงกับ uuid v4, `token === 'XXXX.DUMMY.TOKEN.XXXX'`, `hp === ''`, `data` deepEqual object literal ที่เขียนไว้ใน test → URL เป็น `/thanks.html` และ `localStorage['eve-draft']` เป็น null
    - `donor run posts envelope` (เลือกคำตอบน้อยกว่า)
    - `unsaved point: save`, `unsaved point: drop`, `unsaved point: back` (data ที่ได้ไม่มี `tmp` และปุ่ม back ไปที่ส่วน D)
    - `double click sends exactly one request`: mock ตอบช้า 1 วินาที แล้วกดซ้ำ 2 ครั้ง → นับคำขอได้ 1
    - `worker down falls back to Apps Script`: `/api/submit` → 503 แบบ `text/html` แล้ว exec ได้ body ที่มี `auth:'turnstile'` → ตอบ `{ok:true}` → ไป thanks
    - `both down shows unavailable with retry and copy and keeps draft`
    - `403 turnstile message` และ `429 rate message`
    - `turnstile script blocked shows message, no page error`: `page.route('**/turnstile/**', r => r.abort())` → notice `noTurnstile`, ปุ่มคัดลอกแสดงอยู่ และไม่มี `pageerror`
    - `draft banner resumes answers`: เขียน `eve-draft` ล่วงหน้าแล้วเปิดหน้า → กด `ส่งต่อ` → คำตอบกลับมาครบ
- [ ] **Step 3: รันแล้วต้อง fail**
  Run: `npm run test:unit && npm run e2e -- tests/e2e/submit.spec.js`
  Expected: FAIL
- [ ] **Step 4: Implement ตาม Interfaces และลบ `pages/thanks.js`**
- [ ] **Step 5: รันแล้วต้องผ่าน**
  Run: `npm run test:unit && npm run e2e -- tests/e2e/pages.spec.js tests/e2e/submit.spec.js`
  Expected: PASS (เพิ่ม `/thanks.html` เข้าไปในรายการหน้าของ `pages.spec.js`)
  Run: `BASE_URL=http://localhost:8787 npm run visual -- --grep-invert thanks-pilot`
  Expected: PASS แล้วลบ test `thanks-pilot` ออกจาก spec
- [ ] **Step 6: Commit**
  `git commit -m "feat(survey): send answers to /api/submit with Apps Script fallback and draft backup"`

### Task 8: หน้าแอดมินจาก API + เอาข้อมูลจำลองออก

**Files:**
- Modify (เขียนใหม่): `public/admin.html`, `public/js/admin/admin.js`
- Modify: `public/index.html` (ลบปุ่มข้อมูลจำลอง)
- Delete (กลุ่ม ข): `public/js/data/mock-summary.js`, `public/js/pages/summary.js`
- Create: `tests/unit/admin-logic.test.js`, `tests/e2e/admin.spec.js`

**Interfaces:**
- Consumes (Task 14–15 จะสร้าง contract นี้):
  - `POST /api/admin/login {password}` → 204 / 401 `{error:'auth'}` / 429 `{error:'rate'}`
  - `POST /api/admin/logout` → 204
  - `GET /api/admin/summary` → รูปแบบตาม spec 10.2 หรือ 401 `{error:'auth'}`
  - `GET /api/admin/responses?role=&after=&limit=200` → `{rows:[{id,cid,role,created,src,data}], next: number|null}`
- Produces:
  - `App.data.admin` (กำหนดไว้ที่หัว admin.js):
    - `title: 'สรุปผล'`
    - `heatTitle`, `bodyTitle`, `rankTitle` คัดลอกข้อความมาจาก mock-summary.js แบบตรงตัว
    - `staffTab: 'เจ้าหน้าที่'`, `donorTab: 'ผู้บริจาค'`
    - `empty: 'ยังไม่มีข้อมูล'`, `more: 'มีข้อมูลใหม่อีก กดอัปเดต'`
    - `refresh: 'อัปเดต'`, `csv: 'ดาวน์โหลด CSV'`, `logout: 'ออกจากระบบ'`, `login: 'เข้าสู่ระบบ'`, `password: 'รหัสผ่าน'`
    - `wrong: 'รหัสผ่านไม่ถูกต้อง'`, `rate: 'ลองหลายครั้งเกินไป รอ 1 นาทีแล้วลองใหม่'`
    - `quotaTitle: 'โควตาวันนี้'`, `quotaNote: 'นับเฉพาะคำขอของระบบนี้ ดูยอดจริงในแดชบอร์ด Cloudflare'`
    - `updated: 'อัปเดตล่าสุด'`, `count: 'คำตอบ'`
  - `App.admin.bars(rows) -> html`: ย้ายมาจาก summary.js และถ้า `rows.length === 0` จะคืน `<p>` ที่มีข้อความ `empty`
  - `App.admin.view(summary, tab: 'staff'|'donor') -> html`:
    - แท็บ staff มี 3 การ์ด (`busMap.render({mode:'summary', heat})`, `bodyMap.render({mode:'summary', counts: body})`, `bars(rank)`)
    - แท็บ donor มีการ์ด heat การ์ดเดียว
    - ถ้า `n === 0` ทุกการ์ดแสดง `empty`
    - มีการ์ดโควตา (rw/rr เทียบกับ limits เป็น %) และถ้า `more` เป็น true แสดงข้อความ `more`
  - `App.admin.toCSV(rows) -> string`:
    - ขึ้นต้นด้วย `'\uFEFF'`
    - คอลัมน์ `id,created,role,src,cid` ตามด้วย `answers.<key>…` (union ของ key ตามลำดับที่เจอครั้งแรก), `msd.<ส่วน>.y|w|s…`, `map.<zone>.t|p|sev|n…` และ `json`
    - array คั่นด้วย `' | '`
    - `created` แสดงเป็นเวลาไทยรูปแบบ `YYYY-MM-DD HH:mm:ss` (`toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'})`)
    - quote ตาม RFC 4180 และขึ้นบรรทัดใหม่ด้วย `\r\n`
  - การทำงานบน DOM (admin.js ห้ามแตะ DOM ตอนโหลดไฟล์ ให้เริ่มผ่าน `App.admin.boot()` ซึ่งเรียกใน admin.html เท่านั้น เพื่อให้ unit test โหลดไฟล์นี้ใน vm ได้):
    - เปิดหน้า → `GET summary` ถ้าได้ 401 แสดงฟอร์ม login ถ้าได้ 200 แสดง view
    - action `tab` / `refresh` / `csv` / `logout`
    - ถ้า action ใดได้ 401 → กลับไปแสดงฟอร์ม login
    - CSV วนเรียก `responses` จนกว่า `next === null` แล้วดาวน์โหลดผ่าน Blob ชื่อ `survey-YYYYMMDD.csv`
  - admin.html: มี `<meta name="robots" content="noindex,nofollow">` และโหลดสคริปต์ (defer): ui, bus-layout, body-regions, bus-map, body-map, admin

- [ ] **Step 1: เขียน unit test ที่ต้อง fail** (`tests/unit/admin-logic.test.js`)
  โหลดด้วย `loadBrowser(['public/js/shared/ui.js','public/js/data/bus-layout.js','public/js/data/body-regions.js','public/js/components/bus-map.js','public/js/components/body-map.js','public/js/admin/admin.js'])`
  - `bars([])` มี `'ยังไม่มีข้อมูล'` และไม่มี `NaN` หรือ `Infinity`
  - `toCSV([{id:1,cid:'c',role:'staff',created:0,src:0,data:{role:'staff',answers:{other:'ก, "ข"\nค 🩸', rank:['ซ่อนสาย','ทางเดินกว้างขึ้น']},msd:{'คอ':{y:'ใช่',w:'ไม่',s:3}},map:{A3:{t:['คับแคบ'],p:[],sev:4,n:''}}}}])`:
    - ขึ้นต้นด้วย `'\uFEFF'`
    - แถวข้อมูลมี `1970-01-01 07:00:00`
    - มี `"ก, ""ข""\nค 🩸"`
    - มี `ซ่อนสาย | ทางเดินกว้างขึ้น`
    - header มี `msd.คอ.s` และ `map.A3.sev`
  - `view({staff:{n:0,heat:{},body:{},rank:[]},donor:{n:0,heat:{}},usage:{…},more:false}, 'staff')` นับ `'ยังไม่มีข้อมูล'` ได้ 3 ครั้ง
  - `view(..., 'donor')` ไม่มี `rankTitle`
- [ ] **Step 2: เขียน e2e ที่ต้อง fail** (`tests/e2e/admin.spec.js` mock API ด้วย `page.route`)
  - `shows login when unauthenticated`
  - `wrong password shows message`
  - `login then shows summary`: เมื่อ heat มี `A3 {count:9, avg:4.2}` ต้องเห็นเลข 9 บนผัง
  - `401 on refresh returns to login`
  - `csv download pages through responses`: mock 2 หน้า → ไฟล์ที่ดาวน์โหลดมี header + 3 แถว
  - `empty state`
- [ ] **Step 3: รันแล้วต้อง fail**
  Run: `npm run test:unit && npm run e2e -- tests/e2e/admin.spec.js`
  Expected: FAIL
- [ ] **Step 4: Implement, ลบไฟล์กลุ่ม ข และลบปุ่มข้อมูลจำลองออกจาก index.html**
- [ ] **Step 5: อัปเดต baseline ภาพ `intro`**
  Run: `BASE_URL=http://localhost:8787 npm run visual -- --grep intro`
  Expected: diff อยู่เฉพาะบริเวณปุ่มที่ลบ (ตรวจภาพ diff ด้วยตา) จากนั้นรัน `--grep intro --update-snapshots` และลบ test `summary-mock`
- [ ] **Step 6: รันทั้งหมด**
  Run: `npm run test:unit && npm run e2e && BASE_URL=http://localhost:8787 npm run visual`
  Expected: PASS ทั้งหมด
- [ ] **Step 7: Commit**
  `git commit -m "feat(admin): real summary page backed by API; remove mock summary"`

## Phase 3 — ขั้นที่ 3 (ล้างของที่ไม่ใช้)

### Task 9: ทำรายการสิ่งที่จะลบ → รอผู้ใช้ยืนยัน → ลบ → อัปเดตเอกสารเดิม

**Files:**
- Create: `docs/reports/frontend-prep-report.md` (ฉบับร่างที่มีตารางรายการลบ)
- Modify: `2026-10-30-blood-mobile-survey-frontend-design.md`, `public/survey.html`, `public/js/survey/survey.js`, `src/styles.css` (ตามที่อนุมัติ)
- Delete: ตามตารางที่ได้รับอนุมัติเท่านั้น

**Interfaces:** ไม่มี

- [ ] **Step 1: ค้นหลักฐานทีละรายการ**
  รายการที่รู้อยู่แล้ว:
  - `.claude_write_test`
  - `Claude outputs/svg1.png`
  - `img/bus-map.jpg`
  - `toast()` และ `<div id="toast">`
  - key ใน `App.data.*` ที่ไม่มีที่ใช้
  - selector ใน `src/styles.css` ที่ไม่มีหน้าไหนใช้
  - `.replace(...)` ที่เหลืออยู่

  คำสั่งที่ใช้:
  - ไฟล์: `git grep -n "<ชื่อไฟล์>" -- . ':!docs/superpowers'`
  - ฟังก์ชันและ key: `git grep -nw "<ชื่อ>" public`
  - CSS: ไล่ทุก selector ใน `src/styles.css` แล้ว `git grep -n "<class>" public`
  - key ข้อมูล: ไล่ key ของ `App.data.submit`, `App.data.zoneForm`, `App.data.nav` และ `App.data.admin` แล้ว grep หาที่ใช้
  - `.replace(`: `git grep -n "\.replace(" public/js`
- [ ] **Step 2: เขียนตารางในรายงาน**
  คอลัมน์: `รายการ | ชนิด (ไฟล์/โค้ด/CSS/key) | คำสั่งและผล | เหตุผล` และหมายเหตุว่า class ของ Tailwind ที่ไม่ใช้จะไม่ถูกสร้างอยู่แล้ว โดยแนบขนาด `app.css` ไว้เป็นหลักฐาน
- [ ] **Step 3: หยุดและส่งตารางให้ผู้ใช้ยืนยัน**
  ห้ามทำ Step 4 จนกว่าผู้ใช้จะตอบอนุมัติอย่างชัดเจน และตัดรายการที่ผู้ใช้ไม่อนุมัติออก
- [ ] **Step 4: ลบตามที่อนุมัติ**
  ไฟล์ที่อยู่ใน git ใช้ `git rm` ส่วนไฟล์ที่ไม่อยู่ใน git ใช้ `rm` แล้ว `rmdir` โฟลเดอร์ที่ว่าง ส่วนโค้ด/CSS/key ให้แก้ไฟล์ทีละจุด
- [ ] **Step 5: อัปเดต `2026-10-30-blood-mobile-survey-frontend-design.md`**
  แก้หัวข้อ Goal / Decisions / Screens / Files ให้ตรงกับโครงสร้างใหม่ (หลายหน้า, Tailwind CLI, เปิดผู้บริจาคแล้ว, ไม่มีข้อมูลจำลอง, ลิงก์ไป spec ใหม่) และคงหัวข้อ Known uncertainties ไว้
- [ ] **Step 6: ตรวจหลังลบ**
  Run: `npm run build:css && npm run test:unit && npm run e2e && BASE_URL=http://localhost:8787 npm run visual`
  Expected: PASS ทั้งหมด
- [ ] **Step 7: Commit 2 ครั้ง**
  `git commit -m "chore: remove unused files and dead code (approved list)"` แล้ว `git commit -m "docs: update frontend design doc to new structure"`

## Phase 4 — Backend

### Task 10: schema และการ validate ฝั่ง server (pure)

**Files:**
- Create: `src/schema.js`, `src/validate.js`, `tests/fixtures/staff-full.json`, `tests/fixtures/donor-full.json`, `tests/unit/validate.test.js`, `tests/unit/schema-sync.test.js`
- Modify: `vitest.config.js` (include `tests/unit/**`)

**Interfaces:**
- Produces:
  - `SCHEMA = { staff: { answers: {[key]: {type, options?, max?, only?}}, msd: true }, donor: { answers: {…}, msd: false } }`
    - `type ∈ 'pills'|'scale'|'multi'|'rank'|'number'|'textarea'`
    - ถ้าเป็น `scale` ให้ `options` เป็นตัวเลข 1–5
  - `BODY_REGIONS: string[]` (9 ส่วน), `ZONES: {[id]: 'zone'|'chair'}` (`Z2`–`Z7`, `A1`–`A4`, `B1`–`B4`), `ZONE_TYPES: string[]`, `ZONE_PARTS: string[]`, `MSD_YN = ['ใช่','ไม่']`
  - `LIMITS = { bodyBytes: 16384, dataBytes: 13824, textarea: 2000, note: 500, numberMax: 9999 }`
  - `validateEnvelope(body: unknown) -> {ok:true, env:{v,cid,token,hp,data}} | {ok:false, field: string}`
    - เงื่อนไข: `v === 1`, `cid` ตรงกับ `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`, `token` เป็น string ยาว 1–4096, `hp` เป็น string และ `data` ผ่าน `validateData`
  - `validateData(data: unknown) -> {ok:true} | {ok:false, field: string}` โดย `field` เป็น path แบบจุด เช่น `'answers.yrs'`, `'map.A3.sev'`
- กฎของ `validateData`:
  - key ระดับบนสุดต้องเป็น `role/answers/msd/map` ครบและไม่มี key อื่น
  - ขนาดหลัง stringify ต้องไม่เกิน `dataBytes`
  - answers แยกตามชนิด:

    | ชนิด | กฎ |
    |---|---|
    | pills | ค่าต้องอยู่ใน options |
    | scale | integer ที่อยู่ใน options |
    | multi | array ที่ไม่ซ้ำ, ทุกค่าอยู่ใน options, ยาวไม่เกิน `max ?? options.length` และถ้ามี `only` อยู่ในรายการต้องยาว 1 |
    | rank | array ที่ไม่ซ้ำ, ทุกค่าอยู่ใน options, ยาวไม่เกิน `max` |
    | number | string ที่ตรงกับ `/^\d+(\.\d+)?$/`, ยาวไม่เกิน 8 และมีค่าไม่เกิน 9999 |
    | textarea | string ยาว 1–2000 |

  - msd: ถ้า role เป็น donor ต้องเป็น `{}` ถ้าเป็น staff ทุก key ต้องอยู่ใน `BODY_REGIONS` และค่าเป็น `{y,w,s}` ที่ `y,w ∈ MSD_YN` และ `s` เป็น `''` หรือตัวเลข 0–10
  - map: key ต้องอยู่ใน `ZONES` และ entry ต้องมี key แค่ `t, sev, n` (+ `p` ซึ่งต้องมีสำหรับ chair และห้ามมีสำหรับ zone) โดย `t`/`p` เป็น array ที่ไม่ซ้ำและอยู่ใน `ZONE_TYPES`/`ZONE_PARTS`, `sev` integer 1–5, `n` string ยาวไม่เกิน 500

- [ ] **Step 1: สร้าง fixture**
  `staff-full.json` และ `donor-full.json` เป็น `data` ที่ตอบครบทุกช่อง:
  - textarea ใช้ภาษาไทยยาวประมาณ 300 ตัวอักษร
  - staff มีทุกส่วนร่างกาย
  - ทุก zone มีหมายเหตุ

  ทั้งสองไฟล์ใช้วัดขนาด payload ใน Task 17 ด้วย
- [ ] **Step 2: เขียน test ที่ต้อง fail**
  - `validate.test.js`:
    - fixture ทั้งสองไฟล์ → `{ok:true}`
    - ตาราง mutation → `field` ที่คาดไว้:
      - `answers.yrs='-1'` → `'answers.yrs'`
      - `'1e9'` → `'answers.yrs'`
      - `answers.unknown` → `'answers.unknown'`
      - donor ที่มี `answers.rank` → `'answers.rank'`
      - `msd['คอ'].s=12` → `'msd.คอ.s'`
      - donor ที่มี msd ไม่ว่าง → `'msd'`
      - `map.A3.tmp=1` → `'map.A3.tmp'`
      - `map.Z5.p=[]` → `'map.Z5.p'`
      - `map.A3` ที่ไม่มี `p` → `'map.A3.p'`
      - `map.A3.sev=0` → `'map.A3.sev'`
      - `map.Z9` → `'map.Z9'`
      - multi `uneasy=['แสง','ไม่มี']` → `'answers.uneasy'`
      - `again` ยาว 4 → `'answers.again'`
      - `role:'x'` → `'role'`
      - key ระดับบนสุดเกิน → `'data'`
    - `validateEnvelope` กับ `v:2` / cid ผิดรูปแบบ / ไม่มี token → `field` ที่ตรงกัน
  - `schema-sync.test.js`:
    - โหลดไฟล์ข้อมูลด้วย `loadBrowser` → สร้างโครงจาก `App.data.sections` (`type`, `options` (ถ้าเป็น scale ให้เอาแค่ `.value`), `max`, `only`) → `toEqual(SCHEMA[role].answers)`
    - id ของ `App.data.body.regions` → `toEqual(BODY_REGIONS)`
    - id กับ kind ของ `App.data.bus.areas` → `toEqual(ZONES)`
    - `zoneForm.types.options` / `parts.options` → `toEqual(ZONE_TYPES/ZONE_PARTS)`
- [ ] **Step 3: รันแล้วต้อง fail**
  Run: `npm run test:unit -- tests/unit/validate.test.js tests/unit/schema-sync.test.js`
  Expected: FAIL
- [ ] **Step 4: Implement `src/schema.js` และ `src/validate.js`**
- [ ] **Step 5: รันแล้วต้องผ่าน**
  Run: คำสั่งเดียวกับ Step 3
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(api): request schema and validation shared with question files"`

### Task 11: migration ของ D1, store/quota และชุดทดสอบ Worker

**Files:**
- Create: `migrations/0001_init.sql` (คัดลอก SQL จาก spec หัวข้อ 8 แบบตรงตัว), `src/meter.js`, `src/store.js`, `src/quota.js`, `src/index.js`, `vitest.workers.config.js`, `tests/worker/setup.js`, `tests/worker/store.test.js`, `.dev.vars.example`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Produces:
  - `createMeter() -> { rw, rr, run(stmt) -> Promise<D1Result>, batch(db, stmts) -> Promise<D1Result[]> }` บวก `meta.rows_written/rows_read` สะสมไว้
  - `dayKey(date = new Date()) -> number`: YYYYMMDD ตามเวลา UTC
  - `insertResponse(m, db, {cid, role, data, created, src}) -> Promise<boolean>`: `INSERT … ON CONFLICT(cid) DO NOTHING` และคืน `meta.changes === 1`
  - `bumpUsage(db, m, n, day) -> Promise<{day, rw, rr}>`: UPSERT ด้วย `rw = m.rw + 1` แล้วอ่านค่าจาก `RETURNING rw, rr`
  - `usageToday(m, db, day) -> Promise<{day, rw, rr, n}>`: คืนค่า 0 ทุกช่องถ้ายังไม่มีแถว
  - `rememberUsage(u)`, `knownUsage(day) -> u|null` (เก็บในหน่วยความจำของ module) และ `overQuota(u, env) -> boolean` (`u.rw >= ratio*D1_WRITE_LIMIT || u.rr >= ratio*D1_READ_LIMIT`)
  - `src/index.js`: export default `Hono` app
    - `app.onError` → 500 `{error:'server'}`
    - `notFound` ของ `/api/*` → 404 `{error:'not_found'}`
  - `wrangler.jsonc` ตาม spec 7.1 พร้อม:
    - `"main": "src/index.js"`, `"run_worker_first": ["/api/*"]`
    - `database_id` เป็น `"00000000-0000-0000-0000-000000000000"` (แทนด้วยค่าจริงตอน deploy)
    - vars เพิ่ม `"ALLOWED_HOSTS": ""` และ `"TURNSTILE_STRICT": "1"`
  - `.dev.vars.example`:
    ```
    TURNSTILE_SECRET=1x0000000000000000000000000000000AA
    ADMIN_PASSWORD=dev-password-change-me-123
    SESSION_KEY=dev-session-key
    SHEETS_TOKEN=dev-sheets-token
    IMPORT_TOKEN=dev-import-token
    SHEETS_URL=http://localhost:8790/exec
    TURNSTILE_STRICT=0
    ```
  - `vitest.workers.config.js`:
    - ใช้ config helper ของ `@cloudflare/vitest-pool-workers` 0.23.0 ตาม README ของ version นั้น
    - ชี้ไปที่ `wrangler.jsonc`
    - กำหนด bindings ทดสอบชุดเดียวกับ `.dev.vars.example`
    - include `tests/worker/**`
    - `tests/worker/setup.js` เรียก `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` (อ่าน migrations ใน config ด้วย `readD1Migrations('./migrations')`)

- [ ] **Step 1: เขียน test ที่ต้อง fail** (`tests/worker/store.test.js`)
  - INSERT แรกคืน `true` และ `m.rw === 2` (ยืนยันว่าได้ 1 แถว + 1 แถวของ index cid) ถ้า D1 ในเครื่องรายงานค่าอื่น ให้บันทึกค่าจริงไว้ใน report และแก้ตัวเลขใน Task 18
  - INSERT ซ้ำด้วย cid เดิม → `false` และแถวยังมีแค่ 1 แถว
  - เรียก `bumpUsage` 2 ครั้ง → `rw` และ `n` สะสมขึ้น
  - `dayKey(new Date('2026-10-30T23:59:59Z')) === 20261030` และ `dayKey(new Date('2026-10-31T00:00:00Z')) === 20261031`
  - `overQuota({rw:79999,rr:0}, env) === false` และ `overQuota({rw:80000,rr:0}, env) === true` ส่วน `rr` 4000000 → `true`
  - `GET /api/nope` → 404 `{error:'not_found'}`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:worker`
  Expected: FAIL
- [ ] **Step 3: Implement ตาม Interfaces**
- [ ] **Step 4: รันแล้วต้องผ่าน และ migration ใช้ในเครื่องได้**
  Run: `npm run test:worker`
  Expected: PASS
  Run: `npx wrangler d1 migrations apply eve-survey --local`
  Expected: applied `0001_init.sql`
- [ ] **Step 5: Commit**
  `git commit -m "feat(api): D1 schema, usage metering and worker test harness"`

### Task 12: Turnstile, rate limit, ส่งต่อ Sheets และ `POST /api/submit`

**Files:**
- Create: `src/turnstile.js`, `src/ratelimit.js`, `src/fallback.js`, `src/routes/submit.js`, `tests/worker/submit.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `validateEnvelope` (T10) และ `createMeter`, `insertResponse`, `bumpUsage`, `dayKey`, `knownUsage`, `rememberUsage`, `overQuota` (T11)
- Produces:
  - `verifyTurnstile(token, ip, env) -> Promise<{ok, hostname, action}>`: POST form ไปที่ `https://challenges.cloudflare.com/turnstile/v0/siteverify` (`secret`, `response`, `remoteip`) ถ้า fetch error ให้คืน `{ok:false}`
  - `turnstileAccepted(r, env) -> boolean`: ถ้า `TURNSTILE_STRICT === '1'` ต้อง `r.ok && r.action === 'submit' && ALLOWED_HOSTS.split(',').includes(r.hostname)` ถ้าไม่ strict ใช้แค่ `r.ok`
  - `allow(env, key) -> Promise<boolean>`:
    - ถ้า `env.RATE_LIMIT_OFF === '1'` → `true`
    - ถ้ามี `env.RL` → `(await env.RL.limit({key})).success`
    - ถ้าไม่มีทั้งสองอย่าง → ใช้ `Map` นับ 5 ครั้งต่อ 60 วินาที
  - `forwardToSheets(env, {cid, data}) -> Promise<boolean>`:
    - POST `env.SHEETS_URL` ด้วย `content-type: text/plain;charset=utf-8`
    - body `{auth:'worker', key: env.SHEETS_TOKEN, via:'worker', cid, data}`
    - `signal: AbortSignal.timeout(8000)`
    - คืน `json.ok === true` และคืน `false` ถ้าเกิด error ใด ๆ
  - `handleSubmit(c) -> Response` ทำตามลำดับใน spec หัวข้อ 7.4 ข้อ 1–8 (IP มาจาก header `cf-connecting-ip`):

    | สถานะ | body |
    |---|---|
    | 201 | `{ok:true}` |
    | 202 | `{ok:true,queued:true}` |
    | 400 | `{error:'invalid',field}` |
    | 403 | `{error:'turnstile'}` |
    | 413 | `{error:'too_large'}` |
    | 429 | `{error:'rate'}` |
    | 503 | `{error:'unavailable'}` |

    - ตรวจ 413 จาก header `content-length` และจากความยาว bytes ของ body ที่อ่านได้
    - เก็บ `data` เป็น `JSON.stringify(env.data)` และ `created = Math.floor(Date.now()/1000)`
    - ข้อ 6 ใช้ `knownUsage(dayKey())` และหลัง `bumpUsage` ต้องเรียก `rememberUsage(ผลลัพธ์)` ทุกครั้ง

- [ ] **Step 1: เขียน test ที่ต้อง fail** (`tests/worker/submit.test.js`)
  ใช้ `vi.spyOn(globalThis,'fetch')` ตอบ siteverify และ Sheets ตามแต่ละกรณี:
  - fixture staff → 201, ได้ 1 แถว, `JSON.parse(row.data)` deepEqual fixture และ usage วันนี้เป็น `n=1, rw=3`
  - cid ซ้ำ → 201 และยังมี 1 แถว
  - `hp:'x'` → 201, 0 แถว และไม่มีการเรียก siteverify
  - data ผิด → 400 `{error:'invalid', field:'answers.yrs'}`
  - body 16385 bytes → 413 และไม่แตะ D1 (usage ไม่มีแถว)
  - siteverify `success:false` → 403
  - strict mode กับ `hostname:'evil.example'` → 403
  - ไม่ตั้ง `RATE_LIMIT_OFF` แล้วยิงจาก IP เดียว 6 ครั้ง → ครั้งที่ 6 ได้ 429 `{error:'rate'}`
  - seed usage `rw=80000` + `rememberUsage` → 202, มีการเรียก Sheets ด้วย body `auth:'worker'` และ `key:'dev-sheets-token'` และไม่มีแถวใหม่
  - `DROP TABLE responses` ก่อนส่ง → 202 ผ่าน Sheets
  - `DROP TABLE responses` + Sheets ตอบ 500 → 503 `{error:'unavailable'}`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:worker -- tests/worker/submit.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement และผูก route ใน index.js**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm run test:worker`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(api): POST /api/submit with Turnstile, rate limit and Sheets fallback"`

### Task 13: `POST /api/import` (Apps Script ซิงก์กลับ)

**Files:**
- Create: `src/crypto.js`, `src/routes/import.js`, `tests/worker/import.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces:
  - `safeEqual(a: string, b: string) -> Promise<boolean>`: ทำ SHA-256 ทั้งสองค่าแล้วเทียบ XOR ทุก byte (Task 14 ใช้ต่อ)
  - `handleImport(c)`:
    - ไม่มี header `Authorization: Bearer <IMPORT_TOKEN>` หรือไม่ตรง → 401 `{error:'auth'}`
    - body `{items:[{cid, data, received}]}` ต้องมี 1–40 รายการ ถ้าไม่ใช่ → 400 `{error:'invalid', field:'items'}`
    - `knownUsage` ถึงเกณฑ์ → 503 `{error:'quota'}`
    - แต่ละรายการตรวจ uuid ของ cid + `validateData` + `received` ต้องเป็น integer ที่ไม่เกิน `now + 300` ถ้าไม่ผ่านจะอยู่ใน `rejected: [{cid, field}]`
    - รายการที่ผ่านใช้ `db.batch` INSERT ด้วย `src=1` และ `created=received` cid ที่มีอยู่แล้วก็นับเป็น `accepted` ด้วย
    - `bumpUsage` ด้วย n = จำนวนที่ insert จริง แล้ว `rememberUsage(ผลลัพธ์)`
    - คืน 200 `{accepted:[cid], rejected}`

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - ไม่มี token หรือ token ผิด → 401
  - 41 รายการ → 400
  - 2 รายการถูก + 1 รายการผิด → accepted 2 (แถวมี `src=1` และ `created=received`) และ rejected 1 พร้อม field
  - cid ที่มีอยู่แล้ว → อยู่ใน accepted และไม่มีแถวเพิ่ม
  - usage ถึงเกณฑ์ → 503 `{error:'quota'}`
  - `safeEqual('a','a') === true` และ `safeEqual('a','b') === false`
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:worker -- tests/worker/import.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm run test:worker`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(api): POST /api/import for Apps Script sync"`

### Task 14: ยืนยันตัวตนแอดมิน

**Files:**
- Create: `src/auth.js`, `src/routes/admin.js`, `tests/unit/auth.test.js`, `tests/worker/admin-auth.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `safeEqual` (T13) และ `allow` (T12) โดย `safeEqual` ใช้แทน `crypto.subtle.timingSafeEqual` ที่ spec เขียนไว้ ยังเทียบแบบ constant-time เหมือนกัน แต่ทดสอบใน Node ได้ด้วย
- Produces:
  - `signSession(key, exp) -> Promise<string>`: คืน `` `${exp}.${base64url(HMAC-SHA256(key, String(exp)))}` ``
  - `verifySession(key, value, now) -> Promise<boolean>`: รูปแบบต้องถูก, `exp > now` และลายเซ็นต้องตรงกัน (ใช้ `safeEqual`)
  - `requireAdmin`: Hono middleware ที่ตรวจ cookie `adm` ถ้าไม่ผ่าน → 401 `{error:'auth'}`
  - `adminHeaders`: middleware ของ `/api/admin/*` ที่ใส่ `Cache-Control: no-store` และ `X-Robots-Tag: noindex` ให้ทุก response
  - `POST /api/admin/login`:
    - `allow(env,'login:'+ip)` ไม่ผ่าน → 429
    - body `{password: string}`
    - `safeEqual(password, env.ADMIN_PASSWORD)` ผ่าน → 204 + `Set-Cookie: adm=<v>; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800` ไม่ผ่าน → 401
  - `POST /api/admin/logout` → 204 + cookie `adm` ที่มี `Max-Age=0` และ attribute ชุดเดียวกัน
  - `adminRoutes`: Hono sub-app ที่ Task 15 จะเพิ่ม route

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - unit:
    - sign แล้ว verify → `true`
    - แก้ลายเซ็น 1 ตัวอักษร → `false`
    - `exp <= now` → `false`
    - `'garbage'` → `false`
  - worker:
    - รหัสผิด → 401
    - รหัสถูก → 204 และ cookie มี `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/admin`, `Max-Age=28800`
    - รหัสผิดครั้งที่ 6 ภายใน 60 วินาที → 429
    - mini app ที่ mount `requireAdmin` บน handler dummy: ไม่มี cookie → 401 และมี header `cache-control: no-store` ส่วน cookie ที่ได้จากการ login → 200
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:unit -- tests/unit/auth.test.js && npm run test:worker -- tests/worker/admin-auth.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm test`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(api): admin password login with HMAC session cookie"`

### Task 15: รวมผลสรุปแบบเพิ่มทีละส่วน + route ข้อมูลของแอดมิน

**Files:**
- Create: `src/summary.js`, `tests/unit/summary.test.js`, `tests/worker/admin-data.test.js`
- Modify: `src/routes/admin.js`

**Interfaces:**
- Consumes: `requireAdmin`, `adminRoutes` (T14) และ meter/usage (T11)
- Produces:
  - `emptyAcc() -> {staff:{n:0,heat:{},body:{},rank:{}}, donor:{n:0,heat:{}}}`
  - `mergeRows(acc, rows: {id, role, data: string}[]) -> acc`: คืน object ใหม่ โดย:
    - heat: ทุก zone `c += 1`, `s += sev`
    - staff body: ทุก key ใน msd +1
    - staff rank: index 0/1/2 ได้ +3/+2/+1
    - `n += 1`
  - `present(acc) -> {staff:{n, heat:{[z]:{count, avg}}, body, rank:[[opt, score]]}, donor:{n, heat}}`: `avg = Math.round(s/c*10)/10` และ rank เรียงคะแนนจากมากไปน้อย ถ้าคะแนนเท่ากันเรียงด้วย `a.localeCompare(b,'th')`
  - `GET /api/admin/summary[?rebuild=1]`:
    1. อ่านแถว summary + usage วันนี้ใน batch เดียว
    2. ถ้ามี `rebuild=1` ให้ใช้ `acc = emptyAcc()` และ `from = 0` ถ้าไม่มีใช้ค่าที่เก็บไว้
    3. `SELECT id, role, data FROM responses WHERE id > ? ORDER BY id LIMIT 100`
    4. ถ้ามีแถวใหม่ → `UPDATE summary SET last_id=?, data=?, updated=? WHERE k=1 AND last_id=?<ค่าที่อ่านมา>`
    5. `bumpUsage(n=0)`
    6. คืน `{updated, more: rows.length === 100, usage:{day,rw,rr,n,limits:{rw:D1_WRITE_LIMIT, rr:D1_READ_LIMIT}}, ...present(acc)}`
  - `GET /api/admin/responses?role=&after=&limit=`:
    - `role` ต้องเป็น `staff|donor` หรือไม่ใส่ ถ้าผิด → 400
    - `after` ≥ 0 (ค่าเริ่มต้น 0) และ `limit` 1–200 (ค่าเริ่มต้น 200)
    - คืน `{rows:[{id,cid,role,created,src,data: object}], next: rows.length === limit ? lastId : null}`
    - เรียก `bumpUsage(n=0)`

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  - unit (`summary.test.js`):
    - ใช้ 3 แถว (staff: A3 sev 4 + A3 sev 5 + body คอ/ไหล่ + rank `['ซ่อนสาย','ทางเดินกว้างขึ้น','ทำความสะอาดง่าย']` และ `['ซ่อนสาย']` / donor: Z5 sev 2)
    - `present(mergeRows(emptyAcc(), rows))` ต้องได้:
      `staff.heat.A3 = {count:2, avg:4.5}`, `staff.body = {'คอ':…, 'ไหล่':…}`, `staff.rank[0] = ['ซ่อนสาย',6]`, `donor.heat.Z5 = {count:1, avg:2}`, `donor` ไม่มี `body`/`rank`
    - `mergeRows(mergeRows(e,[r1]),[r2,r3])` deepEqual `mergeRows(e,[r1,r2,r3])`
  - worker (`admin-data.test.js`):
    - seed 105 แถว → เรียกครั้งแรกได้ `more:true` และ `staff.n + donor.n === 100` → เรียกครั้งที่สองได้ `105` และ `more:false`
    - เปลี่ยน `last_id` ใน DB ระหว่างที่อ่านไปแล้ว (จำลองสองแท็บ) → คำตอบยังเป็น 200 และการเรียกครั้งถัดไปไม่นับซ้ำ
    - `?rebuild=1` → นับใหม่ตั้งแต่ต้นได้ถูกต้อง
    - responses: แบ่งหน้าด้วย `after` + `next`, `role=donor` ได้แค่แถว donor, `role=x` → 400
    - ไม่มี cookie → 401
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm test`
  Expected: FAIL ที่ test ใหม่
- [ ] **Step 3: Implement**
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm test`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(api): incremental summary cache and paginated responses for admin"`

### Task 16: Apps Script ทางสำรอง + คู่มือติดตั้ง

**Files:**
- Create: `tools/apps-script/Code.gs`, `tools/apps-script/README.md`, `tests/unit/apps-script.test.js`

**Interfaces:**
- Produces (global ใน Code.gs):
  - `doPost(e)`: เรียก `handle_(JSON.parse(e.postData.contents), deps_())` แล้วคืน `ContentService.createTextOutput(JSON.stringify(r)).setMimeType(JSON)`
  - `handle_(p, deps) -> {ok:true} | {ok:false, error:'auth'|'invalid'}`
    - `deps = {props, sheet, fetch, now: Date, mail, lock}`
    - ถ้า `p.auth === 'worker'` → ตรวจ `p.key === props.SHEETS_TOKEN`
    - ถ้า `p.auth === 'turnstile'` → เรียก siteverify ผ่าน `deps.fetch` แล้วตรวจ `success`, `action === 'submit'` และ `hostname === props.ALLOWED_HOSTNAME`
    - role ต้องเป็น staff หรือ donor และ `JSON.stringify(p.data).length` ≤ 13824
    - lock → ถ้า cid ซ้ำ (อ่านจากคอลัมน์ B) ตอบ ok โดยไม่เพิ่มแถว ถ้าไม่ซ้ำ `appendRow([now.toISOString(), cid, role, JSON.stringify(data), via, ''])`
    - ถ้า `props.LAST_ALERT_DAY` ไม่ใช่วันนี้ (Asia/Bangkok) → ส่งอีเมลหัวข้อ `'แบบสอบถาม: มีคำตอบเข้าทางสำรอง'` แล้วตั้งค่า `LAST_ALERT_DAY`
  - `syncToWorker()` (trigger รายชั่วโมง) เรียก `syncBatch_(deps_()) -> {sent, accepted}`:
    - เลือกแถวที่ `synced` ว่างไม่เกิน 40 แถว
    - POST `props.WORKER_URL + '/api/import'` ด้วย header `Authorization: Bearer ` + `props.IMPORT_TOKEN` และ body `{items:[{cid, data, received: Math.floor(Date.parse(received)/1000)}]}`
    - ถ้าได้ 200 → เขียน ISO ของ `now` ลงคอลัมน์ F ของ cid ที่อยู่ใน `accepted` ถ้าเป็นสถานะอื่นไม่ต้องทำอะไร
  - คอลัมน์ของ sheet `pending`: `received | cid | role | data | via | synced`

- [ ] **Step 1: เขียน test ที่ต้อง fail**
  โหลด `Code.gs` ใน `node:vm` พร้อม stub ของ `ContentService`, `LockService`, `PropertiesService`, `SpreadsheetApp` (sheet ที่เก็บแถวเป็น array), `UrlFetchApp`, `MailApp`, `Session`, `Utilities.formatDate` แล้วทดสอบ:
  - worker + key ถูก → เพิ่ม 1 แถว (`via='worker'`)
  - key ผิด → `{ok:false, error:'auth'}`
  - turnstile + siteverify `success:false` → auth
  - turnstile + hostname ผิด → auth
  - cid ซ้ำ → ok และไม่เพิ่มแถว
  - role ผิด → invalid
  - 2 คำขอในวันเดียวกัน → ส่งอีเมล 1 ครั้ง และวันถัดไปส่งอีกครั้ง
  - `syncBatch_`:
    - มี 45 แถวที่ยังไม่ซิงก์ → ส่ง 40 และ header ถูก
    - accepted 39 รายการ → เขียน synced 39 แถว
    - Worker ตอบ 503 → ไม่เขียน synced เลย
- [ ] **Step 2: รันแล้วต้อง fail**
  Run: `npm run test:unit -- tests/unit/apps-script.test.js`
  Expected: FAIL
- [ ] **Step 3: Implement `Code.gs` และเขียน README**
  README มีขั้นตอน: สร้าง Sheet + แท็บ `pending` → วางโค้ด → ตั้ง Script Properties 5 ค่า (spec 9.2) → Deploy เป็น Web app (Execute as: Me, Who has access: Anyone) → เพิ่ม trigger รายชั่วโมงให้ `syncToWorker` → เอา URL ไปใส่ `SHEETS_URL` (wrangler) และ `App.config.sheetsUrl`
- [ ] **Step 4: รันแล้วต้องผ่าน**
  Run: `npm run test:unit`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(fallback): Apps Script receiver with hourly sync back to D1"`

## Phase 5 — ตรวจทั้งระบบและเอกสาร

### Task 17: E2E กับ Worker จริง + วัดค่า

**Files:**
- Modify: `playwright.config.js`
- Create: `tests/e2e/mock-sheets.mjs`, `tests/e2e/full.spec.js`, `docs/reports/weights-after.json`, `docs/reports/measurements.json`

**Interfaces:**
- Consumes: ทุก route จาก T11–T15 และหน้าเว็บจาก T5–T8
- Produces:
  - `mock-sheets.mjs`: HTTP server ที่ port 8790
    - `POST /exec`: เก็บ body แล้วตอบ `{ok:true}` พร้อม header CORS `*`
    - `GET /records` → JSON array
    - `DELETE /records` → ล้างข้อมูล
  - `playwright.config.js` มี webServer 2 ตัว:
    1. `node tests/e2e/mock-sheets.mjs` (url `http://localhost:8790/records`)
    2. `npx wrangler d1 migrations apply eve-survey --local && npx wrangler dev --port 8787 --var RATE_LIMIT_OFF:1`
    - ต้องมี `.dev.vars` (คัดลอกจาก `.dev.vars.example`)
    - ตั้ง `workers: 1` และ `fullyParallel: false` เพราะทุก test ใช้ D1 ในเครื่องชุดเดียวกัน
  - `usageNow()` (helper ใน full.spec.js): รัน `npx wrangler d1 execute eve-survey --local --json --command "SELECT rw, rr FROM usage WHERE day=<วันนี้ UTC>"` แล้วคืน `{rw, rr}`
  - `docs/reports/measurements.json`: `{ staffFullBytes, donorFullBytes, rowsWrittenPerSubmit, rowsReadPerSubmit, adminOpenRw, adminOpenRr }`

- [ ] **Step 1: เขียน `full.spec.js`** (Turnstile ยังใช้ stub ของ Task 7 ส่วน Worker ใช้ test secret ที่รับ token `XXXX.DUMMY.TOKEN.XXXX`)
  - `every page loads with no console errors or 404`: ทำกับ `/`, `/survey.html?role=staff`, `/survey.html?role=donor`, `/thanks.html`, `/admin.html`
  - `staff and donor submissions are stored in legacy format`:
    1. ตอบผ่าน UI ทั้ง 2 บทบาท
    2. login ผ่าน `request` context ด้วยรหัสจาก `.dev.vars`
    3. `GET /api/admin/responses` → `rows[i].data` deepEqual object literal ที่ test เลือกไว้
  - `admin page shows real counts`: login ผ่าน UI แล้วเห็นจำนวนคำตอบ staff 1 และ donor 1 และเห็น badge บนผังของจุดที่ตอบ
  - `measure` (ต้องรันก่อน test over-quota):
    1. `usageNow()` ก่อน/หลัง POST `/api/submit` ด้วย fixture 1 ครั้ง → `rowsWrittenPerSubmit` และ `rowsReadPerSubmit`
    2. `usageNow()` ก่อน/หลัง `GET /api/admin/summary` 1 ครั้ง (ต้องมีแถวใหม่ที่ยังไม่ถูกรวม) → `adminOpenRw` และ `adminOpenRr`
    3. `new TextEncoder().encode(JSON.stringify(fixture)).length` → `staffFullBytes` และ `donorFullBytes`
    4. เขียนลง `measurements.json`
  - `over-quota goes to Sheets and import syncs it back` (**ต้องเป็น test สุดท้ายของไฟล์** ใช้ `test.describe.configure({mode:'serial'})` เพราะค่า usage ที่ isolate จำไว้จะค้างอยู่จนกว่าจะเริ่ม `wrangler dev` ใหม่):
    1. `npx wrangler d1 execute eve-survey --local --command "UPDATE usage SET rw=80000 WHERE day=<วันนี้ UTC>"`
    2. ส่ง 2 คำตอบ (คำตอบที่ 2 ต้องได้ 202)
    3. `GET :8790/records` ต้องมี 1 รายการที่ `auth:'worker'`
    4. POST รายการนั้นไป `/api/import` พร้อม `IMPORT_TOKEN` → ต้องได้ 503 `{error:'quota'}` (ยังเกินเกณฑ์)
    5. `UPDATE usage SET rw=0` แล้วเริ่ม `wrangler dev` ใหม่ (หรือรอให้ `bumpUsage` ของคำขอถัดไปคืนค่าใหม่) จากนั้น POST ซ้ำ → 200 และ `accepted` มี cid นั้น
    6. `responses` มีแถวที่ `src=1`
- [ ] **Step 2: รันทั้งชุด**
  Run: `cp .dev.vars.example .dev.vars && npm run e2e`
  Expected: PASS ทุก spec (pages, submit, admin, full)
- [ ] **Step 3: วัดน้ำหนักหน้าหลังปรับ**
  Run: `node tests/visual/weight.mjs http://localhost:8787 docs/reports/weights-after.json /index.html '/survey.html?role=staff' '/survey.html?role=donor' /thanks.html /admin.html`
  Expected: ไฟล์ JSON มี 5 หน้า และ `/index.html` ไม่มี resource ชนิด script
- [ ] **Step 4: ตรวจรอบสุดท้าย**
  Run: `npm test && BASE_URL=http://localhost:8787 npm run visual`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "test: end-to-end against local Worker and D1; record measurements"`

### Task 18: รายงาน + คู่มือดูแลระบบ

**Files:**
- Modify: `docs/reports/frontend-prep-report.md`
- Create: `docs/operations.md`

**Interfaces:**
- Consumes: `weights-before.json`, `weights-after.json`, `measurements.json` และตารางรายการลบที่อนุมัติใน T9

- [ ] **Step 1: เขียนรายงานให้เสร็จ** (`frontend-prep-report.md`)
  - โครงไฟล์ก่อน/หลัง (ผลของ `git ls-tree -r --name-only` ที่ commit ของ Task 1 เทียบกับ HEAD)
  - ตารางรายการที่ลบ (ฉบับที่อนุมัติ)
  - ตารางน้ำหนักต่อหน้า (จำนวนคำขอ, bytes, encodedBytes) ก่อน/หลัง และสัดส่วนที่ลดลง
  - ขนาด payload ที่วัดจริง
- [ ] **Step 2: ค้นเอกสาร Cloudflare ปัจจุบัน**
  หาว่าแผนฟรีตั้ง Notifications อะไรได้บ้าง (เช่น usage หรือ Workers alerts) และยืนยันว่า Rate Limiting binding ใช้บนแผนฟรีได้หรือไม่ จดลิงก์และวันที่ที่ตรวจ
- [ ] **Step 3: เขียน `docs/operations.md`**
  - ตารางโควตาตาม spec หัวข้อ 12 โดยแทนค่าด้วย `measurements.json`:
    - % ต่อวันที่ X=50, N=10
    - จำนวนคำตอบสูงสุดต่อวันและต่อเดือนก่อนเต็ม
    - คอขวด
    - สูตรที่ใช้คำนวณ
  - ขั้นตอน deploy:
    1. `npx wrangler login`
    2. `npx wrangler d1 create eve-survey` แล้วใส่ `database_id`
    3. `npx wrangler d1 migrations apply eve-survey --remote`
    4. สร้าง Turnstile widget (hostname = `<name>.<account>.workers.dev`) แล้วใส่ sitekey ใน `public/js/config.js` และ `ALLOWED_HOSTS`
    5. ติดตั้ง Apps Script ตาม README แล้วใส่ URL
    6. `wrangler secret put` ทั้ง 5 ค่า
    7. `npm run build:css && npx wrangler deploy`
  - วิธีดูโควตาในแดชบอร์ด (Workers metrics, D1 metrics, account usage), การแจ้งเตือนที่ใช้ได้ (ผลจาก Step 2 + อีเมลจาก Apps Script + การ์ดโควตาในหน้าแอดมิน)
  - วิธีรันในเครื่อง (spec 5.4) และ Turnstile test keys
  - การ backup (`wrangler d1 export … --remote`, CSV), การลบนับเป็นการเขียน (ถ้าเริ่มรอบใหม่ให้สร้างฐานใหม่แทนการ DELETE) และการหมุน secret
  - ข้อควรระวังและสมมติฐาน: spec หัวข้อ 16 ที่อัปเดตผลจริงของข้อ 1, 2 และ 7
- [ ] **Step 4: ตรวจว่าสิ่งที่ส่งมอบครบ**
  ไล่ตาราง spec หัวข้อ 15 ทีละแถวว่ามีไฟล์ครบ และ `grep -n "REPLACE_WITH\|0000-0000" -r public wrangler.jsonc` ต้องเจอเฉพาะค่าที่ต้องแทนตอน deploy ซึ่งระบุไว้ใน operations.md แล้ว
- [ ] **Step 5: Commit**
  `git commit -m "docs: frontend prep report and operations guide"`
