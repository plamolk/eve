-- 1 คนตอบ = 1 แถว (เก็บ JSON คำตอบในคอลัมน์ data)
-- id เป็น rowid จึงไม่มี index แยก; cid UNIQUE เป็น index เดียว (+1 แถวที่เขียนต่อ INSERT)
CREATE TABLE responses (
  id      INTEGER PRIMARY KEY,
  cid     TEXT    NOT NULL UNIQUE,
  role    TEXT    NOT NULL CHECK (role IN ('staff','donor')),
  data    TEXT    NOT NULL,
  created INTEGER NOT NULL,
  src     INTEGER NOT NULL DEFAULT 0
) STRICT;

-- ยอดที่ Worker นี้ใช้ต่อวัน (UTC) จาก meta.rows_written / rows_read ที่ D1 ส่งกลับ
CREATE TABLE usage (
  day INTEGER PRIMARY KEY,          -- YYYYMMDD (UTC)
  rw  INTEGER NOT NULL DEFAULT 0,   -- rows written
  rr  INTEGER NOT NULL DEFAULT 0,   -- rows read
  n   INTEGER NOT NULL DEFAULT 0    -- จำนวนคำตอบที่บันทึก
) STRICT;

-- cache ผลสรุปของหน้าแอดมิน (1 แถว)
CREATE TABLE summary (
  k       INTEGER PRIMARY KEY CHECK (k = 1),
  last_id INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated INTEGER NOT NULL
) STRICT;
INSERT INTO summary (k, last_id, data, updated) VALUES (1, 0, '{}', 0);
