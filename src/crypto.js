// เทียบสตริงแบบใช้เวลาเท่ากัน: hash ทั้งสองค่าให้ยาวเท่ากันก่อนแล้วเทียบทุก byte
async function sha256(s) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
