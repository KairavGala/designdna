import type { ConfidenceLevel } from './analysis';
import type { TokenCategory, TokenProvenance } from './designSystem';

export type ExportGroupId = 'developer' | 'documentation' | 'assets' | 'package';

export type ExportFormatId =
  | 'css-variables'
  | 'json-tokens'
  | 'markdown-report'
  | 'pdf-report'
  | 'visual-assets-zip'
  | 'complete-package-zip';

export interface ExportFilenames {
  slug: string;
  css: string;
  json: string;
  markdown: string;
  pdf: string;
  assetsZip: string;
  completePackageZip: string;
}

export interface VisualAssetEntry {
  id: string;
  path: string;
  folder: 'motifs' | 'components' | 'patterns' | 'source';
  filename: string;
  category: string;
  sourceFindingId: string | null;
  sourceFindingName: string;
  parentRegionName: string | null;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
  occurrenceIndex: number | null;
  pixelDimensions: { width: number; height: number } | null;
  measuredColors: Array<{ hex: string; percentage: number }>;
  dataUrl?: string;
}

export interface VisualAssetsManifest {
  generator: 'DesignDNA';
  manifestVersion: '1.0.0';
  generatedAt: string;
  sourceFile: string;
  includesOriginalScreenshot: boolean;
  totalAssets: number;
  assets: Array<Omit<VisualAssetEntry, 'dataUrl'>>;
}

export interface PackageManifestFileEntry {
  path: string;
  format: string;
  category: ExportGroupId | 'manifest';
  description: string;
  bytes: number;
}

export interface AnalysisPackageManifest {
  generator: 'DesignDNA';
  manifestVersion: '1.0.0';
  milestone: 'M11';
  generatedAt: string;
  privacy: {
    localOnlyGeneration: true;
    includesOriginalScreenshot: boolean;
    containsSecrets: false;
  };
  source: {
    fileName: string;
    format: string;
    width: number;
    height: number;
    aiModel: string | null;
  };
  completeness: {
    hasMeasuredColors: boolean;
    hasVisualAi: boolean;
    hasDesignTokens: boolean;
    populatedBoardSections: number;
    totalBoardSections: number;
    tokenCount: number;
    regionCount: number;
    visualElementCount: number;
    patternCount: number;
    croppedAssetCount: number;
  };
  files: PackageManifestFileEntry[];
}

export interface StructuredJsonExportDocument {
  $schema: string;
  $metadata: {
    generator: 'DesignDNA';
    schemaVersion: '1.0.0';
    exportVersion: '1.0.0';
    sourceFile: string;
    dimensions: {
      width: number;
      height: number;
    };
    aiModel: string | null;
    hasAiInterpretation: boolean;
    tokenCount: number;
  };
  summary: {
    styleSummary: string;
    designTone: string;
    interfaceType: string;
    themeMode: 'light' | 'dark' | 'mixed';
    overallConfidence: ConfidenceLevel;
    styleClassifications: Array<{
      label: string;
      rationale: string;
      provenance: TokenProvenance;
      confidence: ConfidenceLevel;
    }>;
  };
  metrics: {
    totalTokens: number;
    measuredCount: number;
    aiInferredCount: number;
    derivedCount: number;
    deduplicatedCount: number;
    conflictCount: number;
  };
  categories: TokenCategory[];
  tokens: Record<
    TokenCategory,
    Record<
      string,
      {
        $value: string;
        $type: string;
        $description: string;
        $extensions: {
          designdna: {
            id: string;
            cssVariable: string;
            provenance: TokenProvenance;
            confidence: ConfidenceLevel;
            evidence: {
              source: string;
              measuredHex?: string;
              pixelPercentage?: number;
              measuredRank?: number;
              aiRole?: string;
              aiEstimate?: string;
              deltaE?: number;
              contrastRatio?: number;
              notes: string[];
            };
            reconciliation?: {
              status: string;
              measuredValue?: string;
              aiSuggestedValue?: string;
              resolution: string;
            };
          };
        };
      }
    >
  >;
  reconciliation: Array<{
    id: string;
    category: TokenCategory;
    tokenName: string;
    kind: 'anchored-to-measured' | 'conflict-preserved' | 'deduplicated';
    measuredValue?: string;
    aiSuggestedValue?: string;
    finalValue: string;
    explanation: string;
  }>;
  visualAnalysisSummary: {
    populatedBoardSections: number;
    totalBoardSections: number;
    detectedRegionsCount: number;
    detectedVisualElementsCount: number;
    verifiedPatternsCount: number;
    methodologyNote: string;
  };
}

export interface ExportItemDescriptor {
  id: ExportFormatId;
  group: ExportGroupId;
  title: string;
  formatLabel: string;
  filename: string;
  description: string;
  includedContent: string;
  available: boolean;
  availabilityStatus: 'ready' | 'partial' | 'unavailable';
  availabilityLabel: string;
  unavailableReason?: string;
  canPreview: boolean;
}
