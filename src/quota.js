// ยอดการใช้ D1 ของวันนี้ที่ isolate นี้รู้ล่าสุด (อัปเดตทุกครั้งที่ bumpUsage)
let last = null;

export function rememberUsage(u) {
  last = { day: u.day, rw: u.rw, rr: u.rr };
}

export function knownUsage(day) {
  return last && last.day === day ? last : null;
}

// true เมื่อถึงเกณฑ์ (ค่าเริ่มต้น 80%) ของโควตาเขียนหรืออ่าน
export function overQuota(u, env) {
  const ratio = Number(env.QUOTA_RATIO || 0.8);
  return u.rw >= ratio * Number(env.D1_WRITE_LIMIT || 100000) ||
    u.rr >= ratio * Number(env.D1_READ_LIMIT || 5000000);
}
