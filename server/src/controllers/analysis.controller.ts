import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { visualAnalysisRequestSchema } from '../schemas/visualAnalysis.schema.js';
import { GeminiServiceError } from '../services/geminiClient.js';
import { analyzeScreenshotVisuals } from '../services/geminiVisualAnalysis.service.js';

function logStage(event: string, fields: Record<string, string | number | boolean | undefined>): void {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  console.info(`[VisualAnalysis] stage=${event} ${parts.join(' ')}`);
}

export const postVisualAnalysis = async (req: Request, res: Response): Promise<void> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStartedAt = performance.now();
  const contentLengthHeader = req.headers['content-length'];
  const contentLengthBytes =
    typeof contentLengthHeader === 'string' && /^\d+$/.test(contentLengthHeader)
      ? Number(contentLengthHeader)
      : undefined;

  logStage('request_received', {
    requestId,
    contentLengthBytes
  });

  const parsed = visualAnalysisRequestSchema.safeParse(req.body);
  const validationMs = Math.max(0, Math.round(performance.now() - requestStartedAt));

  if (!parsed.success) {
    logStage('validation_completed', {
      requestId,
      valid: false,
      validationMs
    });

    const totalMs = Math.max(1, Math.round(performance.now() - requestStartedAt));
    res.status(400).json({
      error: 'Validation Error',
      code: 'INVALID_REQUEST',
      message:
        'Invalid visual analysis payload. Provide a valid PNG, JPG, or WEBP image and measured colour palette.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    logStage('response_sent', {
      requestId,
      status: 400,
      outcome: 'validation_failed',
      totalMs
    });
    return;
  }

  logStage('validation_completed', {
    requestId,
    valid: true,
    validationMs,
    mimeType: parsed.data.mimeType,
    dimensions: `${parsed.data.dimensions.width}x${parsed.data.dimensions.height}`,
    imageBase64Bytes: parsed.data.imageBase64.length,
    paletteCount: parsed.data.measuredPalette.length
  });

  const clientAbortController = new AbortController();
  const handleClientClose = () => {
    if (!res.writableEnded) {
      clientAbortController.abort(new Error('Client closed connection before response completed'));
    }
  };
  res.once('close', handleClientClose);

  try {
    const result = await analyzeScreenshotVisuals(parsed.data, {
      requestId,
      signal: clientAbortController.signal
    });

    if (res.headersSent || res.writableEnded) {
      return;
    }

    res.status(200).json(result);
    logStage('response_sent', {
      requestId,
      status: 200,
      outcome: 'success',
      totalMs: Math.max(1, Math.round(performance.now() - requestStartedAt))
    });
  } catch (err) {
    if (res.headersSent || res.writableEnded || clientAbortController.signal.aborted) {
      logStage('response_sent', {
        requestId,
        status: 499,
        outcome: 'client_disconnected',
        totalMs: Math.max(1, Math.round(performance.now() - requestStartedAt))
      });
      return;
    }

    if (err instanceof GeminiServiceError) {
      res.status(err.status).json({
        error: 'Visual Analysis Error',
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      });
      logStage('response_sent', {
        requestId,
        status: err.status,
        outcome: err.code,
        totalMs: Math.max(1, Math.round(performance.now() - requestStartedAt))
      });
      return;
    }

    console.error(
      `[VisualAnalysis] requestId=${requestId} unexpected_error:`,
      err instanceof Error ? err.message : err
    );
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'UPSTREAM_ERROR',
      message: 'Unexpected error while running visual interpretation.'
    });
    logStage('response_sent', {
      requestId,
      status: 500,
      outcome: 'UPSTREAM_ERROR',
      totalMs: Math.max(1, Math.round(performance.now() - requestStartedAt))
    });
  } finally {
    res.off('close', handleClientClose);
  }
};
