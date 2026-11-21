import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAnatomyBoard } from '../services/anatomyBoard/buildAnatomyBoard';
import { normalizeDesignSystem } from '../services/designSystem/normalizeDesignSystem';
import type { AnalysisContextSnapshot, ComparisonSlotId, ComparisonSlotReadiness } from '../types/comparison';
import type { DesignSystem } from '../types/designSystem';
import { useColorExtraction, type UseColorExtractionResult } from './useColorExtraction';
import { useImageUpload, type UseImageUploadResult } from './useImageUpload';
import { useInvestigationData, type UseInvestigationDataResult } from './useInvestigationData';
import { useVisualAnalysis, type UseVisualAnalysisResult } from './useVisualAnalysis';

export interface UseComparisonSlotResult {
  slotId: ComparisonSlotId;
  upload: UseImageUploadResult;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  investigation: UseInvestigationDataResult;
  designSystem: DesignSystem | null;
  snapshot: AnalysisContextSnapshot;
  isPipelineRunning: boolean;
  selectFile: (files: FileList | File[] | null) => Promise<void>;
  extractColorsOnly: () => Promise<void>;
  runVisualAnalysisOnly: () => Promise<void>;
  runFullAnalysis: () => Promise<void>;
  clearSlot: () => void;
}

export function computeSlotReadiness(params: {
  hasImage: boolean;
  hasColors: boolean;
  hasVisualAnalysis: boolean;
}): ComparisonSlotReadiness {
  if (!params.hasImage) return 'empty';
  if (params.hasColors && params.hasVisualAnalysis) return 'complete';
  if (params.hasColors) return 'measured-only';
  return 'uploaded';
}

/**
 * Self-contained, isolated in-memory analysis context for a single comparison slot
 * (Design A or Design B). Reuses the exact M3–M10 hooks and services without sharing
 * mutable state with the main analysis session or the opposing comparison slot.
 *
 * Never triggers extraction or Gemini API requests automatically on mount or navigation.
 */
export function useComparisonSlot(
  slotId: ComparisonSlotId,
  slotLabel: 'Design A' | 'Design B'
): UseComparisonSlotResult {
  const upload = useImageUpload();
  const colorExtraction = useColorExtraction();
  const visualAnalysis = useVisualAnalysis();
  const investigation = useInvestigationData(upload.image, visualAnalysis);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

  // Immediately invalidate slot-local extraction & visual analysis whenever this slot's screenshot changes
  const previewUrl = upload.image?.previewUrl ?? null;
  const resetExtraction = colorExtraction.reset;
  const resetVisualAnalysis = visualAnalysis.reset;

  useEffect(() => {
    resetExtraction();
    resetVisualAnalysis();
    setIsPipelineRunning(false);
  }, [previewUrl, resetExtraction, resetVisualAnalysis]);

  const designSystem = useMemo<DesignSystem | null>(() => {
    if (
      !upload.image ||
      colorExtraction.status !== 'completed' ||
      !colorExtraction.result ||
      colorExtraction.result.colors.length === 0
    ) {
      return null;
    }

    const readyVisual =
      visualAnalysis.status === 'completed' && visualAnalysis.result
        ? visualAnalysis.result
        : null;

    try {
      return normalizeDesignSystem({
        sourceImage: {
          name: upload.image.name,
          format: upload.image.format,
          width: upload.image.width,
          height: upload.image.height
        },
        colorResult: colorExtraction.result,
        visualAnalysis: readyVisual
      });
    } catch {
      return null;
    }
  }, [
    upload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result
  ]);

  const anatomyBoard = useMemo(() => {
    if (!upload.image) return null;
    return buildAnatomyBoard({
      image: upload.image,
      colorResult: colorExtraction.status === 'completed' ? colorExtraction.result : null,
      visualAnalysis: visualAnalysis.status === 'completed' ? visualAnalysis.result : null,
      designSystem,
      regions: investigation.regions,
      elements: investigation.elements,
      patterns: investigation.patterns,
      assets: investigation.assets
    });
  }, [
    upload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result,
    designSystem,
    investigation.regions,
    investigation.elements,
    investigation.patterns,
    investigation.assets
  ]);

  const selectFile = useCallback(
    async (files: FileList | File[] | null) => {
      await upload.handleFiles(files);
    },
    [upload]
  );

  const extractColorsOnly = useCallback(async () => {
    if (!upload.image) return;
    resetVisualAnalysis();
    await colorExtraction.extractFromImage(upload.image);
  }, [upload.image, colorExtraction, resetVisualAnalysis]);

  const runVisualAnalysisOnly = useCallback(async () => {
    if (!upload.image || !colorExtraction.result) return;
    await visualAnalysis.runAnalysis(upload.image, colorExtraction.result);
  }, [upload.image, colorExtraction.result, visualAnalysis]);

  const runFullAnalysis = useCallback(async () => {
    if (!upload.image || isPipelineRunning) return;
    setIsPipelineRunning(true);
    try {
      // Reuse already-completed measured colours if present; otherwise extract locally first
      const palette =
        colorExtraction.status === 'completed' && colorExtraction.result
          ? colorExtraction.result
          : await colorExtraction.extractFromImage(upload.image);

      if (!palette || palette.colors.length === 0) return;

      // Never automatically re-run Gemini if valid results already exist for this screenshot
      if (visualAnalysis.status === 'completed' && visualAnalysis.result) {
        return;
      }

      await visualAnalysis.runAnalysis(upload.image, palette);
    } finally {
      setIsPipelineRunning(false);
    }
  }, [upload.image, isPipelineRunning, colorExtraction, visualAnalysis]);

  const clearSlot = useCallback(() => {
    resetExtraction();
    resetVisualAnalysis();
    upload.removeImage();
    setIsPipelineRunning(false);
  }, [resetExtraction, resetVisualAnalysis, upload]);

  const isBusy =
    upload.status === 'validating' ||
    colorExtraction.status === 'loading' ||
    colorExtraction.status === 'processing' ||
    visualAnalysis.status === 'preparing' ||
    visualAnalysis.status === 'analyzing' ||
    investigation.samplingAssets ||
    isPipelineRunning;

  const hasColors = Boolean(
    upload.image &&
      colorExtraction.status === 'completed' &&
      colorExtraction.result &&
      colorExtraction.result.colors.length > 0
  );
  const hasVisual = Boolean(
    hasColors && visualAnalysis.status === 'completed' && visualAnalysis.result
  );

  const snapshot = useMemo<AnalysisContextSnapshot>(
    () => ({
      slotId,
      slotLabel,
      sourceKind: 'independent',
      image: upload.image,
      colorResult: hasColors ? colorExtraction.result : null,
      visualAnalysis: hasVisual ? visualAnalysis.result : null,
      designSystem,
      regions: investigation.regions,
      elements: investigation.elements,
      patterns: investigation.patterns,
      elementAssets: investigation.assets.elementAssets,
      anatomyBoard,
      readiness: computeSlotReadiness({
        hasImage: Boolean(upload.image),
        hasColors,
        hasVisualAnalysis: hasVisual
      }),
      isBusy
    }),
    [
      slotId,
      slotLabel,
      upload.image,
      hasColors,
      colorExtraction.result,
      hasVisual,
      visualAnalysis.result,
      designSystem,
      investigation.regions,
      investigation.elements,
      investigation.patterns,
      investigation.assets.elementAssets,
      anatomyBoard,
      isBusy
    ]
  );

  return {
    slotId,
    upload,
    colorExtraction,
    visualAnalysis,
    investigation,
    designSystem,
    snapshot,
    isPipelineRunning,
    selectFile,
    extractColorsOnly,
    runVisualAnalysisOnly,
    runFullAnalysis,
    clearSlot
  };
}
