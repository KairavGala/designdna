import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError, requestVisualAnalysis } from '../services/api';
import { prepareAnalysisPayload } from '../services/imageProcessing/prepareAnalysisPayload';
import type {
  VisualAnalysisError,
  VisualAnalysisResult,
  VisualAnalysisStage,
  VisualAnalysisStatus
} from '../types/analysis';
import type { PaletteExtractionResult } from '../types/colors';
import type { UploadedImage } from '../types/upload';

export interface UseVisualAnalysisResult {
  status: VisualAnalysisStatus;
  stage: VisualAnalysisStage | null;
  result: VisualAnalysisResult | null;
  error: VisualAnalysisError | null;
  runAnalysis: (
    image: UploadedImage | null,
    colorResult: PaletteExtractionResult | null
  ) => Promise<VisualAnalysisResult | null>;
  reset: () => void;
}

export const VISUAL_ANALYSIS_STAGE_LABELS: Record<VisualAnalysisStage, string> = {
  preparing: 'Preparing transient screenshot payload…',
  analyzing: 'Interpreting semantic roles, typography, spacing, components & layout via Gemini…'
};

function mapErrorTitle(code: string): string {
  switch (code) {
    case 'MISSING_API_KEY':
      return 'Gemini API key not configured';
    case 'API_KEY_INVALID':
      return 'Invalid Gemini API credentials or permissions';
    case 'RATE_LIMITED_RPM':
      return 'Requests-per-minute (RPM) rate limit reached';
    case 'RATE_LIMITED_TPM':
      return 'Input tokens-per-minute (TPM) limit reached';
    case 'QUOTA_DAILY_EXCEEDED':
      return 'Daily Gemini request quota exceeded';
    case 'FREE_TIER_MODEL_RESTRICTED':
      return 'Free-tier model access restricted';
    case 'PROJECT_QUOTA_OR_BILLING':
      return 'Project quota or billing restriction';
    case 'SERVICE_OVERLOADED':
      return 'Gemini service temporarily overloaded';
    case 'RATE_LIMITED':
      return 'Gemini API resource exhausted (429)';
    case 'MODEL_UNAVAILABLE':
      return 'Gemini model unavailable';
    case 'INVALID_AI_RESPONSE':
      return 'Invalid visual interpretation response';
    case 'INVALID_REQUEST':
      return 'Invalid analysis payload';
    case 'PAYLOAD_TOO_LARGE':
      return 'Screenshot payload exceeds server limit';
    case 'INVALID_JSON':
      return 'Invalid request encoding';
    case 'NON_JSON_RESPONSE':
      return 'Visual analysis endpoint returned HTML instead of JSON';
    case 'INVALID_JSON_RESPONSE':
      return 'Malformed JSON response from server';
    default:
      return 'Visual interpretation failed';
  }
}

export function useVisualAnalysis(): UseVisualAnalysisResult {
  const [status, setStatus] = useState<VisualAnalysisStatus>('idle');
  const [stage, setStage] = useState<VisualAnalysisStage | null>(null);
  const [result, setResult] = useState<VisualAnalysisResult | null>(null);
  const [error, setError] = useState<VisualAnalysisError | null>(null);

  const runSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortInFlight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      runSeqRef.current += 1;
      abortInFlight();
    };
  }, [abortInFlight]);

  const reset = useCallback(() => {
    runSeqRef.current += 1;
    abortInFlight();
    setStatus('idle');
    setStage(null);
    setResult(null);
    setError(null);
  }, [abortInFlight]);

  const runAnalysis = useCallback(
    async (
      image: UploadedImage | null,
      colorResult: PaletteExtractionResult | null
    ): Promise<VisualAnalysisResult | null> => {
      const currentRun = ++runSeqRef.current;
      abortInFlight();

      if (!image || !colorResult || colorResult.colors.length === 0) {
        setStatus('error');
        setStage(null);
        setResult(null);
        setError({
          code: 'MISSING_PREREQUISITE',
          title: 'Measured colour palette required',
          message: 'Extract measured colours from a screenshot before running AI visual interpretation.'
        });
        return null;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      setResult(null);
      setStatus('preparing');
      setStage('preparing');

      try {
        const prepared = await prepareAnalysisPayload(
          image.file,
          image.width,
          image.height,
          image.mimeType
        );

        if (currentRun !== runSeqRef.current) {
          return null;
        }

        setStatus('analyzing');
        setStage('analyzing');

        const analysisResult = await requestVisualAnalysis(
          {
            imageBase64: prepared.imageBase64,
            mimeType: prepared.mimeType,
            fileName: image.name,
            dimensions: {
              width: image.width,
              height: image.height
            },
            measuredPalette: colorResult.colors.map((c) => ({
              hex: c.hex,
              percentage: c.percentage,
              rank: c.rank
            }))
          },
          controller.signal
        );

        if (currentRun !== runSeqRef.current) {
          return null;
        }

        abortControllerRef.current = null;
        setResult(analysisResult);
        setStage(null);
        setError(null);
        setStatus('completed');
        return analysisResult;
      } catch (err) {
        if (currentRun !== runSeqRef.current) {
          return null;
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }

        abortControllerRef.current = null;

        const nextError: VisualAnalysisError =
          err instanceof ApiRequestError
            ? {
                code: err.code,
                title: mapErrorTitle(err.code),
                message: err.message,
                details: err.details
              }
            : {
                code: 'NETWORK_ERROR',
                title: 'Unable to reach visual analysis endpoint',
                message:
                  err instanceof Error
                    ? err.message
                    : 'An unexpected network error occurred while contacting /api/analyze/visual.'
              };

        setResult(null);
        setStage(null);
        setError(nextError);
        setStatus('error');
        return null;
      }
    },
    [abortInFlight]
  );

  return {
    status,
    stage,
    result,
    error,
    runAnalysis,
    reset
  };
}
