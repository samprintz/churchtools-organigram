import { Hono } from 'hono';
import { ChurchToolsError, fetchOrgChart } from '../services/churchtools.js';
import { readConfig } from '../services/config.js';

const app = new Hono();

app.post('/', async (c) => {
  const config = await readConfig();

  try {
    const orgChart = await fetchOrgChart(config);
    return c.json({ data: orgChart });
  } catch (err) {
    if (err instanceof ChurchToolsError) {
      const status = err.statusCode === 401 ? 401 : 502;
      return c.json({ error: err.message }, status);
    }
    throw err;
  }
});

export default app;
