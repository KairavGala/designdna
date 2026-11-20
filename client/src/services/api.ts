import type {
  VisualAnalysisErrorDetails,
  VisualAnalysisRequestPayload,
  VisualAnalysisResult
} from '../types/analysis';

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  environment: string;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: VisualAnalysisErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: VisualAnalysisErrorDetails
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('application/json');
}

function buildNonJsonDiagnostic(
  endpoint: string,
  status: number,
  contentType: string | null,
  bodyText: string
): string {
  const trimmed = bodyText.trim();
  const isHtml =
    (contentType?.toLowerCase().includes('text/html') ?? false) ||
    trimmed.toLowerCase().startsWith('<!doctype') ||
    trimmed.toLowerCase().startsWith('<html');

  if (isHtml) {
    const titleMatch = trimmed.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : null;
    const titleDetail = pageTitle ? ` ("${pageTitle}")` : '';
    return `Endpoint ${endpoint} returned an HTML page${titleDetail} instead of JSON (HTTP ${status}). The Express backend or reverse proxy may have intercepted an upstream error or restarted.`;
  }

  return `Endpoint ${endpoint} returned an unexpected non-JSON response (HTTP ${status}, content-type: ${contentType ?? 'unknown'}).`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  const contentType = response.headers.get('content-type');
  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!isJsonContentType(contentType)) {
    throw new Error(
      buildNonJsonDiagnostic('/api/health', response.status, contentType, rawBody)
    );
  }

  return JSON.parse(rawBody) as HealthResponse;
}

export async function requestVisualAnalysis(
  payload: VisualAnalysisRequestPayload,
  signal?: AbortSignal
): Promise<VisualAnalysisResult> {
  const endpoint = '/api/analyze/visual';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal
  });

  const contentType = response.headers.get('content-type');
  const rawBody = await response.text();
  const jsonResponse = isJsonContentType(contentType);

  if (!response.ok) {
    if (!jsonResponse) {
      throw new ApiRequestError(
        response.status,
        'NON_JSON_RESPONSE',
        buildNonJsonDiagnostic(endpoint, response.status, contentType, rawBody)
      );
    }

    let code = 'ANALYSIS_FAILED';
    let message = `Visual analysis request failed (HTTP ${response.status}).`;
    let details: VisualAnalysisErrorDetails | undefined;

    try {
      const errorBody = JSON.parse(rawBody) as {
        code?: string;
        message?: string;
        details?: VisualAnalysisErrorDetails;
      };
      if (typeof errorBody.code === 'string' && errorBody.code) {
        code = errorBody.code;
      }
      if (typeof errorBody.message === 'string' && errorBody.message) {
        message = errorBody.message;
      }
      if (errorBody.details && typeof errorBody.details === 'object') {
        details = errorBody.details;
      }
    } catch {
      message = `Visual analysis endpoint returned malformed JSON error (HTTP ${response.status}).`;
    }

    throw new ApiRequestError(response.status, code, message, details);
  }

  if (!jsonResponse) {
    throw new ApiRequestError(
      response.status,
      'NON_JSON_RESPONSE',
      buildNonJsonDiagnostic(endpoint, response.status, contentType, rawBody)
    );
  }

  try {
    return JSON.parse(rawBody) as VisualAnalysisResult;
  } catch {
    throw new ApiRequestError(
      response.status,
      'INVALID_JSON_RESPONSE',
      `Endpoint ${endpoint} returned malformed JSON (HTTP ${response.status}).`
    );
  }
}
