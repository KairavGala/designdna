import type { ConfidenceLevel, TypographyHierarchyItem, VisualAnalysisResult } from './analysis';
import type { DesignAnatomyBoardModel } from './anatomyBoard';
import type { ExtractedColor, PaletteExtractionResult } from './colors';
import type { DesignSystem } from './designSystem';
import type {
  ElementVisualAssets,
  PatternRelationship,
  VisualElement,
  VisualRegion
} from './investigation';
import type { UploadedImage } from './upload';

export type ComparisonSlotId = 'design-a' | 'design-b';

export type ComparisonSlotSource = 'main-session' | 'independent';

export type ComparisonSlotReadiness =
  | 'empty'
  | 'uploaded'
  | 'measured-only'
  | 'complete';

export type ComparisonProvenance = 'measured' | 'ai-inferred' | 'derived';

export type ComparisonAvailability = 'ready' | 'partial' | 'unavailable';

export interface AnalysisContextSnapshot {
  slotId: ComparisonSlotId;
  slotLabel: 'Design A' | 'Design B';
  sourceKind: ComparisonSlotSource;
  image: UploadedImage | null;
  colorResult: PaletteExtractionResult | null;
  visualAnalysis: VisualAnalysisResult | null;
  designSystem: DesignSystem | null;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  elementAssets: Record<string, ElementVisualAssets>;
  anatomyBoard: DesignAnatomyBoardModel | null;
  readiness: ComparisonSlotReadiness;
  isBusy: boolean;
}

export interface ScreenshotGeometryComparison {
  availability: ComparisonAvailability;
  designADimensions: { width: number; height: number; aspectRatio: number; label: string } | null;
  designBDimensions: { width: number; height: number; aspectRatio: number; label: string } | null;
  aspectRatioDelta: number | null;
  summary: string;
}

export type VisualIdentityDimensionId =
  | 'aesthetic-direction'
  | 'color-identity'
  | 'typography-hierarchy'
  | 'layout-composition'
  | 'spacing-density'
  | 'shapes-surfaces'
  | 'patterns-motifs'
  | 'components-interactions'
  | 'shadows-effects';

export interface VisualIdentityDimensionRow {
  id: VisualIdentityDimensionId;
  label: string;
  designAValue: string | null;
  designBValue: string | null;
  differenceNote: string;
  provenance: ComparisonProvenance;
  confidence: ConfidenceLevel | null;
  availability: ComparisonAvailability;
  evidence: string[];
}

export interface SharedColorMatch {
  id: string;
  colorA: ExtractedColor;
  colorB: ExtractedColor;
  deltaE: number;
  proportionDelta: number;
  similarityLabel: 'Near-Identical' | 'Close Match';
}

export interface PaletteCharacteristicsSummary {
  dominantHex: string;
  dominantPercentage: number;
  dominantLuminance: number;
  toneLabel: 'Dark-dominant' | 'Light-dominant' | 'Mid-tone';
  averageSaturation: number;
  extractedCount: number;
  vividCount: number;
  neutralCount: number;
  themeMode: 'light' | 'dark' | 'mixed' | null;
}

export interface ColorComparisonModel {
  availability: ComparisonAvailability;
  unavailableReason: string | null;
  paletteA: readonly ExtractedColor[];
  paletteB: readonly ExtractedColor[];
  summaryA: PaletteCharacteristicsSummary | null;
  summaryB: PaletteCharacteristicsSummary | null;
  sharedColors: SharedColorMatch[];
  distinctiveA: ExtractedColor[];
  distinctiveB: ExtractedColor[];
  paletteOverlapPercentage: number | null;
  dominantLuminanceDelta: number | null;
  averageSaturationDelta: number | null;
  observations: Array<{
    text: string;
    provenance: ComparisonProvenance;
  }>;
}

export interface TypographySpecimenComparisonRow {
  levelLabel: string;
  designA: TypographyHierarchyItem | null;
  designB: TypographyHierarchyItem | null;
  differenceNote: string;
}

export interface TypographyComparisonModel {
  availability: ComparisonAvailability;
  unavailableReason: string | null;
  visualEstimateNotice: string;
  designA: {
    headingStyle: string;
    bodyStyle: string;
    monospaceDetected: boolean;
    scaleSummary: string;
    confidence: ConfidenceLevel;
    hierarchyCount: number;
  } | null;
  designB: {
    headingStyle: string;
    bodyStyle: string;
    monospaceDetected: boolean;
    scaleSummary: string;
    confidence: ConfidenceLevel;
    hierarchyCount: number;
  } | null;
  specimenRows: TypographySpecimenComparisonRow[];
  observations: Array<{
    text: string;
    provenance: ComparisonProvenance;
  }>;
}

export interface CropComparisonItem {
  id: string;
  name: string;
  category: VisualElement['category'];
  subcategory: string;
  description: string;
  parentRegionName: string | null;
  confidence: ConfidenceLevel;
  occurrenceCount: number;
  cropUrl: string | null;
  measuredColors: Array<{ hex: string; percentage: number }>;
  styleTraits: string[];
}

export interface MatchedElementPair {
  id: string;
  matchBasis: string;
  category: VisualElement['category'];
  itemA: CropComparisonItem;
  itemB: CropComparisonItem;
  similarityScore: number;
}

export interface SharedPatternComparison {
  id: string;
  patternType: PatternRelationship['patternType'];
  patternA: PatternRelationship;
  patternB: PatternRelationship;
}

export interface ComponentsMotifsComparisonModel {
  availability: ComparisonAvailability;
  unavailableReason: string | null;
  matchedElements: MatchedElementPair[];
  sharedPatterns: SharedPatternComparison[];
  uniqueToA: CropComparisonItem[];
  uniqueToB: CropComparisonItem[];
  uniquePatternsA: PatternRelationship[];
  uniquePatternsB: PatternRelationship[];
  totalElementsA: number;
  totalElementsB: number;
  totalPatternsA: number;
  totalPatternsB: number;
}

export interface IntelligenceFindingItem {
  id: string;
  title: string;
  detail: string;
  provenance: ComparisonProvenance;
  confidence: ConfidenceLevel | null;
  evidence: string[];
  prominenceLeader?: 'design-a' | 'design-b' | 'balanced';
  prominenceLabel?: string;
}

export interface DifferenceIntelligenceModel {
  availability: ComparisonAvailability;
  unavailableReason: string | null;
  headline: string;
  commonalities: IntelligenceFindingItem[];
  distinctiveA: IntelligenceFindingItem[];
  distinctiveB: IntelligenceFindingItem[];
  keyDifferences: IntelligenceFindingItem[];
}

export type RefinementCategory =
  | 'colour-consistency'
  | 'typography-hierarchy'
  | 'spacing-consistency'
  | 'component-consistency'
  | 'visual-density'
  | 'visual-identity';

export interface RefinementInsightItem {
  id: string;
  category: RefinementCategory;
  categoryLabel: string;
  appliesTo: 'design-a' | 'design-b' | 'both';
  appliesToLabel: string;
  title: string;
  observation: string;
  suggestion: string;
  provenance: ComparisonProvenance;
  referencedFindings: string[];
}

export interface DesignComparisonModel {
  canCompareVisuals: boolean;
  canCompareMeasured: boolean;
  canCompareFull: boolean;
  overallAvailability: ComparisonAvailability;
  readinessSummary: string;
  geometry: ScreenshotGeometryComparison;
  visualIdentityRows: VisualIdentityDimensionRow[];
  colorComparison: ColorComparisonModel;
  typographyComparison: TypographyComparisonModel;
  componentsMotifs: ComponentsMotifsComparisonModel;
  differenceIntelligence: DifferenceIntelligenceModel;
  refinementInsights: RefinementInsightItem[];
}
