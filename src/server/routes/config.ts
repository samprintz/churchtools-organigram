import { Hono } from 'hono';
import { appConfigSchema } from '../../shared/schemas.js';
import { readConfig, writeConfig } from '../services/config.js';

const app = new Hono();

app.get('/', async (c) => {
  const config = await readConfig();
  return c.json(config);
});

app.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = appConfigSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid config format', details: result.error.issues }, 400);
  }

  await writeConfig(result.data);
  return c.json(result.data);
});

export default app;
