// Worker: ทำงานเฉพาะ /api/* (หน้าเว็บเสิร์ฟเป็น static assets)
import { Hono } from 'hono';
import { handleSubmit } from './routes/submit.js';
import { handleImport } from './routes/import.js';
import { adminRoutes } from './routes/admin.js';

const app = new Hono();

app.post('/api/submit', handleSubmit);
app.post('/api/import', handleImport);
app.route('/api/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'server' }, 500);
});

export default app;
