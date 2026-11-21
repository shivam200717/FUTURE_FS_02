import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config } from './config.js';
import { connectDb, ensureAdmin } from './db.js';
import { authRouter } from './routes/auth.js';
import { leadsRouter, tasksRouter, usersRouter } from './routes/leads.js';
import { publicRouter } from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  await connectDb();
  await ensureAdmin();

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1); // needed behind Render/Heroku/nginx so req.ip is the visitor

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
  });

  // Public (no login): website visitors submitting a contact form
  app.use('/api/contact-inbound', publicRouter);
  // Auth
  app.use('/api/auth', authRouter);
  // Everything below requires a valid admin token (enforced inside each router)
  app.use('/api/leads', leadsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/users', usersRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (!config.isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // Central error handler: never leak stack traces to the client
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message });
    console.error('[error]', err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  app.listen(config.port, () => {
    console.log(`LeadFlow CRM running at http://localhost:${config.port}  (${config.isProduction ? 'production' : 'development'})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
