# รายงานงานเตรียม frontend (ฉบับร่าง — ส่วนรายการลบ)

## ตารางรายการที่จะลบ (รอผู้ใช้ยืนยัน)

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
