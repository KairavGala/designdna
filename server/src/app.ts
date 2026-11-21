import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/api.router.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const app: Express = express();

// Hide framework signature and attach baseline security headers
// (X-Frame-Options is intentionally omitted so iframe preview environments work)
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Middleware: Body parsing with sensible limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register API Routes
app.use('/api', apiRouter);

// Production Static File Serving & SPA Fallback (for unified standalone Node server;
// skipped on Vercel Services where the `client` service serves static assets separately)
if (!process.env.VERCEL) {
  const clientDistPath = path.resolve(currentDir, '../../client/dist');
  const indexPath = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(clientDistPath)) {
    // Serve static assets from compiled client
    app.use(express.static(clientDistPath));

    // SPA fallback for non-API GET requests
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
          return;
        }
      }
      next();
    });
  } else if (env.NODE_ENV === 'production') {
    console.warn(`⚠️ Warning: Production mode enabled but client build not found at ${clientDistPath}`);
  }
}

// Global Centralized Error Handler
app.use(errorHandler);

export default app;
