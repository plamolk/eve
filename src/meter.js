// รวม meta.rows_written / rows_read ของทุก query ในคำขอหนึ่ง
export function createMeter() {
  const m = {
    rw: 0,
    rr: 0,
    add(result) {
      const meta = (result && result.meta) || {};
      m.rw += meta.rows_written || 0;
      m.rr += meta.rows_read || 0;
      return result;
    },
    async run(stmt) {
      return m.add(await stmt.run());
    },
    async batch(db, stmts) {
      const results = await db.batch(stmts);
      results.forEach((r) => m.add(r));
      return results;
    }
  };
  return m;
}
