# แบบสอบถามรถรับบริจาคโลหิตเคลื่อนที่ — Frontend Design

## Goal
Recreate the web questionnaire shown in the reference clip (`814988755_914089.mp4`), screen for screen, using HTML + Tailwind CSS (Play CDN) + vanilla JavaScript. Frontend only; no backend yet.

## Decisions (agreed in chat)
- Approach A: static files split by responsibility, Tailwind via pinned Play CDN, classic `<script>` tags under one `App` namespace, so `index.html` opens by double-click.
- Staff flow only. The "ผู้บริจาคโลหิต" button looks identical to the clip but shows a short "not available yet" message.
- Visual style copied from the clip (colors sampled from frames).
- Screens switch in memory (no URL routing).

## Screens
1. Intro: role choice + "ดูตัวอย่างหน้าสรุปผล (ข้อมูลจำลอง)".
2. Sections A–F with a progress bar (progress = section index / 6).
3. Thanks: JSON of answers, copy + restart.
4. Summary preview: bus-map heatmap, body-map counts, ranking bar chart (mock data).

## Output JSON
`{"role":"staff","answers":{...},"msd":{<region>:{"y","w","s"}},"map":{<zoneId>:{"t":[],"p":[],"sev":3,"n":"","tmp":1}}}`
Only answered fields are included. `tmp:1` marks a bus-map point that was edited but not yet saved with "บันทึกจุดนี้".

## Files
- `js/data/*` content only (questions, bus layout, body regions, mock summary)
- `js/state.js` answers + JSON
- `js/components/*` shared UI, body map, bus map (input + summary modes)
- `js/pages/*` one file per screen
- `js/app.js` screen switching + event delegation

## Known uncertainties (clip is 830×540; verify against the real source)
- JSON keys confirmed from the clip: `role, answers, yrs, ht, carry, hard, msd, y, w, s, map, t, p, sev, n`. The last map key reads like `tmp`. All other answer keys are named by us.
- Zone numbering ① side counter, ② nurse counter, ③ aisle, ④ scale/mixer, ⑤ door (confirmed by the user).
- Paired body circles (left/right) are treated as one Nordic region, since every pair in the summary shows the same count.
- Option "ดูน่ากลัว/แออัด" in Part D problem types was hard to read.
- The selected state for Part F ranking and the copy-confirmation text are not shown in the clip.
