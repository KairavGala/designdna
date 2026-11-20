import { Router } from 'express';
import { healthRouter } from './health.router.js';

export const apiRouter = Router();

// Mount sub-routers
apiRouter.use(healthRouter);

// Unknown API routes fallback (returns JSON 404)
apiRouter.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist`
  });
});
