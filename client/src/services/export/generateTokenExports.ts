import type { PaletteExtractionResult } from '../../types/colors';
import type { VisualAnalysisResult } from '../../types/analysis';
import type { DesignAnatomyBoardModel } from '../../types/anatomyBoard';
import { TOKEN_CATEGORY_ORDER, type DesignSystem, type TokenCategory } from '../../types/designSystem';
import type { StructuredJsonExportDocument } from '../../types/exportSuite';
import type { PatternRelationship, VisualElement, VisualRegion } from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';
import { normalizeDesignSystem } from '../designSystem/normalizeDesignSystem';
import { structuredJsonExportSchema } from './exportSchemas';

export interface ResolveExportDesignSystemInput {
  image: UploadedImage | null;
  colorResult: PaletteExtractionResult | null;
  visualAnalysis: VisualAnalysisResult | null;
  designSystem: DesignSystem | null;
}

/**
 * Reuses the existing M6 DesignSystem when already computed; in partial M4-only
 * sessions (measured colours ready before Visual AI), deterministically invokes
 * M6 `normalizeDesignSystem` with `visualAnalysis: null` so real measured tokens
 * can still be exported without inventing missing AI categories.
 */
export function resolveExportDesignSystem(
  input: ResolveExportDesignSystemInput
): DesignSystem | null {
  if (input.designSystem) return input.designSystem;
  if (!input.image || !input.colorResult || input.colorResult.colors.length === 0) {
    return null;
  }

  try {
    return normalizeDesignSystem({
      sourceImage: {
        name: input.image.name,
        format: input.image.format,
        width: input.image.width,
        height: input.image.height
      },
      colorResult: input.colorResult,
      visualAnalysis: input.visualAnalysis
    });
  } catch {
    return null;
  }
}

export interface CssExportResult {
  cssText: string;
  variableCount: number;
  categoriesIncluded: TokenCategory[];
  hasDuplicates: boolean;
}

/**
 * Produces valid, deterministic CSS custom properties directly from the M6
 * normalised DesignSystem (`--ddna-*`) and verifies syntactic integrity & zero
 * duplicate variable declarations.
 */
export function buildCssExport(designSystem: DesignSystem): CssExportResult {
  const cssText = designSystem.cssVariables;
  const seen = new Set<string>();
  let hasDuplicates = false;
  let variableCount = 0;

  const declRegex = /^\s*(--ddna-[a-z0-9-]+)\s*:\s*([^;]+);/gm;
  let match: RegExpExecArray | null = declRegex.exec(cssText);
  while (match) {
    variableCount += 1;
    const varName = match[1];
    if (seen.has(varName)) {
      hasDuplicates = true;
    } else {
      seen.add(varName);
    }
    match = declRegex.exec(cssText);
  }

  if (hasDuplicates) {
    throw new Error('CSS export validation failed: duplicate CSS custom property detected.');
  }

  if (!cssText.includes(':root {') || !cssText.trimEnd().endsWith('}')) {
    throw new Error('CSS export validation failed: missing valid :root selector block.');
  }

  const categoriesIncluded = TOKEN_CATEGORY_ORDER.filter(
    (category) => designSystem.byCategory[category].length > 0
  );

  return {
    cssText,
    variableCount,
    categoriesIncluded,
    hasDuplicates: false
  };
}

export interface JsonExportResult {
  document: StructuredJsonExportDocument;
  jsonText: string;
}

/**
 * Produces a deterministic, Zod-validated Structured JSON export extending
 * the existing M6 `jsonBundle` with reconciliation notes, token metrics,
 * visual identity summary, and honest screenshot-only methodology metadata.
 */
export function buildStructuredJsonExport(params: {
  designSystem: DesignSystem;
  board: DesignAnatomyBoardModel;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
}): JsonExportResult {
  const { designSystem, board, regions, elements, patterns } = params;
  const categories = TOKEN_CATEGORY_ORDER.filter(
    (category) => designSystem.byCategory[category].length > 0
  );

  const candidate: StructuredJsonExportDocument = {
    $schema: designSystem.jsonBundle.$schema,
    $metadata: {
      generator: 'DesignDNA',
      schemaVersion: designSystem.schemaVersion,
      exportVersion: '1.0.0',
      sourceFile: designSystem.source.fileName,
      dimensions: {
        width: designSystem.source.width,
        height: designSystem.source.height
      },
      aiModel: designSystem.source.aiModel,
      hasAiInterpretation: designSystem.source.hasAiInterpretation,
      tokenCount: designSystem.metrics.totalTokens
    },
    summary: {
      styleSummary: designSystem.summary.styleSummary,
      designTone: designSystem.summary.designTone,
      interfaceType: designSystem.summary.interfaceType,
      themeMode: designSystem.summary.themeMode,
      overallConfidence: designSystem.summary.overallConfidence,
      styleClassifications: board.identity.styleClassifications.map((tag) => ({
        label: tag.label,
        rationale: tag.rationale,
        provenance: tag.provenance,
        confidence: tag.confidence
      }))
    },
    metrics: { ...designSystem.metrics },
    categories,
    tokens: designSystem.jsonBundle.tokens,
    reconciliation: designSystem.reconciliationNotes.map((note) => ({ ...note })),
    visualAnalysisSummary: {
      populatedBoardSections: board.completeness.populatedSections,
      totalBoardSections: 7,
      detectedRegionsCount: regions.length,
      detectedVisualElementsCount: elements.length,
      verifiedPatternsCount: patterns.length,
      methodologyNote:
        'Measured values are sampled directly from uploaded screenshot pixels. AI-inferred and derived values come strictly from visual screenshot analysis without live HTML, CSS, DOM, or webfont file inspection.'
    }
  };

  const validated = structuredJsonExportSchema.parse(candidate);
  const jsonText = `${JSON.stringify(validated, null, 2)}\n`;

  return {
    document: validated,
    jsonText
  };
}
