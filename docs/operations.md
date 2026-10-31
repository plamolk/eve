# คู่มือดูแลระบบ — แบบสอบถามรถรับบริจาคโลหิต

ระบบ: หน้าเว็บ (Workers Static Assets) + Worker `/api/*` (Hono) + D1 + Turnstile + Google Sheets ทางสำรอง
ออกแบบ: `docs/superpowers/specs/2026-10-30-blood-mobile-survey-backend-design.md`

## 1. รันในเครื่อง

ต้องมี Node.js 22 ขึ้นไป

```
npm install
npm run dev                              # http://localhost:8787  (build CSS ให้เองก่อนเริ่ม)
```

- ก่อนเริ่ม `npm run dev` จะสร้างตารางในฐานข้อมูลในเครื่องให้ (`wrangler d1 migrations apply --local`) และสร้าง `.dev.vars` จาก `.dev.vars.example` ให้เองถ้ายังไม่มี (ถ้าไม่มีไฟล์นี้ Worker จะไม่มี Turnstile secret และทุกคำตอบจะได้ "ยืนยันตัวตนไม่สำเร็จ")
- ในเครื่องจะใช้ Turnstile test key ให้อัตโนมัติ (sitekey `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`)
- หน้าแอดมินในเครื่องใช้รหัสจาก `ADMIN_PASSWORD` ใน `.dev.vars`
- ห้ามเปิดไฟล์ HTML ด้วยการดับเบิลคลิก ต้องเปิดผ่าน `npm run dev`

**ทดสอบ**

| คำสั่ง | สิ่งที่ตรวจ |
|---|---|
| `npm run test:unit` | ตรวจคำตอบฝั่ง client/server, schema ตรงกับไฟล์คำถาม, สรุปผล, cookie, Apps Script, หน้าแอดมิน |
| `npm run test:worker` | API กับ D1 ในเครื่อง |
| `npm run e2e` | เบราว์เซอร์จริงกับ Worker และ D1 ในเครื่อง (เริ่ม server ให้เอง ต้องมี `.dev.vars`) |
| `BASE_URL=http://localhost:8787 npm run visual` | เทียบภาพหน้าจอกับภาพต้นแบบ (ภาพต้นแบบอยู่ใน `.gitignore` สร้างใหม่ได้ด้วย `--update-snapshots`) |

ถ้าเครื่องยังไม่มี Chromium ของ Playwright: `npx playwright install chromium`

## 2. Deploy ครั้งแรก

ทุกขั้นใช้ของฟรี ไม่ต้องใส่บัตรเครดิต

1. **Login:** `npx wrangler login` (เปิดเบราว์เซอร์ให้ login บัญชี Cloudflare)
2. **สร้างฐานข้อมูล:** `npx wrangler d1 create eve-survey` แล้วเอา `database_id` ที่ได้ไปแทน `00000000-0000-0000-0000-000000000000` ใน `wrangler.jsonc`
3. **สร้างตาราง:** `npx wrangler d1 migrations apply eve-survey --remote`
4. **Turnstile:** แดชบอร์ด Cloudflare → Turnstile → Add widget
   - Hostname: `eve-survey.<ชื่อบัญชี>.workers.dev`
   - Widget mode: Managed
   - เอา **Site key** ไปแทน `REPLACE_WITH_SITE_KEY` ใน `public/js/config.js`
   - ใส่ hostname แทน `REPLACE_WITH_HOSTNAME` ใน `ALLOWED_HOSTS` ของ `wrangler.jsonc` (ถ้าลืม Worker จะปฏิเสธทุกคำตอบและเขียน error ใน log)
5. **Google Sheets ทางสำรอง:** ทำตาม `tools/apps-script/README.md` แล้วเอา Web app URL ไปแทน `REPLACE_WITH_APPS_SCRIPT_URL` ทั้งใน `wrangler.jsonc` (`SHEETS_URL`) และ `public/js/config.js`
6. **Secrets:** รันทีละคำสั่ง แล้วพิมพ์ค่าเมื่อระบบถาม
   ```
   npx wrangler secret put TURNSTILE_SECRET   # Secret key ของ widget ข้อ 4
   npx wrangler secret put ADMIN_PASSWORD     # วลียาว 20 ตัวอักษรขึ้นไป
   npx wrangler secret put SESSION_KEY        # ข้อความสุ่มยาว
   npx wrangler secret put SHEETS_TOKEN       # ค่าเดียวกับใน Apps Script
   npx wrangler secret put IMPORT_TOKEN       # ค่าเดียวกับใน Apps Script
   ```
   สุ่มข้อความยาว: `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`
7. **Deploy:** `npx wrangler deploy` (คำสั่งนี้ build CSS ให้เองก่อน) จะได้ URL `https://eve-survey.<ชื่อบัญชี>.workers.dev`
8. **ตรวจหลัง deploy:**
   - ตอบแบบสอบถามจากมือถือทั้ง 2 บทบาท
   - เข้า `/admin.html` แล้วดูว่าจำนวนเพิ่มขึ้น
   - ลอง login ผิดรหัส 6 ครั้งติดกัน ต้องเจอข้อความ "ลองหลายครั้งเกินไป"

**ตรวจก่อนใช้งานจริง:** ไม่มีคำว่า `REPLACE_WITH` หรือ `0000-0000` เหลืออยู่ (`grep -rn "REPLACE_WITH\|0000-0000" public wrangler.jsonc` ต้องไม่มีผลลัพธ์)

**ลิงก์ที่แชร์**

| ใคร | ลิงก์ |
|---|---|
| ผู้ตอบทั่วไป | `/` (เลือกบทบาทเอง) |
| เจ้าหน้าที่ | `/survey.html?role=staff` |
| ผู้บริจาค (ทำ QR ติดในรถได้) | `/survey.html?role=donor` |
| ทีมวิจัย | `/admin.html` + รหัสผ่าน (ส่งแบบส่วนตัว) |

**อัปเดตภายหลัง:** รัน `npx wrangler deploy` ซ้ำได้เลย ข้อมูลใน D1 ไม่หาย ถ้าแก้โครงตาราง ให้เพิ่มไฟล์ migration ใหม่ ห้ามแก้ไฟล์เดิม

## 3. ตารางคำนวณโควตา

**โควตาฟรีที่ใช้ (ตรวจ 2026-10-30)**

| บริการ | โควตา | แหล่งที่มา |
|---|---|---|
| Workers | 100,000 คำขอ/วัน (static assets ฟรีไม่จำกัด) | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| D1 | อ่าน 5,000,000 แถว/วัน, เขียน 100,000 แถว/วัน, ฐานละ 500 MB | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |

ทุกโควตารีเซ็ตเวลา 00:00 UTC (07:00 น. เวลาไทย) และตั้งแต่ 2026-09-01 D1 แผนฟรีบังคับใช้โควตารายวันจริง ([changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/))

**ต้นทุนต่อหน่วยที่วัดจริง** (`docs/reports/measurements.json`, e2e กับ D1 ในเครื่อง)

| การกระทำ | คำขอ Worker | แถวที่เขียน | แถวที่อ่าน |
|---|---|---|---|
| ส่ง 1 คำตอบ | 1 | 3 (แถวคำตอบ + index ของ `cid` + ตาราง `usage`) | 0 |
| เปิดหน้าแอดมิน 1 ครั้ง | 1 | 2 (cache + usage) | 4 + จำนวนคำตอบใหม่ (ไม่เกิน 100) |
| login | 1 | 0 | 0 |
| ดาวน์โหลด CSV | 1 ต่อ 200 แถว | 1 ต่อหน้า | จำนวนแถวในหน้านั้น |

**การใช้ต่อวันที่ค่าที่ตกลงไว้** (X = 50 คน/วัน, Y = 20 คน/ชม., N = เปิดแอดมิน 10 ครั้ง/วัน, login 2 ครั้ง/วัน, เปิดรับ 3 เดือน)

| ทรัพยากร | สูตร | ต่อวัน | % ของโควตา |
|---|---|---|---|
| คำขอ Worker | 50 + 10 + 2 | 62 | 0.06% |
| D1 แถวที่เขียน | 50×3 + 10×2 | 170 | 0.17% |
| D1 แถวที่อ่าน | 10×(4 + 5 คำตอบใหม่) | 90 | 0.002% |
| พีก Y = 20 คน/ชม. | ไม่มีโควตารายชั่วโมง ส่วน rate limit 5 ครั้ง/นาที/IP มากกว่าที่ใช้จริง | — | — |

**พื้นที่ D1 (สะสม 3 เดือน ≈ 4,600 คำตอบ)**

| ขนาดคำตอบ | ใช้พื้นที่ | % ของ 500 MB |
|---|---|---|
| แบบทั่วไป ≈ 0.5–1 KB | ≈ 5 MB | 1% |
| มากที่สุดที่วัดได้ 11.4 KB | ≈ 52 MB | 10.5% |

**รับได้สูงสุดก่อนเต็ม**

| ช่วงเวลา | สิ่งที่เต็มก่อน (คอขวด) | จำนวน |
|---|---|---|
| ต่อวัน | **D1 แถวที่เขียน**: 100,000 / 3 | ≈ 33,300 คำตอบ/วัน (ที่ 80% ≈ 26,600 ระบบจะเริ่มส่งไป Sheets) |
| ต่อวัน (ถ้าส่งไป Sheets ต่อ) | คำขอ Worker 100,000 | ≈ 99,900 คำตอบ/วัน |
| ต่อเดือน / สะสม | **พื้นที่ 500 MB** | ≈ 44,000 คำตอบ ถ้าทุกคนตอบยาวสุด (11.4 KB) หรือ > 400,000 ถ้าคำตอบทั่วไป ≈ 1 KB |

ที่ 50 คน/วัน ใช้โควตาไม่ถึง 0.2% ต่อวัน และพื้นที่พอสำหรับหลายปี ความเสี่ยงจริงคือบอตยิงคำขอจนครบ 100,000 ครั้ง/วัน ถ้าเกิดขึ้น Worker จะหยุด และเบราว์เซอร์จะส่งคำตอบไป Google Sheets แทน

## 4. ตรวจโควตาและการแจ้งเตือน

**ดูยอดใช้งาน**
- **หน้าแอดมิน:** การ์ด "โควตาวันนี้" แสดงแถวที่เขียน/อ่านของวันนี้ (นับเฉพาะ Worker นี้)
- **แดชบอร์ด Cloudflare:**
  - Workers & Pages → `eve-survey` → Metrics: จำนวนคำขอและ error ต่อวัน
  - Storage & databases → D1 → `eve-survey` → Metrics: rows read / rows written / ขนาดฐาน (ยอดจริงทั้งบัญชี)
  - ชื่อเมนูอาจเปลี่ยนตามเวอร์ชันแดชบอร์ด
- **คำสั่ง** (ใส่ LIMIT เสมอ เพราะการอ่านนับรวมในโควตา):
  ```
  npx wrangler d1 execute eve-survey --remote --command "SELECT * FROM usage ORDER BY day DESC LIMIT 7"
  npx wrangler d1 execute eve-survey --remote --command "SELECT id, role, src, datetime(created,'unixepoch','+7 hours') AS เวลา FROM responses ORDER BY id DESC LIMIT 10"
  npx wrangler tail eve-survey     # log สดของ Worker
  ```
  อย่าใช้ `SELECT COUNT(*) FROM responses` เพราะจะอ่านทุกแถว ให้ดูจำนวนจากหน้าแอดมินแทน

**การแจ้งเตือนที่ใช้ได้บนแผนฟรี**
1. **อีเมลจาก Apps Script:** ส่งเมื่อมีคำตอบเข้า Google Sheets ทางสำรองครั้งแรกของวัน แปลว่าโควตาถึง 80% หรือ Worker มีปัญหา
2. **อีเมลจาก Cloudflare เมื่อ D1 ถึงโควตารายวัน:** ตามที่ระบุใน [changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
3. **Budget alerts ของ Cloudflare** ใช้ได้เฉพาะบัญชี Pay-as-you-go ([Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)) จึงไม่ใช้

**เมื่อได้อีเมลแจ้งเตือน**
1. ดู Metrics ว่าคำขอพุ่งขึ้นผิดปกติ (บอต) หรือไม่
2. ดูแท็บ `pending` ใน Sheet ว่ามีคำตอบรอซิงก์กี่แถว (คอลัมน์ `synced` ว่าง)
3. หลัง 07:00 น. trigger รายชั่วโมงจะซิงก์กลับเอง ตรวจว่าคอลัมน์ `synced` มีเวลาเติมเข้ามา

## 5. Backup, ส่งออก, หมุน secret

- **CSV:** หน้าแอดมิน → "ดาวน์โหลด CSV" (เปิดใน Excel ได้ มีทั้งคอลัมน์ที่แตกแล้วและ JSON ดิบ)
- **Backup ทั้งฐาน:** ทำทุกเดือนและตอนปิดรับ
  ```
  npx wrangler d1 export eve-survey --remote --output backup-YYYYMMDD.sql
  ```
- **การลบนับเป็นการเขียน:** ทุกแถวที่ลบ + แถว index ของ `cid` นับรวมใน rows written ระหว่างเปิดรับจึงไม่ควรลบ ถ้าจะเริ่มรอบใหม่ ให้สร้างฐานข้อมูลใหม่ (แผนฟรีได้ 10 ฐาน) แทนการ DELETE
- **ไม่ใช้ R2** เพราะต้องผ่าน checkout ของ R2 ก่อนเปิดใช้ ([R2 get started](https://developers.cloudflare.com/r2/get-started/))
- **เปลี่ยนรหัสแอดมิน:** `npx wrangler secret put ADMIN_PASSWORD` ถ้าต้องการให้ทุก session หลุดทันที ให้เปลี่ยน `SESSION_KEY` ด้วย
- **เปลี่ยน `SHEETS_TOKEN` / `IMPORT_TOKEN`:** ต้องแก้ทั้งใน Worker (secret) และ Script Properties ของ Apps Script ให้ตรงกัน

## 6. ข้อควรระวังและสมมติฐาน

1. **Rate Limiting binding:** เอกสารไม่ได้ระบุว่าแผนฟรีใช้ได้หรือไม่ ([docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)) ในเครื่องใช้ได้และมี test รองรับ ถ้าบัญชีจริงใช้ไม่ได้ (deploy error หรือไม่มี binding) โค้ดจะใช้ตัวนับในหน่วยความจำของ isolate แทน ซึ่งกันได้น้อยกว่า ควรตรวจหลัง deploy ด้วยการ login ผิด 6 ครั้ง
2. **เบราว์เซอร์อ่านผลจาก Apps Script:** ทดสอบได้แค่กับ server จำลองใน e2e ต้องลองกับ Apps Script จริงหลังติดตั้ง (README ข้อ 4) ถ้าอ่านผลไม่ได้ ผู้ตอบจะเห็นข้อความ "ขัดข้องชั่วคราว" และร่างคำตอบยังอยู่ (ไม่หาย แต่ต้องกดส่งอีกครั้ง)
3. **ตัวนับ usage ในตาราง `usage`:** นับได้เฉพาะ Worker นี้ ถ้ามีการใช้ D1 จากที่อื่นในบัญชี ยอดจริงจะสูงกว่า ให้ดูยอดจริงในแดชบอร์ด
4. **workers.dev ไม่มี WAF:** ทุกคำขอของบอตนับเป็นคำขอของ Worker แต่จะไม่ทำให้ D1 ถูกเขียน (ตรวจ honeypot, rate limit และ Turnstile ก่อนแตะ D1) ถ้าในอนาคตย้ายไปโดเมนของตัวเองบน Cloudflare จะเพิ่มกฎ WAF ได้
5. **Turnstile ต้องใช้ JavaScript และอินเทอร์เน็ต:** ถ้าโหลดไม่ได้ ผู้ตอบจะเห็นข้อความให้ลองใหม่ และร่างคำตอบเก็บไว้ในเบราว์เซอร์
6. **บังคับกรอกทุกข้อ** ยกเว้นช่วงส่วนสูง (`ht`) และหมายเหตุของจุดบนผัง ข้อความคำถามเดิมไม่เปลี่ยน แต่คำอธิบายส่วน D ยังเขียนว่า "หากไม่พบปัญหาข้ามได้เลย" ขณะที่ตอนนี้ต้องกดปุ่ม "ไม่พบปัญหา" ถ้าต้องการให้ข้อความตรงกัน ต้องแก้ `MAP_NOTE` ใน `public/js/data/common.js` (ผู้ใช้ต้องอนุมัติเพราะเป็นข้อความเดิม)
7. **รูปแบบ JSON:** เหมือนเดิม และเพิ่มแค่ `answers.noMsd` / `answers.noMap` = `true` ส่วนคำตอบชนิดตัวเลขยังเก็บเป็นข้อความ (เช่น `"5"`) ตามพฤติกรรมเดิม
8. **ความเป็นส่วนตัว:** ไม่เก็บ IP หรือ User-Agent ข้อมูลใน Google Sheet อยู่ในบัญชี Google ของผู้ดูแล
9. **เวลา:** `created` เก็บเป็นวินาที UTC ส่วนหน้าแอดมินและ CSV แสดงเป็นเวลาไทย
