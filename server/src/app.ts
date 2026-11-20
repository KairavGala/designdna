import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/api.router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app: Express = express();

// Middleware: Body parsing with sensible limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register API Routes
app.use('/api', apiRouter);

// Production Static File Serving & SPA Fallback
const clientDistPath = path.resolve(__dirname, '../../client/dist');
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

// Global Centralized Error Handler
app.use(errorHandler);
