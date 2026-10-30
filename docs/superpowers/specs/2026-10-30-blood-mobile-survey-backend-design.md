# แบบสอบถามรถรับบริจาคโลหิต — ปรับ frontend + backend ฟรีบน Cloudflare (Design Spec)

- วันที่: 2026-10-30
- สถานะ: รอผู้ใช้ตรวจ spec
- ที่มา: `backend-prompt.md` (ในโฟลเดอร์โปรเจกต์) + การตัดสินใจระหว่าง brainstorming ในแชต
- ขอบเขต: งานเตรียม frontend (ขั้นที่ 0–3) + backend + หน้าแอดมิน ทั้งหมดอยู่ใน spec เดียว เพราะขั้นที่ 2 ต้องอิงรูปแบบ API แผนลงมือแบ่งเป็นช่วงตามลำดับในหัวข้อ 14

---

## 1. เป้าหมายและเกณฑ์สำเร็จ

**เป้าหมาย:** แบบฟอร์มส่งคำตอบได้จริงโดยไม่มีค่าใช้จ่าย อยู่ในแพ็กเกจฟรีได้นานที่สุด ข้อมูลไม่หายแม้โควตาเต็ม และหน้าแอดมินแสดงผลจากข้อมูลจริงแทนข้อมูลจำลอง

**ข้อห้ามที่ต้องรักษา**
- ห้ามใช้บริการที่ต้องใส่บัตรเครดิตหรือมีค่าใช้จ่ายแอบแฝง
- ห้ามเปลี่ยนหน้าตาหรือข้อความคำถามเดิม ยกเว้นส่วนที่เกี่ยวกับข้อมูลจำลอง
- ห้ามเปลี่ยนรูปแบบ JSON คำตอบ `{role, answers, msd, map}` (ดูหัวข้อ 6.2 ซึ่งเพิ่ม envelope ครอบไว้ และแจ้งผู้ใช้แล้ว)
- ห้ามใช้ localStorage/sessionStorage เป็นที่เก็บคำตอบหลัก
- ห้ามลบไฟล์ก่อนผู้ใช้ยืนยันตารางรายการที่จะลบ
- ใช้ `window.App` + vanilla JS + `<script defer>` ต่อไป ไม่ย้ายไปใช้ framework

**ถือว่าสำเร็จเมื่อ**
1. เปิดทุกหน้าผ่าน local server (`wrangler dev`) แล้วไม่มี error หรือ 404 ใน console
2. ทำแบบสอบถามครบทั้ง 2 บทบาท แล้วได้ `data` รูปแบบเดียวกับ `App.store.toJSON()` เดิม และบันทึกลง D1 ได้
3. หน้าตาแบบสอบถามเหมือนเดิม (ตรวจด้วยการเทียบภาพหน้าจอก่อน/หลัง)
4. หน้าแอดมินแสดง heat/body/rank จากข้อมูลจริง และแสดง "ยังไม่มีข้อมูล" เมื่อยังไม่มีคำตอบ
5. เมื่อจำลองให้ D1 หรือ Worker ล่ม คำตอบต้องไปถึง Google Sheets แล้วซิงก์กลับ D1 ได้

## 2. การตัดสินใจที่ตกลงแล้ว

| เรื่อง | ข้อตกลง |
|---|---|
| ปริมาณ | ระดับเล็ก ใช้ค่าบนในการคำนวณ: X = 50 คน/วัน, Y = 20 คน/ชม., เปิด 3 เดือน (≈92 วัน ≈ 4,600 คำตอบ), N = เปิดแอดมิน 10 ครั้ง/วัน |
| บทบาท | เปิดรับทั้งเจ้าหน้าที่และผู้บริจาค |
| `img/bus-map.jpg` | ลบ (ยังต้องผ่านตารางยืนยันในขั้นที่ 3) |
| ยืนยันตัวตนแอดมิน | รหัสผ่านเดียว (Worker secret) + cookie ที่ลงลายเซ็น HMAC |
| จุดผังที่ยังมี `tmp:1` | เตือนก่อนส่ง ให้เลือก "บันทึกทั้งหมดแล้วส่ง" / "ทิ้งจุดเหล่านี้แล้วส่ง" / "กลับไปแก้ ส่วน D" |
| โดเมน | `*.workers.dev` (ไม่มี WAF) |
| สถาปัตยกรรม | ทาง A: Hono บน Workers + Static Assets + D1 |
| ที่เก็บสำรอง | Google Sheets ผ่าน Apps Script เป็นทางเดียว ใช้รับทั้งกรณีโควตา D1 ใกล้เต็มและกรณี Worker ล่ม |
| Tailwind | Tailwind CLI 3.4.17 สร้างไฟล์ CSS คงที่ แทน Play CDN |

## 3. โควตาที่ตรวจจากเอกสารทางการ (ตรวจเมื่อ 2026-10-30)

| บริการ (แผนฟรี) | ค่า | แหล่งที่มา |
|---|---|---|
| Workers requests | 100,000/วัน รีเซ็ต 00:00 UTC เกินแล้วได้ Error 1027 | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) |
| Workers CPU | 10 ms ต่อคำขอ HTTP / ต่อ Cron | เอกสารเดียวกัน |
| Static assets | "Requests to static assets are free and unlimited" | [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| D1 | อ่าน 5,000,000 แถว/วัน, เขียน 100,000 แถว/วัน, เก็บรวม 5 GB | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| D1 ต่อฐานข้อมูล | **สูงสุด 500 MB**, ได้ 10 ฐาน, 50 query ต่อ invocation, แถวละไม่เกิน 2 MB | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| D1 index | "Indexes will add an additional written row when writes include the indexed column" | D1 pricing |
| D1 DELETE | นับเป็นการเขียน ("Write operations include INSERT, UPDATE, and DELETE") | D1 pricing |
| D1 เกินโควตา | query ล้มเหลวจนถึงเวลารีเซ็ต | D1 pricing |
| KV | อ่าน 100,000/วัน, เขียน 1,000/วัน, เก็บ 1 GB (ดีไซน์นี้ไม่ใช้ KV) | [KV limits](https://developers.cloudflare.com/kv/platform/limits/) |
| Queues | 10,000 ops/วัน เก็บข้อความได้ 24 ชม. (ดีไซน์นี้ไม่ใช้) | [Changelog 2026-02-04](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/) |
| Turnstile | ฟรี ได้ 20 widget, ตรวจได้ไม่จำกัดครั้ง | [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) |
| Rate Limiting binding | `period` ตั้งได้แค่ 10 หรือ 60 วินาที นับแยกตาม location และเป็นค่าประมาณ **เอกสารไม่ได้ระบุว่าแผนฟรีใช้ได้หรือไม่** | [Rate limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) |
| Pages หรือ Workers | หน้า Get started ของ Pages เขียนว่า "Start new projects with Workers" | Pages docs |
| R2 | ต้อง "complete the checkout flow to add an R2 subscription" แม้จะใช้แค่ส่วนฟรี → **ไม่ใช้** | [R2 get started](https://developers.cloudflare.com/r2/get-started/) |
| Cloudflare Access | มีรายงานใน community ว่าแผนฟรีต้องผูกวิธีชำระเงิน → **ไม่ใช้** | [Community, ม.ค. 2025](https://community.cloudflare.com/t/how-to-add-an-ztna-app-for-free-in-access-without-entering-credit-card-detail/764129) |
| Apps Script (Gmail) | ทำงานพร้อมกันได้ 30 execution/ผู้ใช้, URL Fetch 20,000 ครั้ง/วัน, trigger รวม 90 นาที/วัน | [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) |

ทาง B ที่ไม่ได้เลือก: Render แบบฟรีหลับหลังไม่มีคำขอ 15 นาที และใช้ราว 1 นาทีกว่าจะตื่น ([Render FAQ](https://render.com/docs/faq)) ส่วน Supabase แบบฟรีถูก pause เมื่อฐานข้อมูลแทบไม่มีการใช้งานภายในหนึ่งสัปดาห์ ([Supabase KB](https://supabase.com/kb/faqs/platform/free-project-pausing))

## 4. ภาพรวมสถาปัตยกรรม

```
เบราว์เซอร์ ──GET *.html/js/css──▶ Workers Static Assets (ฟรี ไม่จำกัด ไม่เรียก Worker)
     │
     ├─POST /api/submit──▶ Worker (Hono) ──▶ D1 (responses, usage, summary)
     │                         │  └─ถ้ายอด ≥80% หรือ D1 error──▶ Apps Script ──▶ Google Sheet
     │                         └─siteverify──▶ Turnstile
     │
     └─(Worker ล่ม/1027/5xx)──POST ตรง──▶ Apps Script (ตรวจ Turnstile เอง) ──▶ Google Sheet

Apps Script trigger รายชั่วโมง ──POST /api/import──▶ Worker ──▶ D1   (ซิงก์กลับ)
admin.html ──/api/admin/*──▶ Worker (cookie HMAC) ──▶ D1 summary cache
```

## 5. Frontend (ขั้นที่ 0–1)

### 5.1 โครงสร้างไฟล์หลังปรับ

```
public/                       ← deploy เฉพาะโฟลเดอร์นี้เป็น static assets
  index.html                  HTML ล้วน ไม่มี JS ใช้ข้อความ intro เดิม ปุ่มบทบาทเป็น <a href="survey.html?role=…">
  survey.html                 ส่วน A–F ในหน้าเดียว + Turnstile + honeypot + ส่งคำตอบ
  thanks.html                 HTML ล้วน มีลิงก์ "เริ่มใหม่" กลับไป index.html
  admin.html                  เข้าสู่ระบบ + สรุปผล, <meta name="robots" content="noindex,nofollow">
  css/app.css                 ได้จาก Tailwind CLI (อยู่ใน .gitignore)
  js/config.js                App.config: turnstileSiteKey, sheetsUrl (ใช้ test key อัตโนมัติเมื่อเปิดบน localhost)
  js/shared/ui.js             ย้ายมาจาก js/components/ui.js
  js/components/body-map.js
  js/components/bus-map.js
  js/data/common.js           ค่าคงที่ที่ใช้ร่วมกัน (FREQ, AGREE, ANXIETY, MAP_NOTE), zoneForm, nav, App.data.submit (ข้อความใหม่)
  js/data/staff.js            App.data.sections.staff + App.data.msd
  js/data/donor.js            App.data.sections.donor
  js/data/bus-layout.js
  js/data/body-regions.js
  js/survey/state.js          ย้ายมาจาก js/state.js และตัด screen ออก
  js/survey/survey.js         render + event delegation (รวมจาก js/app.js และ js/pages/survey.js)
  js/survey/submit.js         ส่งคำตอบ, เตือนจุด tmp, ร่างสำรอง, ทางสำรอง
  js/admin/admin.js           login, เรียก summary, bars(), CSV, App.data.admin (หัวข้อการ์ด)
src/                          โค้ด Worker (หัวข้อ 7)
src/styles.css                input ของ Tailwind: @tailwind base/components/utilities + CSS เดิมจาก css/styles.css
migrations/0001_init.sql
tools/apps-script/Code.gs     โค้ด Apps Script + README การติดตั้ง
tests/                        unit (vitest) + e2e (Playwright)
tailwind.config.js            config กลาง (theme.extend เดิมที่ฝังอยู่ใน index.html)
wrangler.jsonc, package.json, .gitattributes, .gitignore, .dev.vars.example
```

เหตุผลที่ต่างจากโครงที่ prompt เสนอ:
- **มี `public/` ครอบ:** ถ้าใช้ root ของโปรเจกต์เป็น assets ไฟล์อย่าง `backend-prompt.md`, docs หรือ `node_modules` จะถูกอัปโหลดขึ้นเว็บไปด้วย
- **index.html และ thanks.html ไม่มี JS:** ลดน้ำหนักหน้าแรกให้เหลือแค่ HTML + CSS ข้อความ intro ย้ายจาก `App.data.intro` มาอยู่ใน HTML เพียงที่เดียว
- **ไม่มี `js/shared/tailwind-config.js`:** ใช้ Tailwind CLI จึงย้าย config ไปไว้ที่ `tailwind.config.js` ซึ่งใช้ตอน build

### 5.2 การโหลดสคริปต์

| หน้า | สคริปต์ |
|---|---|
| index.html | ไม่มี |
| thanks.html | ไม่มี |
| survey.html | (defer) config, ui, bus-layout, bus-map, common, state, survey, submit + Turnstile `api.js?render=explicit` แล้ว `survey.js` ใส่สคริปต์ของบทบาทเพิ่ม: staff → `staff.js`, `body-regions.js`, `body-map.js` / donor → `donor.js` เมื่อโหลดเสร็จจึง render ถ้า `?role` ไม่ใช่ staff/donor จะ `location.replace('index.html')` |
| admin.html | (defer) ui, bus-layout, body-regions, bus-map, body-map, admin |

### 5.3 Tailwind: Play CDN หรือ CLI

| | Play CDN (ปัจจุบัน) | Tailwind CLI 3.4.17 (เลือก) |
|---|---|---|
| วิธีทำงาน | โหลดสคริปต์ JIT แล้วคอมไพล์ CSS ในเบราว์เซอร์ทุกครั้งที่เปิดหน้า | สร้าง `app.css` ที่ minify แล้วตอน build |
| production | เอกสาร Tailwind ระบุว่าไม่เหมาะ | เหมาะ |
| ขนาดและความเร็ว | สคริปต์ใหญ่ และหน้าอาจกระพริบก่อนจะได้ style | CSS คงที่ ขนาดเล็ก และ browser cache ได้ |
| ข้อเสีย | — | ต้อง build ก่อน (ตั้ง `build.command` ใน wrangler ให้รันเองตอน dev/deploy) |

ใช้เวอร์ชัน 3.4.17 ให้ตรงกับที่ใช้อยู่ เพื่อให้ class ออกมาเหมือนเดิม `content` ครอบ `public/**/*.html` และ `public/js/**/*.js` ส่วน class ที่ประกอบขึ้นตอนรัน (bus-map.js บรรทัด 183/185 ต่อ string `class="' + c`) ต้องตรวจตอน implement ถ้ามี class ที่ CLI มองไม่เห็นจะใส่ใน `safelist`

### 5.4 วิธีรันในเครื่อง

ต้องมี Node.js รุ่น LTS บน Windows จากนั้น:
```
npm install
copy .dev.vars.example .dev.vars          # ใส่ Turnstile test secret และรหัสแอดมินสำหรับทดสอบ
npx wrangler d1 migrations apply eve-survey --local
npm run dev                                # = wrangler dev → http://localhost:8787
```
ห้ามเปิดไฟล์ด้วยการดับเบิลคลิก เพราะ Turnstile และ API ต้องใช้ผ่าน http(s) ส่วน Turnstile test key ที่ใช้ในเครื่องคือ sitekey `1x00000000000000000000AA` และ secret `1x0000000000000000000000000000000AA` (ผ่านเสมอ)

## 6. เอาข้อมูลจำลองออก + การส่งคำตอบฝั่ง client (ขั้นที่ 2)

### 6.1 สิ่งที่เอาออกและสิ่งที่แทน
- ลบ `js/data/mock-summary.js`, `js/pages/summary.js`, `js/pages/thanks.js`, `js/pages/intro.js`, `js/app.js` (เนื้อหาย้ายไป survey.js), action `summary`/`home`/`restart`/`copy`, `App.state.screen`, `App.data.intro.summaryButton`, ข้อความ pilot `App.data.thanks.body`, `.replace(...)` ที่ใช้แก้ class ปุ่ม
- `thanks.html`: หัวข้อ "ขอบคุณค่ะ 🙏" (เดิม) + "ส่งคำตอบเรียบร้อยแล้ว ขอบคุณที่สละเวลาตอบแบบสอบถาม" + ลิงก์ "เริ่มใหม่"
- `copyAnswers()` ย้ายไปอยู่ใน submit.js และแสดงเฉพาะตอนที่ส่งไม่สำเร็จทั้ง 2 ทาง

### 6.2 รูปแบบคำขอ (แจ้งผู้ใช้แล้ว)
```json
{"v":1,"cid":"<uuid v4 ต่อการตอบหนึ่งครั้ง>","token":"<turnstile>","hp":"","data":{"role":"staff","answers":{},"msd":{},"map":{}}}
```
`data` ต้องตรงกับ `App.store.toJSON()` เดิมทุกตัวอักษร (หลังตัด `tmp` ออกแล้ว) และ D1 เก็บแค่ `data`

### 6.3 ลำดับเมื่อกด "ส่งคำตอบ"
1. **จุด tmp:** ถ้ามี จะแสดงกล่องเตือนเหนือปุ่ม พร้อมรายชื่อจุดและปุ่ม 3 ปุ่ม (หัวข้อ 2)
2. **validate ฝั่ง client:** ต้องตอบอย่างน้อย 1 ข้อ และ JSON ต้องไม่เกิน 16 KB (ทุกข้อเป็นข้อไม่บังคับเหมือนเดิม)
3. **ร่างสำรอง:** `localStorage['eve-draft']` = `{cid, role, step, state}` เขียน*ก่อน*ส่ง และลบเมื่อได้ 201/202 ถ้าเปิด survey.html แล้วเจอร่างของบทบาทเดียวกัน จะขึ้นแถบ "มีคำตอบที่ยังส่งไม่สำเร็จ [ส่งต่อ] [ทิ้ง]" ถ้า localStorage ใช้ไม่ได้ก็ทำงานต่อได้ (ห่อด้วย try/catch)
4. **Turnstile:** render แบบ `execution: 'execute'`, `action: 'submit'` แล้วเรียก `turnstile.execute()` ตอนกดส่ง เพราะ token มีอายุ 300 วินาที แต่ผู้ตอบใช้เวลา 5–12 นาที
5. **`fetch('/api/submit')`** แล้วจัดการผลตามตารางนี้

| ผล | การทำงาน |
|---|---|
| 201 `{ok:true}` / 202 `{ok:true,queued:true}` | ลบร่าง → `location.replace('thanks.html')` |
| 400 / 413 | "ข้อมูลไม่ถูกต้อง" + ปุ่มคัดลอก (ไม่ควรเกิดถ้า client validate แล้ว) |
| 403 `{error:'turnstile'}` | reset widget + "ยืนยันตัวตนไม่สำเร็จ กรุณากดส่งอีกครั้ง" |
| 429 ที่ตอบเป็น JSON `{error:'rate'}` | "ส่งถี่เกินไป รอสักครู่แล้วลองใหม่" |
| network error, 5xx, 429/1027 ที่ไม่ใช่ JSON | ขอ token ใหม่ แล้ว POST `{auth:'turnstile', token, cid, data}` แบบ `text/plain` ไปที่ `App.config.sheetsUrl` ถ้าได้ `{ok:true}` → ไป thanks |
| ทางสำรองล้มเหลวด้วย | "ระบบรับคำตอบขัดข้องชั่วคราว คำตอบยังอยู่ในเครื่องนี้ ลองใหม่ภายหลังได้ (โควตารีเซ็ต 07:00 น.)" + [ส่งอีกครั้ง] + [คัดลอกคำตอบ] |

ข้อความใหม่ทั้งหมดอยู่ใน `App.data.submit` (common.js) ข้อความคำถามเดิมไม่ถูกแก้

### 6.4 Honeypot
`<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` วางไว้นอกจอใน survey.html แล้วส่งค่าไปใน `hp`

## 7. Worker (Hono)

### 7.1 Config
```jsonc
{
  "name": "eve-survey",
  "main": "src/index.js",
  "compatibility_date": "<วันที่ตอน implement>",
  "assets": { "directory": "./public", "run_worker_first": ["/api/*"] },
  "build": { "command": "npm run build:css" },
  "d1_databases": [{ "binding": "DB", "database_name": "eve-survey", "database_id": "<จาก wrangler d1 create>", "migrations_dir": "migrations" }],
  "ratelimits": [{ "name": "RL", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }],
  "vars": { "SHEETS_URL": "<Apps Script URL>", "QUOTA_RATIO": "0.8", "D1_WRITE_LIMIT": "100000", "D1_READ_LIMIT": "5000000" }
}
```
Secrets (`wrangler secret put`): `TURNSTILE_SECRET`, `ADMIN_PASSWORD`, `SESSION_KEY`, `SHEETS_TOKEN` (ใช้ตอน Worker ส่งไป Apps Script), `IMPORT_TOKEN` (ใช้ตอน Apps Script ส่งกลับ Worker) ส่วนในเครื่องใช้ `.dev.vars` (อยู่ใน .gitignore)

### 7.2 ไฟล์ใน `src/`
| ไฟล์ | หน้าที่ |
|---|---|
| `index.js` | สร้าง Hono app, ผูก route, error handler กลาง (ตอบ JSON ทุกครั้ง) |
| `schema.js` | key ที่รู้จักและชนิดของคำถามแต่ละบทบาท, รายชื่อส่วนร่างกาย, zone id, ขีดจำกัดความยาว |
| `validate.js` | `validateEnvelope()` / `validateData(role, data)` → `{ok}` หรือ `{error, field}` |
| `turnstile.js` | `verifyTurnstile(token, ip, secret)` → `{ok, hostname, action}` |
| `store.js` | `insertResponse()`, `bumpUsage()`, `usageToday()` รวม meta ที่ D1 ส่งกลับ |
| `fallback.js` | `forwardToSheets(env, cid, data)` |
| `auth.js` | สร้างและตรวจ cookie HMAC, `timingSafeEqual` |
| `summary.js` | รวมผลแบบเพิ่มทีละส่วน และแปลงเป็นรูปแบบที่ component รับ |

### 7.3 Routes
| Route | ยืนยันตัวตน | ผล |
|---|---|---|
| `POST /api/submit` | Turnstile | 201 / 202 / 400 / 403 / 413 / 429 / 503 |
| `POST /api/import` | `Authorization: Bearer IMPORT_TOKEN` | `{accepted:[cid], rejected:[{cid,reason}]}` / 503 ถ้ายอดถึงเกณฑ์ |
| `POST /api/admin/login` | รหัสผ่าน + rate limit | 204 + Set-Cookie / 401 / 429 |
| `POST /api/admin/logout` | — | 204 + ลบ cookie |
| `GET /api/admin/summary[?rebuild=1]` | cookie | ดูหัวข้อ 10.2 |
| `GET /api/admin/responses?role=&after=&limit=` | cookie | `{rows:[{id,cid,role,created,src,data}], next}` (limit ไม่เกิน 200) |

ทุก response ของ `/api/admin/*` ใส่ header `Cache-Control: no-store` และ `X-Robots-Tag: noindex`

### 7.4 ลำดับใน `/api/submit` (ทำขั้นที่ถูกก่อน และไม่แตะ D1 จนกว่าจะผ่านทุกขั้น)
1. `Content-Length` > 16 KB → 413 จากนั้น parse JSON ถ้าพัง → 400
2. `validateEnvelope` (`v === 1`, `cid` เป็น uuid, มี token) และ `validateData`
   - `data` มี key แค่ `role/answers/msd/map` และ `data.role` ต้องเป็น staff หรือ donor
   - `answers`: key ต้องอยู่ในชุดของบทบาทนั้น และชนิดค่าต้องตรงกับชนิดคำถาม: pills → string, scale → integer 1–5, multi/rank → array ของ string ที่ไม่เกินจำนวนตัวเลือกหรือ `max`, number → string ตัวเลข (โค้ดเดิมเก็บเป็น string) ไม่เกิน 6 ตัวอักษร, textarea → string ไม่เกิน 2,000 ตัวอักษร
   - `msd` (staff เท่านั้น): key ต้องเป็นส่วนร่างกายที่รู้จัก, `y`/`w` ต้องเป็น "ใช่" หรือ "ไม่", `s` เป็น integer 0–10 หรือ `""`
   - `map`: key ต้องเป็น zone id ที่รู้จัก, `t`/`p` เป็น array ของ string, `sev` integer 1–5, `n` string ไม่เกิน 500 ตัวอักษร และต้องไม่มี key อื่น (รวมถึง `tmp`)
3. `hp !== ""` → 201 แบบหลอก (ไม่บันทึกและไม่ log)
4. `env.RL.limit({key: 'submit:' + ip})` ถ้าไม่ผ่าน → 429 `{error:'rate'}`
5. Turnstile siteverify (ส่ง `remoteip` ด้วย) ตรวจ `success`, `action === 'submit'` และ `hostname` ที่อนุญาต ถ้าไม่ผ่าน → 403
6. ถ้ายอดของวันนี้ที่รู้ล่าสุด (เก็บในหน่วยความจำของ isolate) ≥ 80% → `forwardToSheets` → 202
7. `INSERT INTO responses … ON CONFLICT(cid) DO NOTHING` แล้ว `bumpUsage` (UPSERT … RETURNING) → 201
8. ถ้าข้อ 7 throw (เช่นโควตาเต็ม) → `forwardToSheets` → 202 แต่ถ้า Sheets ล้มเหลวด้วย → 503 `{error:'unavailable'}`

ไม่บันทึก IP หรือ User-Agent ลงฐานข้อมูล IP ใช้เฉพาะตอนตรวจ rate limit และ Turnstile

## 8. Schema D1 (`migrations/0001_init.sql`)

```sql
CREATE TABLE responses (
  id      INTEGER PRIMARY KEY,
  cid     TEXT    NOT NULL UNIQUE,
  role    TEXT    NOT NULL CHECK (role IN ('staff','donor')),
  data    TEXT    NOT NULL,
  created INTEGER NOT NULL,
  src     INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE usage (
  day INTEGER PRIMARY KEY,          -- YYYYMMDD (UTC)
  rw  INTEGER NOT NULL DEFAULT 0,   -- rows written ที่ Worker นี้นับได้
  rr  INTEGER NOT NULL DEFAULT 0,   -- rows read
  n   INTEGER NOT NULL DEFAULT 0    -- จำนวนคำตอบที่บันทึก
) STRICT;

CREATE TABLE summary (
  k       INTEGER PRIMARY KEY CHECK (k = 1),
  last_id INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated INTEGER NOT NULL
) STRICT;
INSERT INTO summary (k, last_id, data, updated) VALUES (1, 0, '{}', 0);
```

**เหตุผลเรื่อง index**
- `id INTEGER PRIMARY KEY` คือ rowid จึงไม่มี index แยก และใช้เป็น cursor ตามลำดับที่ข้อมูลเข้ามา
- `cid UNIQUE` เป็น index เดียวที่มี เพื่อกันข้อมูลซ้ำจากการกดส่งซ้ำหรือการซิงก์ แลกกับการเขียนเพิ่ม 1 แถวต่อ INSERT
- ไม่ทำ index ที่ `role`: การอ่านรายการดิบตามบทบาทไล่ตาม PK ได้ และอ่านประมาณ 100 แถวต่อหน้า 50 แถว โควตาอ่านมีมากกว่าโควตาเขียน 50 เท่า จึงไม่คุ้มที่จะเขียนเพิ่มทุกคำตอบ
- `usage.day` และ `summary.k` เป็น INTEGER PK จึงไม่มี index แยก
- **ต้นทุนต่อ 1 คำตอบ = เขียน 3 แถว** (row + index cid + usage)
- `responses` เพิ่มข้อมูลอย่างเดียว ไม่มี UPDATE หรือ DELETE และ `summary` ถูก UPDATE 1 แถวต่อการเปิดแอดมินที่มีข้อมูลใหม่

**ทางเลือกเสริม: รวมหลายคำตอบเป็นหนึ่งแถว (ไม่เลือก)**
- ข้อดี: ลดจำนวนแถวที่เขียนได้ประมาณ N เท่า
- ข้อเสีย: ต้องพักข้อมูลไว้ที่อื่นก่อน (KV เขียนได้ 1,000 ครั้ง/วัน, Queue เก็บได้ 24 ชม.) ซึ่งเพิ่มโอกาสข้อมูลหาย, กรองตาม role ยากขึ้น, ดึงทีละคำตอบหรือกันซ้ำด้วย cid ไม่ได้ และที่ปริมาณนี้ใช้โควตาเขียนแค่ 0.16% จึงไม่จำเป็น

## 9. โควตา, ทางสำรอง Google Sheets และการซิงก์

### 9.1 การนับ
- ทุก query บวก `meta.rows_written` และ `meta.rows_read` เข้าตัวแปรของคำขอ แล้วปิดท้ายด้วย
  `INSERT INTO usage(day,rw,rr,n) VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET rw=rw+excluded.rw, rr=rr+excluded.rr, n=n+excluded.n RETURNING rw, rr`
  โดยบวก 1 สำหรับการเขียนของ UPSERT เองด้วย
- เก็บค่าที่ RETURNING ได้ไว้ในหน่วยความจำของ isolate (`{day, rw, rr}`) เพื่อตัดสินเกณฑ์ 80% ในคำขอถัดไป ถ้าเป็น isolate ใหม่ที่ยังไม่รู้ยอดจะบันทึกลง D1 ไปก่อน และถ้า D1 error ก็ยังมีทางสำรอง
- คำขอที่ถูกปฏิเสธก่อนถึง D1 จะไม่ถูกนับ เพื่อไม่ให้บอตทำให้ D1 ถูกเขียน
- **ข้อจำกัด:** นับได้เฉพาะ Worker นี้ ถ้ามีการใช้ D1 จากที่อื่นในบัญชี ให้ดูยอดจริงในแดชบอร์ด (หัวข้อ 11.3)

### 9.2 Apps Script (`tools/apps-script/Code.gs`)
- **Script Properties:** `SHEETS_TOKEN`, `IMPORT_TOKEN`, `TURNSTILE_SECRET`, `WORKER_URL`, `ALLOWED_HOSTNAME`
- **Sheet `pending`** มีคอลัมน์: `received` (ISO), `cid`, `role`, `data` (JSON), `via` (`worker`|`browser`), `synced` (ISO หรือว่าง)
- **`doPost(e)`:** อ่าน `e.postData.contents` (Apps Script อ่าน header ของคำขอไม่ได้ จึงส่ง token มาใน body)
  - `auth === 'worker'` → ตรวจ `key === SHEETS_TOKEN`
  - `auth === 'turnstile'` → เรียก siteverify ผ่าน `UrlFetchApp` แล้วตรวจ `success`, `action` และ `hostname`
  - ตรวจขนาดและ role แบบเบา → `LockService.getScriptLock()` → ถ้า `cid` มีอยู่แล้ว (`TextFinder`) ตอบ ok โดยไม่เพิ่มแถว → `appendRow` → `{ok:true}`
  - ถ้าเป็นแถวแรกของวัน (ตามเวลาไทย) จะส่งอีเมลด้วย `MailApp` ไปหาเจ้าของสคริปต์ว่า "มีคำตอบเข้าทางสำรอง"
- **`syncToWorker()`** ทำงานจาก trigger ทุกชั่วโมง: เลือกแถวที่ `synced` ว่าง ครั้งละไม่เกิน 40 แถว แล้ว `POST WORKER_URL/api/import` พร้อม `Authorization: Bearer IMPORT_TOKEN` จากนั้นเขียน `synced` ให้ cid ที่อยู่ใน `accepted` ถ้าได้ 503 หรือ error จะลองใหม่ชั่วโมงหน้า เมื่อโควตารีเซ็ตตอน 07:00 น. การซิงก์จะเริ่มสำเร็จเอง และแถวที่ซิงก์แล้วยังเก็บไว้ใน Sheet เป็นสำเนาอีกชุด
- **`/api/import`:** validate แต่ละรายการด้วย `validateData` ตัวเดียวกัน แล้ว `db.batch` INSERT ด้วย `src=1` และ `created` = เวลาที่ Sheets ได้รับ (ไม่เกิน 40 statement + usage 1 รวมแล้วต่ำกว่าเพดาน 50 query ต่อ invocation) ถ้ายอดของวันนั้นถึงเกณฑ์จะตอบ 503
- README อธิบายขั้นตอนติดตั้ง: สร้าง Sheet, วางโค้ด, ตั้ง Properties, Deploy เป็น Web app (Execute as: Me, Who has access: Anyone), สร้าง trigger รายชั่วโมง, เอา URL ไปใส่ `SHEETS_URL` และ `App.config.sheetsUrl`

## 10. หน้าแอดมิน

### 10.1 ยืนยันตัวตน
- `ADMIN_PASSWORD` เป็นวลีสุ่มยาวไม่น้อยกว่า 20 ตัวอักษร เทียบด้วย `crypto.subtle.timingSafeEqual` บน SHA-256 ของทั้งสองค่า (ให้ความยาวเท่ากัน)
- ลองรหัสได้ 5 ครั้งต่อ 60 วินาทีต่อ IP (ใช้ binding `RL` key `login:<ip>`)
- cookie `adm=<exp>.<base64url(HMAC-SHA256(SESSION_KEY, exp))>` แบบ `HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800` (บน localhost ใช้ `Secure` ได้ เพราะเบราว์เซอร์ถือว่า localhost เป็น secure context)
- ถ้าต้องการให้ทุก session หลุด ให้เปลี่ยน `SESSION_KEY`

### 10.2 cache ผลสรุปแบบเพิ่มทีละส่วน
`summary.data` เก็บค่าดิบที่ใช้รวมต่อได้:
```json
{"staff":{"n":0,"heat":{"A3":{"c":0,"s":0}},"body":{"คอ":0},"rank":{"ซ่อนสาย":0}},
 "donor":{"n":0,"heat":{}}}
```
`GET /api/admin/summary`:
1. อ่าน `summary` (1 แถว) และ `usage` ของวันนี้ (1 แถว)
2. `SELECT id, role, data FROM responses WHERE id > ?last_id ORDER BY id LIMIT 100`
3. รวมผลใหม่:
   - heat: ทุก zone ใน `map` บวก `c += 1`, `s += sev`
   - body: ทุก key ใน `msd` บวก +1 คน
   - rank: `answers.rank[0..2]` ได้ +3/+2/+1
   - `n` +1
4. ถ้ามีแถวใหม่ → `UPDATE summary SET last_id=?, data=?, updated=? WHERE k=1 AND last_id=?old` (กันการนับซ้ำเมื่อเปิดสองแท็บพร้อมกัน ถ้าแท็บหนึ่ง update ไม่สำเร็จก็ใช้ผลที่อ่านได้ไปแสดงตามปกติ)
5. ตอบ:
```json
{"updated":1730000000,"more":false,
 "usage":{"day":20261030,"rw":160,"rr":170,"n":50,"limits":{"rw":100000,"rr":5000000}},
 "staff":{"n":30,"heat":{"A3":{"count":9,"avg":4.2}},"body":{"คอ":9},"rank":[["ซ่อนสาย",13]]},
 "donor":{"n":20,"heat":{}}}
```
`heat.avg` ปัดทศนิยม 1 ตำแหน่ง และ `rank` เรียงจากคะแนนมากไปน้อย ซึ่งตรงกับรูปแบบที่ `bus-map` (summary), `body-map` (summary) และ `bars()` รับอยู่แล้ว จึงไม่ต้องแก้ component
- `more:true` เมื่อดึงได้ครบ 100 แถว หน้าแอดมินจะแสดง "มีข้อมูลใหม่อีก กดอัปเดต"
- `?rebuild=1` จะรีเซ็ต `last_id=0` และ `data` ก่อน แล้วรวมใหม่ทีละ 100 แถว ใช้เมื่อแก้สูตร
- ไม่มี polling และไม่มี auto-refresh จะคำนวณเฉพาะตอนโหลดหน้าและตอนกด [อัปเดต]

### 10.3 admin.html
- ฟอร์มรหัสผ่าน ถ้าได้ 401 ให้แสดงข้อความ
- หลังเข้าสู่ระบบ:
  - หัว "สรุปผล" + จำนวนคำตอบแต่ละบทบาท + เวลาที่อัปเดตล่าสุด (เวลาไทย)
  - แท็บ [เจ้าหน้าที่ | ผู้บริจาค]: แท็บเจ้าหน้าที่มี 3 การ์ด (heat, body, rank) แท็บผู้บริจาคมีการ์ด heat
  - การ์ด "โควตาวันนี้": rows written/read เทียบกับเพดาน คิดเป็น % และมีหมายเหตุว่านับเฉพาะ Worker นี้
  - ปุ่ม [อัปเดต] [ดาวน์โหลด CSV] [ออกจากระบบ]
- หัวข้อการ์ดใช้ข้อความเดิมจาก mock (`heatTitle`, `bodyTitle`, `rankTitle`) โดยย้ายไปไว้ที่ `App.data.admin` ส่วนข้อความเตือนว่าเป็นข้อมูลจำลองลบทิ้ง
- ถ้า `n = 0` หรือการ์ดไม่มีข้อมูล ให้แสดง "ยังไม่มีข้อมูล" และ `bars([])` ต้องไม่เรียก `Math.max()` กับรายการว่าง
- CSV: ดึงจาก `/api/admin/responses` ทีละ 200 แถว แล้วสร้างไฟล์ในเบราว์เซอร์ (มี UTF-8 BOM เพื่อให้ Excel อ่านภาษาไทยได้) คอลัมน์ได้แก่ `id, created(เวลาไทย), role, src, cid`, คอลัมน์ `answers.*` (array คั่นด้วย ` | `), `msd.<ส่วน>.y/w/s`, `map.<zone>.t/p/sev/n` และ `json` ดิบ

## 11. ระยะยาวและการดูแล

### 11.1 พื้นที่จัดเก็บ
วัดขนาดจริงจากคำตอบที่กรอกครบทุกช่องตอน implement ถ้าใช้ค่าสมมติ 5 KB ต่อคำตอบ:
- 3 เดือน (≈4,600 คำตอบ) ≈ 23 MB หรือ 4.6% ของ 500 MB
- ฐานเดียวรับได้ ≈100,000 คำตอบ

### 11.2 การส่งออกและการลบ
- ปุ่ม CSV ในหน้าแอดมิน และ `npx wrangler d1 export eve-survey --remote --output backup-YYYYMMDD.sql` ทุกเดือนและตอนปิดรับ
- **การลบนับเป็นการเขียน** ทุกแถวที่ลบ + แถว index ของ cid นับรวมใน rows written ระหว่างเปิดรับจึงไม่ลบ ถ้าจะเริ่มรอบใหม่ให้สร้างฐานข้อมูลใหม่ (แผนฟรีได้ 10 ฐาน) แทนการ DELETE
- ไม่ใช้ R2 เพราะต้องผ่าน checkout ก่อนเปิดใช้

### 11.3 ตรวจโควตาและแจ้งเตือน
เอกสาร `docs/operations.md` จะอธิบายวิธีดู Workers metrics, D1 metrics (rows read/written ต่อวัน) และ account usage ในแดชบอร์ด, วิธีตั้ง Notifications ที่แผนฟรีใช้ได้ (**ต้องตรวจตอน implement ว่าแผนฟรีมี alert ด้านโควตาหรือไม่**), อีเมลจาก Apps Script, การ์ดโควตาในหน้าแอดมิน และขั้นตอน deploy, หมุน secret และ backup

## 12. ตารางคำนวณโควตา (ค่าประมาณ วัดซ้ำตอน implement)

ต้นทุนต่อหน่วย:
- 1 คำตอบ = 1 คำขอ Worker, เขียน 3 แถว, อ่านประมาณ 2 แถว
- เปิดแอดมิน 1 ครั้ง = 1 คำขอ, อ่าน 2 + แถวใหม่ (≈5) แถว, เขียน 1 แถว
- login = 1 คำขอ

| ทรัพยากร | ใช้ต่อวัน (X=50, N=10, login 2) | % ของโควตาฟรี |
|---|---|---|
| Workers requests | 50 + 10 + 2 = 62 | 0.06% |
| D1 rows written | 150 + 10 = 160 | 0.16% |
| D1 rows read | 100 + 70 = 170 | <0.01% |
| D1 storage (สะสม 3 เดือน) | ≈23 MB | 4.6% ของ 500 MB |
| Apps Script | 0 ในสภาวะปกติ | — |
| พีก Y = 20 คน/ชม. | ไม่มีโควตารายชั่วโมง และ rate limit ต่อ IP คือ 5 ครั้ง/นาที | — |

**รับได้สูงสุดก่อนเต็ม**
- **ต่อวัน:** D1 rows written เต็มก่อน ที่ 100,000 / 3 ≈ **33,000 คำตอบ/วัน** (ถึงเกณฑ์ 80% ที่ ≈26,600 แล้วจึงส่งต่อไป Sheets) ส่วน Workers requests เต็มที่ ≈99,900 คำตอบ/วัน
- **ต่อเดือนและสะสม:** พื้นที่ 500 MB เต็มก่อน ที่ ≈**100,000 คำตอบรวม** ถ้าตอบ 50 คน/วันจะใช้ได้ ≈5.5 ปี
- **ความเสี่ยงจริงคือบอต:** บน workers.dev ทุกคำขอของบอตนับเป็นคำขอของ Worker ถ้ายิงเกิน 100,000 ครั้ง/วัน Worker จะหยุด และเบราว์เซอร์จะส่งตรงไปที่ Sheets แทน

## 13. การทดสอบและการตรวจสอบ

| ระดับ | เครื่องมือ | สิ่งที่ตรวจ |
|---|---|---|
| Unit (Worker) | vitest + `@cloudflare/vitest-pool-workers` (D1 ในเครื่อง) | validate (ค่าที่ถูกและผิดแต่ละชนิด), honeypot, Turnstile (mock fetch), กันซ้ำด้วย cid, เกณฑ์ 80% → forward, D1 error → forward, Sheets error → 503, `/api/import` (token, batch, ข้อมูลไม่ถูกต้อง), cookie (หมดอายุ, ลายเซ็นผิด), การรวมผลแบบเพิ่มทีละส่วน (heat avg, body count, rank 3/2/1, `more`, rebuild, กันนับซ้ำ) |
| Schema-sync | vitest (node vm โหลด `public/js/data/*.js`) | key, ชนิด และตัวเลือกใน `src/schema.js` ตรงกับไฟล์คำถาม |
| Visual regression | Playwright | ถ่ายภาพทุกส่วน A–F ทั้ง 2 บทบาท + หน้าแรก ก่อนขั้นที่ 1 แล้วเทียบหลังขั้นที่ 1–3 (กำหนดค่าคลาดเคลื่อนเล็กน้อยที่ยอมรับได้) |
| E2E | Playwright + `wrangler dev` + Turnstile test keys | ไม่มี console error หรือ 404 ทุกหน้า, ตอบครบ 2 บทบาท, `data` ตรงกับรูปแบบเดิม, เตือนจุด tmp ทั้ง 3 ปุ่ม, ร่างสำรองกู้คืนได้, จำลอง Worker 503 แล้วไปทางสำรอง (route mock ของ Apps Script), แอดมิน login/summary/CSV/empty state |
| น้ำหนักหน้า | Playwright (ดู transfer size) | ขนาดที่แต่ละหน้าโหลดก่อน/หลัง ใส่ในรายงาน |

## 14. ลำดับลงมือและ commit

แต่ละช่วงเป็น commit แยก ช่วงละอย่างน้อย 1 commit:

0. **ขั้นที่ 0:** commit งานค้าง (tracked 16 ไฟล์ตามที่เป็นอยู่) → เพิ่ม `.gitattributes` (`* text=auto eol=lf`, ไฟล์ภาพเป็น binary) + `git add --renormalize .` → เพิ่ม `.gitignore` → ถ่ายภาพ baseline สำหรับ visual regression
1. **ขั้นที่ 1:** ใส่ package.json, Tailwind CLI และ wrangler (เฉพาะ assets) → `git mv` ไฟล์เข้า `public/` → แยกหน้าและแยก questions.js → ตรวจด้วยการเทียบภาพ + console
2. **ขั้นที่ 2:** เอา mock ออก, thanks.html, เตือนจุด tmp, submit.js, admin.html + admin.js (ทดสอบด้วย API ที่ mock ใน Playwright)
3. **ขั้นที่ 3:** ทำตารางรายการที่จะลบพร้อมหลักฐาน grep → **รอผู้ใช้ยืนยัน** → ลบ → อัปเดต `2026-10-30-blood-mobile-survey-frontend-design.md` → ตรวจซ้ำ
4. **Backend:** migration, schema/validate (+ schema-sync test), submit, Turnstile, rate limit, usage, forward, import, auth, summary
5. **Apps Script** + README
6. **E2E ครบชุด** + วัดน้ำหนักหน้า + รายงาน + ตารางโควตาที่วัดจริง + `docs/operations.md`

การ deploy ขึ้น Cloudflare และติดตั้ง Apps Script ผู้ใช้ต้องทำเองด้วยบัญชีของตัวเอง (`wrangler login`, `wrangler d1 create`, `wrangler secret put`, `wrangler deploy`) ซึ่งเอกสารจะมีคำสั่งให้ครบ

## 15. สิ่งที่ส่งมอบ (เทียบกับ prompt)

| # | สิ่งที่ส่งมอบ | ที่อยู่ |
|---|---|---|
| 1 | รายงานงานเตรียม frontend (โครงสร้างก่อน/หลัง, ตารางรายการที่ลบ, น้ำหนักหน้าก่อน/หลัง) | `docs/reports/frontend-prep-report.md` |
| 2 | ตารางคำนวณโควตา (ใช้ค่าที่วัดจริง) | ใน `docs/operations.md` |
| 3 | SQL สร้างตารางและ index | `migrations/0001_init.sql` |
| 4 | โค้ด server + error handling เมื่อโควตาเต็ม | `src/` |
| 5 | โค้ดส่งคำตอบฝั่ง client | `public/js/survey/submit.js` |
| 6 | หน้าแอดมินที่อ่านจาก cache | `public/admin.html`, `public/js/admin/admin.js` |
| 7 | วิธีตรวจโควตาและตั้งการแจ้งเตือน | `docs/operations.md` |
| 8 | ข้อควรระวังและสมมติฐาน | หัวข้อ 16 + `docs/operations.md` |

## 16. สมมติฐาน ความเสี่ยง และสิ่งที่ต้องตรวจตอน implement

1. **Rate Limiting binding บนแผนฟรี:** เอกสารไม่ได้ระบุ ถ้าใช้ไม่ได้จะใช้ตัวนับใน `Map` ของ isolate แทน ซึ่งนับแยกตาม isolate จึงกันได้น้อยกว่า และจะบันทึกผลไว้ในรายงาน
2. **เบราว์เซอร์อ่านผลตอบกลับจาก Apps Script ได้หรือไม่:** ส่งเป็น `text/plain` แล้ว redirect ไป googleusercontent ถ้าอ่านไม่ได้ จะถือว่าไม่แน่ใจว่าสำเร็จ แล้วเก็บร่างไว้ต่อพร้อมแสดงปุ่มคัดลอก
3. **ตัวนับ usage** นับได้เฉพาะ Worker นี้ (หัวข้อ 9.1)
4. **workers.dev ไม่มี WAF:** ทุกคำขอของบอตนับเป็นคำขอของ Worker ถ้าในอนาคตย้ายไปโดเมนของตัวเองบน Cloudflare จะเพิ่มกฎ WAF ได้
5. **Turnstile ต้องใช้ JS และอินเทอร์เน็ต:** ถ้า widget โหลดไม่ได้ จะแสดงข้อความให้ลองใหม่ และยังมีปุ่มคัดลอกเป็นทางสุดท้าย
6. **class ที่สร้างตอนรันใน bus-map.js:** ต้องตรวจว่า Tailwind CLI สร้างครบ ถ้าไม่ครบใส่ใน safelist
7. **ขนาดคำตอบ 5 KB** เป็นค่าสมมติจนกว่าจะวัดจริง
8. **คำตอบชนิด number เก็บเป็น string** ตามพฤติกรรมเดิม (ไม่เปลี่ยนรูปแบบ JSON)
9. **ทุกข้อเป็นข้อไม่บังคับ** ตามพฤติกรรมเดิม client จะกันแค่กรณีไม่ได้ตอบเลย
10. **`backend-prompt.md` และไฟล์ที่ยังไม่อยู่ใน git** (`img/`, `Claude outputs/`) จะไม่ถูก commit ในขั้นที่ 0 และจะอยู่ในตารางขั้นที่ 3 (ยกเว้น backend-prompt.md ซึ่งปล่อยไว้นอก git ตามเดิม)
11. **`toast()` และ `#toast`** ไม่มีโค้ดใดเรียกใช้ จึงอยู่ในตารางขั้นที่ 3
12. **commit จากเครื่องมือของผม** ใช้ชื่อผู้เขียนเดียวกับ commit แรก (`plamolk`) ผ่าน `git -c` (ไม่แก้ git config) และต้องขอสิทธิ์ลบไฟล์ในโฟลเดอร์เพื่อให้ git ลบ lock file ของตัวเองได้
13. **ความเป็นส่วนตัว:** ไม่เก็บ IP หรือ User-Agent ข้อมูลใน Google Sheet อยู่ในบัญชี Google ของผู้ใช้
14. **เวลา:** `created` เก็บเป็น UTC epoch ส่วนหน้าแอดมินและ CSV แสดงเป็นเวลาไทย
