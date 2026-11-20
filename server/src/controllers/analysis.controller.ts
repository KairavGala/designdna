import type { Request, Response } from 'express';
import { visualAnalysisRequestSchema } from '../schemas/visualAnalysis.schema.js';
import { GeminiServiceError } from '../services/geminiClient.js';
import { analyzeScreenshotVisuals } from '../services/geminiVisualAnalysis.service.js';

export const postVisualAnalysis = async (req: Request, res: Response): Promise<void> => {
  const parsed = visualAnalysisRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation Error',
      code: 'INVALID_REQUEST',
      message: 'Invalid visual analysis payload. Provide a valid PNG, JPG, or WEBP image and measured colour palette.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  try {
    const result = await analyzeScreenshotVisuals(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      res.status(err.status).json({
        error: 'Visual Analysis Error',
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      });
      return;
    }

    console.error('Unexpected visual analysis error:', err instanceof Error ? err.message : err);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'UPSTREAM_ERROR',
      message: 'Unexpected error while running visual interpretation.'
    });
  }
};
