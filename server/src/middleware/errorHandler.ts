import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';

function sanitizeErrorText(input: string): string {
  return input
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/key=[A-Za-z0-9\-_]+/gi, 'key=[REDACTED]');
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const errObj =
    typeof err === 'object' && err !== null
      ? (err as { status?: unknown; statusCode?: unknown; type?: unknown; message?: unknown })
      : null;

  const status =
    typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.statusCode === 'number'
        ? errObj.statusCode
        : 500;

  const errType = typeof errObj?.type === 'string' ? errObj.type : '';
  const rawMessage = err instanceof Error ? err.message : 'Internal Server Error';
  const safeLogMessage = sanitizeErrorText(rawMessage);

  if (status === 413 || errType === 'entity.too.large') {
    res.status(413).json({
      error: 'Payload Too Large',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds the 10 MB server limit. Please upload a smaller screenshot.'
    });
    return;
  }

  if (status === 400 && (errType === 'entity.parse.failed' || err instanceof SyntaxError)) {
    res.status(400).json({
      error: 'Bad Request',
      code: 'INVALID_JSON',
      message: 'Malformed JSON request body.'
    });
    return;
  }

  console.error(`Unhandled server error (HTTP ${status}):`, safeLogMessage);

  const clientMessage =
    status >= 500 && env.NODE_ENV === 'production'
      ? 'An unexpected server error occurred.'
      : safeLogMessage;

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : 'Request Error',
    code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
    message: clientMessage
  });
};
