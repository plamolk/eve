// Worker: ทำงานเฉพาะ /api/* (หน้าเว็บเสิร์ฟเป็น static assets)
import { Hono } from 'hono';

const app = new Hono();

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'server' }, 500);
});

export default app;
