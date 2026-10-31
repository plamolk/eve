# แบบสอบถามรถรับบริจาคโลหิตเคลื่อนที่ — Frontend Design

## Goal
Recreate the web questionnaire shown in the reference clip (`814988755_914089.mp4`), screen for screen, using HTML + Tailwind CSS + vanilla JavaScript, and collect real answers through a free-tier Cloudflare backend.
Backend, quota handling and admin page: see `docs/superpowers/specs/2026-10-30-blood-mobile-survey-backend-design.md`.

## Decisions
- Static files split by responsibility under `public/`, served by Workers Static Assets. Classic `<script defer>` tags under one `App` namespace, no framework.
- Tailwind CLI 3.4.17 builds `public/css/app.css` (config in `tailwind.config.js`, input `src/styles.css`). Run through `npm run dev` (http://localhost:8787); pages are not meant to be opened by double-click.
- Both roles are open: staff (sections A–F) and donor (sections A–E).
- Visual style copied from the clip (colors sampled from frames).
- No mock data. The thanks page shows no JSON and has no copy button.
- Every question is required except the ones whose label says "ไม่บังคับ" (`ht`, and the note of a bus-map point). Checked when pressing "ถัดไป" in every section.

## Pages
1. `index.html`: intro text + role links to `survey.html?role=staff|donor` (no JavaScript).
2. `survey.html`: sections A–F in one page with a progress bar (progress = section index / number of sections). Loads only the question file of its role. Missing answers get a red frame and "กรุณาตอบข้อนี้". Part C has "ไม่มีอาการปวดเมื่อย", part D has "ไม่พบปัญหา". Unsaved map points are flagged when leaving part D. "ส่งคำตอบ" posts to `/api/submit`, falls back to Google Sheets, and keeps a draft in the browser only while sending fails.
3. `thanks.html`: thank-you text + "เริ่มใหม่" (no JavaScript).
4. `admin.html`: password login, then 4 tabs (spec: `docs/superpowers/specs/2026-10-31-admin-dashboard-design.md`): ภาพรวม (6 stat tiles, daily stacked chart, bus-map heatmap, body-map counts, ranking bars, quota card), คำถามทั้งหมด (every question summarised per role), ความคิดเห็น (all long-text answers and map notes, search, load more), รายคน (newest-first list and full answers per person). CSV download; "ยังไม่มีข้อมูล" when empty.

## Output JSON
`{"role":"staff","answers":{...},"msd":{<region>:{"y","w","s"}},"map":{<zoneId>:{"t":[],"p":[],"sev":3,"n":""}}}`
Only answered fields are included. `answers.noMsd` / `answers.noMap` = `true` when the respondent pressed the "none" button. `tmp:1` (a bus-map point edited but not saved with "บันทึกจุดนี้") never leaves the browser: the respondent must save or discard it first.
Sent as `{"v":1,"cid":"<uuid>","token":"<turnstile>","hp":"","data":<JSON above>}`.

## Files
- `public/js/data/common.js` shared scales, map note, zone form, nav, submit messages; `staff.js` / `donor.js` question sets; `bus-layout.js`, `body-regions.js`
- `public/js/shared/ui.js` HTML-string UI helpers
- `public/js/components/bus-map.js`, `body-map.js` (input + summary modes)
- `public/js/survey/state.js` answers + JSON, `submit.js` checks / sending / draft, `survey.js` render + event delegation + role loader
- `public/js/admin/admin.js` admin shell (texts, login, tabs, state, CSV), `stats.js` number helpers, `api.js` API client, `overview.js` / `questions.js` / `comments.js` / `people.js` one view per tab, `boot.js` starts it
- `public/js/config.js` Turnstile sitekey and Apps Script URL

## Known uncertainties (clip is 830×540; verify against the real source)
- JSON keys confirmed from the clip: `role, answers, yrs, ht, carry, hard, msd, y, w, s, map, t, p, sev, n`. The last map key reads like `tmp`. All other answer keys are named by us.
- Zone numbering ① side counter, ② nurse counter, ③ aisle, ④ scale/mixer, ⑤ door (confirmed by the user).
- Paired body circles (left/right) are treated as one Nordic region, since every pair in the summary shows the same count.
- Option "ดูน่ากลัว/แออัด" in Part D problem types was hard to read.
- The selected state for Part F ranking is not shown in the clip.
