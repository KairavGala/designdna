import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED_RPM'
  | 'RATE_LIMITED_TPM'
  | 'QUOTA_DAILY_EXCEEDED'
  | 'FREE_TIER_MODEL_RESTRICTED'
  | 'PROJECT_QUOTA_OR_BILLING'
  | 'SERVICE_OVERLOADED'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_AI_RESPONSE'
  | 'UPSTREAM_ERROR';

export interface GeminiErrorDetails {
  upstreamStatus?: number;
  geminiStatus?: string;
  model?: string;
  quotaMetric?: string;
  quotaId?: string;
  quotaLimit?: string;
  retryDelay?: string;
  upstreamMessage?: string;
}

export class GeminiServiceError extends Error {
  public readonly status: number;
  public readonly code: GeminiErrorCode;
  public readonly details?: GeminiErrorDetails;

  constructor(
    code: GeminiErrorCode,
    status: number,
    message: string,
    details?: GeminiErrorDetails
  ) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/**
 * Returns a server-side @google/genai client configured with the required
 * AI Studio telemetry User-Agent header. Reads process.env.GEMINI_API_KEY
 * strictly on the server.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new GeminiServiceError(
      'MISSING_API_KEY',
      500,
      'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.'
    );
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    cachedKey = apiKey;
  }

  return cachedClient;
}
