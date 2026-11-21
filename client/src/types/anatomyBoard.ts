import type {
  BorderRadiusItem,
  ConfidenceLevel,
  DetectedComponent,
  LayoutRegion,
  SemanticColorRole,
  SpacingScaleStep,
  TypographyHierarchyItem
} from './analysis';
import type { TokenProvenance } from './designSystem';
import type {
  ElementVisualAssets,
  InvestigationSelection,
  NormalizedBoundingBox,
  PatternRelationship,
  VisualElement,
  VisualRegion
} from './investigation';

export type AnatomySectionId =
  | 'identity'
  | 'colour'
  | 'typography'
  | 'patterns'
  | 'components'
  | 'layout'
  | 'effects';

export interface AnatomySectionNavItem {
  id: AnatomySectionId;
  index: string;
  label: string;
}

export const ANATOMY_BOARD_SECTIONS: readonly AnatomySectionNavItem[] = [
  { id: 'identity', index: '01', label: 'Identity' },
  { id: 'colour', index: '02', label: 'Colour' },
  { id: 'typography', index: '03', label: 'Typography' },
  { id: 'patterns', index: '04', label: 'Patterns & Motifs' },
  { id: 'components', index: '05', label: 'Components' },
  { id: 'layout', index: '06', label: 'Layout' },
  { id: 'effects', index: '07', label: 'Effects' }
] as const;

export type StyleClassificationTag =
  | 'Minimalist'
  | 'Editorial'
  | 'Brutalist'
  | 'Futuristic'
  | 'Geometric'
  | 'Playful'
  | 'Corporate'
  | 'Luxury'
  | 'Experimental';

export interface EvidenceBackedStyleTag {
  label: StyleClassificationTag;
  rationale: string;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
}

export interface AnatomyIdentitySection {
  available: boolean;
  overallAesthetic: string | null;
  visualPersonality: string | null;
  interfaceType: string | null;
  themeMode: 'light' | 'dark' | 'mixed' | null;
  styleClassifications: EvidenceBackedStyleTag[];
  dominantCharacteristics: Array<{
    label: string;
    detail: string;
    provenance: TokenProvenance;
    confidence: ConfidenceLevel;
  }>;
  distinctiveElements: Array<{
    title: string;
    subtitle: string;
    selection: InvestigationSelection;
    targetBox: NormalizedBoundingBox | null;
    provenance: TokenProvenance;
    confidence: ConfidenceLevel;
  }>;
  recognisabilitySummary: string | null;
  overallConfidence: ConfidenceLevel | null;
}

export interface AnatomyColorSwatch {
  id: string;
  hex: string;
  label: string;
  group: 'dominant' | 'accent' | 'background' | 'surface' | 'text' | 'border' | 'measured';
  role: SemanticColorRole | null;
  cssVariable: string | null;
  coveragePercentage: number | null;
  measuredRank: number | null;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
  rationale: string | null;
}

export interface AnatomyColorSection {
  available: boolean;
  hasMeasuredPalette: boolean;
  hasSemanticRoles: boolean;
  measuredSpectrum: AnatomyColorSwatch[];
  roleSwatches: {
    dominant: AnatomyColorSwatch[];
    accent: AnatomyColorSwatch[];
    backgroundAndSurface: AnatomyColorSwatch[];
    textAndBorder: AnatomyColorSwatch[];
  };
  totalMeasuredColors: number;
  totalSemanticColors: number;
}

export interface AnatomyTypographySpecimen {
  id: string;
  level: string;
  estimatedSize: string;
  estimatedWeight: string;
  lineHeight: string;
  usage: string;
  sampleText: string;
  cssSizePx: number;
  cssWeight: number;
  cssLineHeight: number;
  isHeading: boolean;
  cssVariable: string | null;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
}

export interface AnatomyTypographySection {
  available: boolean;
  headingFontStyle: string | null;
  bodyFontStyle: string | null;
  monospaceDetected: boolean;
  scaleSummary: string | null;
  confidence: ConfidenceLevel | null;
  specimens: AnatomyTypographySpecimen[];
  rawHierarchy: TypographyHierarchyItem[];
  fontFamilyTokens: Array<{
    name: string;
    cssVariable: string;
    value: string;
    provenance: TokenProvenance;
    confidence: ConfidenceLevel;
  }>;
}

export interface AnatomyPatternsSection {
  available: boolean;
  patterns: PatternRelationship[];
  motifs: VisualElement[];
  textures: VisualElement[];
  icons: VisualElement[];
  decorative: VisualElement[];
  totalVisualElements: number;
  recurringCount: number;
}

export interface AnatomyComponentsSection {
  available: boolean;
  croppedComponents: VisualElement[];
  inferredComponents: DetectedComponent[];
  borderRadii: BorderRadiusItem[];
  borderTokens: Array<{
    name: string;
    cssVariable: string;
    value: string;
    provenance: TokenProvenance;
    confidence: ConfidenceLevel;
  }>;
  sharedComponentPatterns: PatternRelationship[];
}

export interface AnatomyLayoutSection {
  available: boolean;
  structureType: string | null;
  gridColumns: string | null;
  alignment: string | null;
  contentWidth: string | null;
  confidence: ConfidenceLevel | null;
  spacing: {
    baseUnit: string;
    density: 'compact' | 'comfortable' | 'spacious';
    sectionRhythm: string;
    containerPadding: string;
    scaleSteps: SpacingScaleStep[];
    confidence: ConfidenceLevel;
  } | null;
  inferredRegions: LayoutRegion[];
  detectedRegions: VisualRegion[];
}

export interface AnatomyEffectsSection {
  available: boolean;
  elevationStyle: 'flat' | 'subtle-border' | 'layered-shadow' | 'glass' | null;
  borderStyle: string | null;
  shadowStyle: string | null;
  notes: string | null;
  confidence: ConfidenceLevel | null;
  borderRadiusScale: BorderRadiusItem[];
  surfaceElements: VisualElement[];
  decorativeElements: VisualElement[];
  shadowTokens: Array<{
    name: string;
    cssVariable: string;
    value: string;
    provenance: TokenProvenance;
    confidence: ConfidenceLevel;
  }>;
}

export interface AnatomyCompleteness {
  hasScreenshot: boolean;
  hasMeasuredColors: boolean;
  hasVisualAi: boolean;
  hasDesignTokens: boolean;
  hasRegions: boolean;
  hasElements: boolean;
  populatedSections: number;
  totalSections: number;
}

export interface DesignAnatomyBoardModel {
  completeness: AnatomyCompleteness;
  identity: AnatomyIdentitySection;
  colour: AnatomyColorSection;
  typography: AnatomyTypographySection;
  patterns: AnatomyPatternsSection;
  components: AnatomyComponentsSection;
  layout: AnatomyLayoutSection;
  effects: AnatomyEffectsSection;
  assets: {
    elementAssets: Record<string, ElementVisualAssets>;
  };
}

export interface CropLightboxTarget {
  title: string;
  categoryLabel: string;
  cropUrl: string;
  occurrenceCropUrls: string[];
  description: string;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
  evidence: string[];
  parentRegionId: string | null;
  parentRegionName: string | null;
  measuredColors: Array<{ hex: string; percentage: number }>;
  selection: InvestigationSelection;
  targetBox: NormalizedBoundingBox | null;
  pixelDimensions: { width: number; height: number } | null;
}
