# ติดตั้ง Google Sheets ทางสำรอง (ประมาณ 15 นาที, ฟรี, ใช้บัญชี Gmail)

ทางสำรองนี้รับคำตอบเมื่อโควตา D1 ใกล้เต็ม (ถึง 80%) หรือ Worker ใช้ไม่ได้ แล้วซิงก์กลับเข้า D1 เองทุกชั่วโมง

## 1. สร้าง Sheet
1. ไปที่ sheets.google.com แล้วสร้างสเปรดชีตใหม่ เช่น ชื่อ `eve-survey-pending`
2. เปลี่ยนชื่อแท็บแรกเป็น `pending`
3. พิมพ์หัวคอลัมน์ในแถว 1 ตั้งแต่ A1 ถึง F1: `received` `cid` `role` `data` `via` `synced`

## 2. วางโค้ด
1. ในสเปรดชีต เลือกเมนู **Extensions → Apps Script**
2. ลบโค้ดเดิมใน `Code.gs` ออก แล้ววางเนื้อหาจากไฟล์ `tools/apps-script/Code.gs` ทั้งไฟล์ จากนั้นกด Save

## 3. ตั้ง Script Properties
**Project Settings (รูปเฟือง) → Script Properties → Add script property**

| Property | ค่า |
|---|---|
| `SHEETS_TOKEN` | สุ่มข้อความยาว ใช้ค่าเดียวกับ `wrangler secret put SHEETS_TOKEN` |
| `IMPORT_TOKEN` | สุ่มข้อความยาวอีกชุด ใช้ค่าเดียวกับ `wrangler secret put IMPORT_TOKEN` |
| `TURNSTILE_SECRET` | secret key ของ Turnstile widget (ค่าเดียวกับใน Worker) |
| `WORKER_URL` | `https://eve-survey.<ชื่อบัญชี>.workers.dev` (ไม่มี `/` ท้าย) |
| `ALLOWED_HOSTNAME` | `eve-survey.<ชื่อบัญชี>.workers.dev` |

สุ่มข้อความยาวได้ด้วยคำสั่ง `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`

## 4. Deploy เป็น Web app
1. กด **Deploy → New deployment →** รูปเฟือง **→ Web app**
2. ตั้ง **Execute as:** `Me` และ **Who has access:** `Anyone`
3. กด Deploy แล้วอนุญาตสิทธิ์ (Google จะเตือนว่าแอปยังไม่ผ่านการตรวจ ให้กด Advanced → Go to …)
4. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`) แล้วใส่ไว้ 2 ที่:
   - `wrangler.jsonc` → `vars.SHEETS_URL`
   - `public/js/config.js` → ค่า `sheetsUrl` ที่ไม่ใช่ localhost

## 5. ตั้ง trigger ซิงก์ทุกชั่วโมง
**Triggers (รูปนาฬิกา) → Add Trigger**
- Function: `syncToWorker`
- Event source: `Time-driven`
- Type: `Hour timer`, ทุก 1 ชั่วโมง

## หมายเหตุ
- เมื่อมีคำตอบเข้าทางสำรองครั้งแรกของวัน (เวลาไทย) สคริปต์จะส่งอีเมลหาเจ้าของสคริปต์
- แถวที่ซิงก์แล้วจะมีเวลาในคอลัมน์ `synced` และไม่ถูกลบ ใช้เป็นสำเนาสำรองได้
- แถวที่ฐานข้อมูลไม่รับจะมีคำว่า `rejected:<ช่องที่ผิด>` ในคอลัมน์ `synced` (หรือ `rejected:parse` ถ้าอ่านข้อมูลไม่ได้) และจะไม่ถูกส่งซ้ำ ควรเปิดดูแถวเหล่านี้เป็นระยะ
- ถ้าแก้ `Code.gs` ต้องกด **Deploy → Manage deployments → Edit → New version** ทุกครั้ง URL จะยังเป็นค่าเดิม
- โควตา Apps Script ของบัญชี Gmail ฟรีมีให้ใช้พอ: URL Fetch 20,000 ครั้ง/วัน, trigger รวม 90 นาที/วัน ([Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas))
