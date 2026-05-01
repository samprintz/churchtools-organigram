import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import configRoutes from './routes/config.js';
import fetchRoutes from './routes/fetch.js';
import organigramRoutes from './routes/organigram.js';

const app = new Hono();

app.use('*', logger());

// API routes
const api = new Hono();
api.route('/organigram', organigramRoutes);
api.route('/fetch', fetchRoutes);
api.route('/config', configRoutes);
app.route('/api', api);

// Serve Vite production build (Phase 2+)
app.use('/*', serveStatic({ root: './dist/client' }));
app.get('*', serveStatic({ root: './dist/client', path: 'index.html' }));

const PORT = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
