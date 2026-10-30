# รายงานงานเตรียม frontend

ทำตามแผน `docs/superpowers/plans/2026-10-30-blood-mobile-survey-backend.md` (Task 1–9) บน branch `feature/survey-backend`

## โครงสร้างไฟล์ก่อน/หลัง

| ก่อน (commit `508cec4`) | หลัง |
|---|---|
| `index.html` (SPA ทุกหน้าในไฟล์เดียว + Tailwind Play CDN) | `public/index.html` (หน้าแรก ไม่มี JS), `public/survey.html`, `public/thanks.html` (ไม่มี JS), `public/admin.html` |
| `css/styles.css` | `src/styles.css` (input ของ Tailwind CLI) → `public/css/app.css` (build ได้, ไม่อยู่ใน git) |
| `js/app.js`, `js/pages/survey.js` | `public/js/survey/survey.js` |
| `js/state.js` | `public/js/survey/state.js` (+ `cid`, `restore`, ปุ่ม "ไม่มี") |
| — | `public/js/survey/submit.js` (ตรวจคำตอบ, ส่ง, ทางสำรอง, ร่าง) |
| `js/components/ui.js` | `public/js/shared/ui.js` |
| `js/components/body-map.js`, `bus-map.js` | `public/js/components/` (ไม่แก้) |
| `js/data/questions.js` | `public/js/data/common.js` + `staff.js` + `donor.js` (ข้อความคำถามเหมือนเดิมทุกตัวอักษร ตรวจด้วย deep-equal) |
| `js/data/bus-layout.js`, `body-regions.js` | `public/js/data/` (ไม่แก้) |
| `js/pages/intro.js` | อยู่ใน `public/index.html` |
| `js/pages/thanks.js` (pilot: JSON + ปุ่มคัดลอก) | `public/thanks.html` (ไม่มี JSON / ปุ่มคัดลอก) |
| `js/pages/summary.js`, `js/data/mock-summary.js` | `public/js/admin/admin.js` + `boot.js` (ข้อมูลจริงจาก API) |
| — | `public/js/config.js`, `tailwind.config.js`, `wrangler.jsonc`, `package.json` |
| — | backend: `src/`, `migrations/0001_init.sql`, `tools/apps-script/` |
| — | ทดสอบ: `tests/unit`, `tests/worker`, `tests/e2e`, `tests/visual` |


## ตารางรายการที่ลบ (ผู้ใช้อนุมัติครบ 5 รายการเมื่อ 2026-10-31)

| # | รายการ | ชนิด | หลักฐาน (คำสั่ง → ผล) | เหตุผล |
|---|---|---|---|---|
| 1 | `.claude_write_test` | ไฟล์ (อยู่ใน git, 0 bytes) | `git grep -n ".claude_write_test" -- . ':!docs' ':!backend-prompt.md'` → 0 บรรทัด | ไฟล์ทดสอบสิทธิ์เขียนของเครื่องมือ ไม่มีโค้ดใดใช้ |
| 2 | `Claude outputs/svg1.png` (+ โฟลเดอร์ที่ว่างหลังลบ) | ไฟล์ (อยู่ใน git, 290,900 bytes) | `git grep -n "svg1.png"` (ยกเว้น docs/prompt) → 0 บรรทัด | ภาพจากเครื่องมือ ไม่มีหน้าใดอ้างถึง |
| 3 | `img/bus-map.jpg` (+ โฟลเดอร์ `img/`) | ไฟล์ (อยู่ใน git, 195,065 bytes) | `git grep -n "bus-map.jpg"` (ยกเว้น docs/prompt) → 0 บรรทัด | ผังรถวาดเป็น SVG ใน `bus-map.js` แล้ว และผู้ใช้เลือก "ลบทิ้ง" ไว้ตอนออกแบบ |
| 4 | ฟังก์ชัน `toast()` + ตัวแปร `toastTimer` ใน `public/js/survey/survey.js` | โค้ด | `git grep -n "toast" public` → มีแค่บรรทัดที่ประกาศฟังก์ชันและ `<div id="toast">` ไม่มีที่เรียก `toast(` | โค้ดตาย ไม่เคยถูกเรียก |
| 5 | `<div id="toast">…</div>` ใน `public/survey.html` | HTML | ข้อ 4 — ตัวเดียวที่อ้าง `#toast` คือ `toast()` ที่ไม่ถูกเรียก | ใช้คู่กับข้อ 4 เท่านั้น |

**ตรวจแล้วแต่ไม่ลบ**
- **`.replace(...)` แก้ class ปุ่ม** (หน้า intro/summary เดิม): หายไปแล้วพร้อมการแยกหน้า (Task 5) และการลบ summary (Task 8) ส่วน `.replace` ที่เหลือ (escape HTML, quote CSV, ใส่จำนวนในข้อความ, `location.replace`) เป็นของที่ใช้จริง
- **selector ใน `src/styles.css`** ทุกตัว (`.hit`, `.shape`, `.bus-svg`, `.lift`, `.frame`, `.ring`, `.is-open`, `.msd-select`, `@keyframes bus-ring`) ยังถูกใช้ใน `bus-map.js`/`body-map.js`
- **class ของ Tailwind ที่ไม่ใช้:** Tailwind CLI สร้างเฉพาะ class ที่เจอในไฟล์อยู่แล้ว `public/css/app.css` = 13,201 bytes (Play CDN เดิม ≈ 407 KB ก่อนบีบอัด)
- **key ใน `App.data.submit`** ที่ grep แบบ `.key` ไม่เจอ (`required`, `rankAll`, `number`, `tooLong`, `tooLarge`, `needMsd`, `needMap`, `invalid`, `unavailable`, `noTurnstile`): ถูกเรียกผ่านชื่อเป็นข้อความ เช่น `problem(step, key, 'required')` และ `t[code]` จึงยังใช้อยู่
- **`App.ui.attrs`:** ใช้ภายใน `ui.js` เอง

## น้ำหนักที่แต่ละหน้าโหลด

วัดด้วย `tests/visual/weight.mjs` (Chromium, ไม่มี cache) ก่อน = `docs/reports/weights-before.json`, หลัง = `docs/reports/weights-after.json`

| หน้า | คำขอ | bytes (ไม่บีบอัด) | bytes ที่ส่งจริง (encoded) |
|---|---|---|---|
| **ก่อน** `index.html` (SPA โหลดทุกอย่างรวม Play CDN 407 KB) | 16 | 477,916 | 197,028 |
| **หลัง** `index.html` | 3 | 14,883 | 4,500 |
| **หลัง** `survey.html?role=staff` | 16 | 175,362 (ของเรา 88,630 + Turnstile 86,732) | 57,388 |
| **หลัง** `survey.html?role=donor` | 14 | 166,403 (ของเรา 79,671 + Turnstile 86,732) | 54,247 |
| **หลัง** `thanks.html` | 3 | 13,640 | 4,129 |
| **หลัง** `admin.html` | 11 | 55,430 | 19,111 |

- หน้าแรกลดจาก 197 KB เหลือ 4.5 KB ที่ส่งจริง (−97.7%) และไม่มี JavaScript
- หน้าแบบสอบถามลดจาก 197 KB เป็น 54–57 KB ซึ่งครึ่งหนึ่งเป็นสคริปต์ Turnstile (ใช้กันบอต)
- ผู้บริจาคไม่โหลด `staff.js`, `body-map.js`, `body-regions.js` (มี e2e ตรวจ)
- CSS: Play CDN ประมาณ 407 KB ก่อนบีบอัด → `app.css` 13,201 bytes

## ขนาดคำตอบที่วัดจริง (`docs/reports/measurements.json`)

| คำตอบ | bytes |
|---|---|
| เจ้าหน้าที่ตอบครบทุกช่อง + ข้อความยาวทุกข้อ + ทุกจุดบนร่างกายและผัง (กรณีมากที่สุด) | 11,359 |
| ผู้บริจาคตอบครบทุกช่อง + ทุกจุดบนผัง | 5,373 |
| เจ้าหน้าที่แบบทั่วไปที่ใช้ใน e2e | 1,030 |
| ผู้บริจาคแบบทั่วไปที่ใช้ใน e2e | 487 |
