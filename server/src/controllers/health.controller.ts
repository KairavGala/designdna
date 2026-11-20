import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
};
