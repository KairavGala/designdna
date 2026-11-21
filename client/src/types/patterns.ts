import type { ConfidenceLevel } from './analysis';
import type {
  BoundaryPrecision,
  NormalizedBoundingBox,
  RegionMeasuredColor
} from './investigation';

export type VisualElementCategory =
  | 'geometric-motif'
  | 'background-texture'
  | 'icon-symbol'
  | 'component-style'
  | 'decorative-detail';

export type PatternExplorerCategory =
  | 'all'
  | 'recurring-patterns'
  | VisualElementCategory;

export type ElementRecurrenceType = 'recurring-pattern' | 'individual-element';

export type VisualEvidenceBasis = 'visible-surface' | 'ai-inference';

export interface VisualElementOccurrence {
  boundingBox: NormalizedBoundingBox;
  boundaryPrecision: BoundaryPrecision;
  locationLabel: string;
  associatedRegionId: string | null;
}

export interface VisualPatternElement {
  id: string;
  name: string;
  category: VisualElementCategory;
  recurrenceType: ElementRecurrenceType;
  occurrenceCount: number;
  description: string;
  visualCharacteristics: string[];
  relationshipNote: string | null;
  evidenceBasis: VisualEvidenceBasis;
  confidence: ConfidenceLevel;
  evidence: string[];
  occurrences: VisualElementOccurrence[];
  associatedRegionIds: string[];
  relatedElementIds: string[];
}

export interface PatternValidationSummary {
  patterns: VisualPatternElement[];
  rejectedCount: number;
}

export interface PatternVisualAsset {
  /** Real cropped screenshot data URLs aligned 1:1 with pattern.occurrences */
  occurrenceCrops: Array<string | null>;
  /** Dominant pixel colours measured locally from the primary occurrence crop */
  measuredColors: RegionMeasuredColor[];
}

export interface InvestigationAssetsBundle {
  regionColors: Record<string, RegionMeasuredColor[]>;
  patternAssets: Record<string, PatternVisualAsset>;
}

export interface OverlayVisibility {
  regions: boolean;
  patterns: boolean;
  components: boolean;
}

export const VISUAL_ELEMENT_CATEGORY_ORDER: readonly VisualElementCategory[] = [
  'geometric-motif',
  'background-texture',
  'icon-symbol',
  'component-style',
  'decorative-detail'
];

export const PATTERN_EXPLORER_TAB_ORDER: readonly PatternExplorerCategory[] = [
  'all',
  'recurring-patterns',
  'geometric-motif',
  'background-texture',
  'icon-symbol',
  'component-style',
  'decorative-detail'
];

export const PATTERN_CATEGORY_LABELS: Record<PatternExplorerCategory, string> = {
  all: 'All Elements',
  'recurring-patterns': 'Patterns',
  'geometric-motif': 'Geometric Motifs',
  'background-texture': 'Backgrounds & Textures',
  'icon-symbol': 'Icons & Symbols',
  'component-style': 'Component Styles',
  'decorative-detail': 'Decorative Details'
};

export const VISUAL_ELEMENT_CATEGORY_LABELS: Record<VisualElementCategory, string> = {
  'geometric-motif': 'Geometric Motifs',
  'background-texture': 'Backgrounds & Textures',
  'icon-symbol': 'Icons & Symbols',
  'component-style': 'Component Styles',
  'decorative-detail': 'Decorative Details'
};

export const VISUAL_ELEMENT_CATEGORY_SHORT_LABELS: Record<VisualElementCategory, string> = {
  'geometric-motif': 'Geometric Motif',
  'background-texture': 'Background / Texture',
  'icon-symbol': 'Icon / Symbol',
  'component-style': 'Component Style',
  'decorative-detail': 'Decorative Detail'
};

/**
 * Classifies whether a pattern element belongs to the independent "Components"
 * overlay toggle or the "Patterns & Motifs" overlay toggle.
 */
export function isComponentStylePattern(element: VisualPatternElement): boolean {
  return element.category === 'component-style';
}
