import { Hono } from 'hono';
import { orgChartFileSchema } from '../../shared/schemas.js';
import { readOrganigram, writeOrganigram } from '../services/config.js';

const app = new Hono();

app.get('/', async (c) => {
  const data = await readOrganigram();
  if (!data) {
    return c.json(
      { error: 'No organigram found. Fetch from ChurchTools or upload a file.' },
      404,
    );
  }
  return c.json(data);
});

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = orgChartFileSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid organigram format', details: result.error.issues }, 400);
  }

  await writeOrganigram(result.data);
  return c.json({ ok: true });
});

app.get('/download', async (c) => {
  const data = await readOrganigram();
  if (!data) {
    return c.json({ error: 'No organigram found' }, 404);
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="organigram.json"',
    },
  });
});

export default app;
