import { useEffect, useMemo, useState } from 'react';
import type { UseVisualAnalysisResult } from './useVisualAnalysis';
import { extractInvestigationAssets } from '../services/investigation/extractInvestigationAssets';
import { validateAndNormalizeElementsAndPatterns } from '../services/investigation/patternSchema';
import { validateAndNormalizeRegions } from '../services/investigation/regionSchema';
import type {
  InvestigationAssets,
  PatternRelationship,
  VisualElement,
  VisualRegion
} from '../types/investigation';
import type { UploadedImage } from '../types/upload';

export interface UseInvestigationDataResult {
  regions: readonly VisualRegion[];
  rejectedRegionCount: number;
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  rejectedElementCount: number;
  rejectedPatternCount: number;
  assets: InvestigationAssets;
  samplingAssets: boolean;
}

const EMPTY_ASSETS: InvestigationAssets = {
  regionColors: {},
  elementAssets: {}
};

/**
 * Shared in-memory M8/M9/M10 investigation state hook.
 * Runs pure Zod normalization for M8 regions and M9 elements/patterns ONCE,
 * and decodes the active screenshot ONCE via `extractInvestigationAssets`
 * so Visual Investigation (M8/M9) and Design Anatomy Board (M10) share
 * identical validated findings and real PNG screenshot crops with zero
 * redundant decoding or API requests.
 */
export function useInvestigationData(
  image: UploadedImage | null,
  visualAnalysis: UseVisualAnalysisResult
): UseInvestigationDataResult {
  const [assets, setAssets] = useState<InvestigationAssets>(EMPTY_ASSETS);
  const [samplingAssets, setSamplingAssets] = useState<boolean>(false);

  const regionValidation = useMemo(() => {
    if (visualAnalysis.status !== 'completed' || !visualAnalysis.result) {
      return { regions: [] as VisualRegion[], rejectedCount: 0 };
    }
    return validateAndNormalizeRegions(visualAnalysis.result.interpretation.visualRegions);
  }, [visualAnalysis.status, visualAnalysis.result]);

  const patternValidation = useMemo(() => {
    if (visualAnalysis.status !== 'completed' || !visualAnalysis.result) {
      return {
        elements: [] as VisualElement[],
        patterns: [] as PatternRelationship[],
        rejectedElementCount: 0,
        rejectedPatternCount: 0
      };
    }
    return validateAndNormalizeElementsAndPatterns(
      visualAnalysis.result.interpretation.visualElements,
      visualAnalysis.result.interpretation.patternRelationships,
      regionValidation.regions
    );
  }, [visualAnalysis.status, visualAnalysis.result, regionValidation.regions]);

  useEffect(() => {
    if (
      !image ||
      (regionValidation.regions.length === 0 && patternValidation.elements.length === 0)
    ) {
      setAssets(EMPTY_ASSETS);
      setSamplingAssets(false);
      return;
    }

    let cancelled = false;
    setSamplingAssets(true);

    void extractInvestigationAssets(
      image.file,
      regionValidation.regions,
      patternValidation.elements
    )
      .then((extracted) => {
        if (!cancelled) {
          setAssets(extracted);
          setSamplingAssets(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets(EMPTY_ASSETS);
          setSamplingAssets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [image, regionValidation.regions, patternValidation.elements]);

  return {
    regions: regionValidation.regions,
    rejectedRegionCount: regionValidation.rejectedCount,
    elements: patternValidation.elements,
    patterns: patternValidation.patterns,
    rejectedElementCount: patternValidation.rejectedElementCount,
    rejectedPatternCount: patternValidation.rejectedPatternCount,
    assets,
    samplingAssets
  };
}
