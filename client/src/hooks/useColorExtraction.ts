import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ColorExtractionException,
  extractPalette
} from '../services/imageProcessing/extractPalette';
import type {
  ExtractionError,
  ExtractionStage,
  ExtractionStatus,
  PaletteExtractionResult
} from '../types/colors';
import type { UploadedImage } from '../types/upload';

export interface UseColorExtractionResult {
  status: ExtractionStatus;
  stage: ExtractionStage | null;
  result: PaletteExtractionResult | null;
  error: ExtractionError | null;
  extractFromImage: (image: UploadedImage | null) => Promise<PaletteExtractionResult | null>;
  reset: () => void;
}

export const EXTRACTION_STAGE_LABELS: Record<ExtractionStage, string> = {
  decoding: 'Decoding screenshot bitmap…',
  downsampling: 'Downsampling image onto offscreen Canvas…',
  sampling: 'Sampling opaque pixels…',
  clustering: 'Quantizing and ranking dominant colours…'
};

export function useColorExtraction(): UseColorExtractionResult {
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [stage, setStage] = useState<ExtractionStage | null>(null);
  const [result, setResult] = useState<PaletteExtractionResult | null>(null);
  const [error, setError] = useState<ExtractionError | null>(null);

  const runSeqRef = useRef<number>(0);

  // Invalidate any in-flight extraction on unmount
  useEffect(() => {
    return () => {
      runSeqRef.current += 1;
    };
  }, []);

  const reset = useCallback(() => {
    runSeqRef.current += 1;
    setStatus('idle');
    setStage(null);
    setResult(null);
    setError(null);
  }, []);

  const extractFromImage = useCallback(
    async (image: UploadedImage | null): Promise<PaletteExtractionResult | null> => {
      const currentRun = ++runSeqRef.current;

      if (!image) {
        setStatus('error');
        setStage(null);
        setResult(null);
        setError({
          code: 'MISSING_IMAGE',
          title: 'No screenshot selected',
          message: 'Upload a valid PNG, JPG, or WEBP screenshot before running colour extraction.'
        });
        return null;
      }

      setError(null);
      setResult(null);
      setStatus('loading');
      setStage('decoding');

      try {
        const extracted = await extractPalette(image.file, {
          onStage: (nextStage) => {
            if (currentRun !== runSeqRef.current) return;
            setStage(nextStage);
            setStatus(nextStage === 'decoding' ? 'loading' : 'processing');
          }
        });

        // Discard stale results if another image was selected or reset occurred
        if (currentRun !== runSeqRef.current) {
          return null;
        }

        setResult(extracted);
        setStage(null);
        setError(null);
        setStatus('completed');
        return extracted;
      } catch (err) {
        if (currentRun !== runSeqRef.current) {
          return null;
        }

        const extractionError: ExtractionError =
          err instanceof ColorExtractionException
            ? err.details
            : {
                code: 'UNEXPECTED_ERROR',
                title: 'Colour extraction failed',
                message:
                  err instanceof Error
                    ? err.message
                    : 'An unexpected error occurred while processing the screenshot.'
              };

        setResult(null);
        setStage(null);
        setError(extractionError);
        setStatus('error');
        return null;
      }
    },
    []
  );

  return {
    status,
    stage,
    result,
    error,
    extractFromImage,
    reset
  };
}
