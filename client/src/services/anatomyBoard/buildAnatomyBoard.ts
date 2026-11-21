import { z } from 'zod';
import type {
  ConfidenceLevel,
  SemanticColorRole,
  VisualAnalysisResult
} from '../../types/analysis';
import type {
  AnatomyColorSwatch,
  AnatomyTypographySpecimen,
  DesignAnatomyBoardModel,
  EvidenceBackedStyleTag,
  StyleClassificationTag
} from '../../types/anatomyBoard';
import type { PaletteExtractionResult } from '../../types/colors';
import type { DesignSystem, TokenProvenance } from '../../types/designSystem';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  type InvestigationAssets,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface BuildAnatomyBoardInput {
  image: UploadedImage | null;
  colorResult: PaletteExtractionResult | null;
  visualAnalysis: VisualAnalysisResult | null;
  designSystem: DesignSystem | null;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  assets: InvestigationAssets;
}

const styleTagSchema = z.object({
  label: z.enum([
    'Minimalist',
    'Editorial',
    'Brutalist',
    'Futuristic',
    'Geometric',
    'Playful',
    'Corporate',
    'Luxury',
    'Experimental'
  ]),
  rationale: z.string().min(1).max(260),
  provenance: z.enum(['measured', 'ai-inferred', 'derived']),
  confidence: z.enum(['high', 'medium', 'low'])
});

const colorSwatchSchema = z.object({
  id: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-F]{6}$/i),
  label: z.string().min(1),
  group: z.enum(['dominant', 'accent', 'background', 'surface', 'text', 'border', 'measured']),
  role: z
    .enum([
      'background',
      'surface',
      'primary_text',
      'secondary_text',
      'primary_brand',
      'accent',
      'border',
      'semantic_status'
    ])
    .nullable(),
  cssVariable: z.string().nullable(),
  coveragePercentage: z.number().min(0).max(100).nullable(),
  measuredRank: z.number().int().min(1).nullable(),
  provenance: z.enum(['measured', 'ai-inferred', 'derived']),
  confidence: z.enum(['high', 'medium', 'low']),
  rationale: z.string().nullable()
});

const typographySpecimenSchema = z.object({
  id: z.string().min(1),
  level: z.string().min(1),
  estimatedSize: z.string().min(1),
  estimatedWeight: z.string().min(1),
  lineHeight: z.string().min(1),
  usage: z.string().min(1),
  sampleText: z.string().min(1),
  cssSizePx: z.number().min(11).max(52),
  cssWeight: z.number().int().min(300).max(800),
  cssLineHeight: z.number().min(1).max(2.2),
  isHeading: z.boolean(),
  cssVariable: z.string().nullable(),
  provenance: z.enum(['measured', 'ai-inferred', 'derived']),
  confidence: z.enum(['high', 'medium', 'low'])
});

const STYLE_RULES: ReadonlyArray<{
  tag: StyleClassificationTag;
  keywords: RegExp;
  rationalePrefix: string;
}> = [
  {
    tag: 'Minimalist',
    keywords: /\b(minimal|minimalist|clean|restraint|sparse|uncluttered|refined|austere)\b/i,
    rationalePrefix: 'Supported by visual interpretation describing a restrained, uncluttered aesthetic'
  },
  {
    tag: 'Editorial',
    keywords: /\b(editorial|magazine|publication|journal|serif|typographic|article|broadsheet)\b/i,
    rationalePrefix: 'Supported by editorial composition cues and typographic hierarchy'
  },
  {
    tag: 'Brutalist',
    keywords: /\b(brutalist|neo-brutalist|raw|stark|hard border|heavy outline|high-contrast black)\b/i,
    rationalePrefix: 'Supported by stark high-contrast framing or raw structural borders'
  },
  {
    tag: 'Futuristic',
    keywords: /\b(futuristic|sci-fi|cyber|neon|glow|dark-mode tech|high-tech|modern dark|precision|technical)\b/i,
    rationalePrefix: 'Supported by dark technical surfaces, precision geometry, or luminous accents'
  },
  {
    tag: 'Geometric',
    keywords: /\b(geometric|grid|concentric|circular|modular|structured|angular|dot matrix|lattice)\b/i,
    rationalePrefix: 'Supported by geometric structure, modular layout, or repeated geometric forms'
  },
  {
    tag: 'Playful',
    keywords: /\b(playful|friendly|whimsical|rounded|vibrant|bubbly|illustrative|casual)\b/i,
    rationalePrefix: 'Supported by approachable rounded forms or expressive colour energy'
  },
  {
    tag: 'Corporate',
    keywords: /\b(corporate|enterprise|saas|professional|business|b2b|institutional|trustworthy)\b/i,
    rationalePrefix: 'Supported by structured enterprise/SaaS layout and professional presentation'
  },
  {
    tag: 'Luxury',
    keywords: /\b(luxury|premium|bespoke|opulent|high-end|sophisticated|boutique|prestigious)\b/i,
    rationalePrefix: 'Supported by restrained premium visual tone and elevated spacing'
  },
  {
    tag: 'Experimental',
    keywords: /\b(experimental|avant-garde|unconventional|asymmetric|expressive|artistic|kinetic)\b/i,
    rationalePrefix: 'Supported by unconventional layout rhythm or expressive visual treatment'
  }
];

function deriveEvidenceBackedStyleTags(
  visualAnalysis: VisualAnalysisResult,
  elements: readonly VisualElement[]
): EvidenceBackedStyleTag[] {
  const { summary, spacing, effects, layout, typography } = visualAnalysis.interpretation;
  const corpus = [
    summary.styleSummary,
    summary.designTone,
    summary.interfaceType,
    typography.headingFontStyle,
    typography.bodyFontStyle,
    effects.elevationStyle,
    effects.notes,
    layout.structureType
  ]
    .filter(Boolean)
    .join(' ');

  const results: EvidenceBackedStyleTag[] = [];
  const seen = new Set<StyleClassificationTag>();

  for (const rule of STYLE_RULES) {
    if (rule.keywords.test(corpus)) {
      seen.add(rule.tag);
      const parsed = styleTagSchema.safeParse({
        label: rule.tag,
        rationale: `${rule.rationalePrefix} ("${summary.designTone}").`,
        provenance: 'derived',
        confidence: summary.overallConfidence
      });
      if (parsed.success) {
        results.push(parsed.data);
      }
    }
  }

  // Also allow Geometric if M9 directly detected geometric motifs
  const geometricCount = elements.filter((el) => el.category === 'geometric-motif').length;
  if (!seen.has('Geometric') && geometricCount > 0) {
    const parsed = styleTagSchema.safeParse({
      label: 'Geometric',
      rationale: `Supported by ${geometricCount} detected geometric motif${geometricCount === 1 ? '' : 's'} on the screenshot.`,
      provenance: 'derived',
      confidence: 'medium'
    });
    if (parsed.success) {
      results.push(parsed.data);
      seen.add('Geometric');
    }
  }

  // Allow Minimalist if spacious density + flat/subtle-border elevation and not already tagged
  if (
    !seen.has('Minimalist') &&
    spacing.density === 'spacious' &&
    (effects.elevationStyle === 'flat' || effects.elevationStyle === 'subtle-border')
  ) {
    const parsed = styleTagSchema.safeParse({
      label: 'Minimalist',
      rationale: `Derived from spacious density paired with ${effects.elevationStyle} surface treatment.`,
      provenance: 'derived',
      confidence: 'medium'
    });
    if (parsed.success) {
      results.push(parsed.data);
    }
  }

  return results.slice(0, 5);
}

function parsePixelSize(raw: string, fallbackPx: number): number {
  const pxMatch = raw.match(/(\d+(?:\.\d+)?)\s*px/i);
  if (pxMatch) {
    return Math.min(48, Math.max(12, Math.round(Number(pxMatch[1]))));
  }
  const remMatch = raw.match(/(\d+(?:\.\d+)?)\s*rem/i);
  if (remMatch) {
    return Math.min(48, Math.max(12, Math.round(Number(remMatch[1]) * 16)));
  }
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const val = Number(numMatch[1]);
    if (val >= 10 && val <= 96) {
      return Math.min(48, Math.max(12, Math.round(val)));
    }
  }
  return fallbackPx;
}

function parseFontWeight(raw: string, fallbackWeight: number): number {
  const numMatch = raw.match(/\b([3-8]00)\b/);
  if (numMatch) return Number(numMatch[1]);
  const lower = raw.toLowerCase();
  if (lower.includes('extra') || lower.includes('black')) return 800;
  if (lower.includes('bold') && !lower.includes('semi')) return 700;
  if (lower.includes('semi')) return 600;
  if (lower.includes('medium')) return 500;
  if (lower.includes('light')) return 300;
  return fallbackWeight;
}

function parseLineHeight(raw: string, isHeading: boolean): number {
  const unitless = raw.match(/\b(1(?:\.\d+)?|2(?:\.\d+)?)\b/);
  if (unitless) {
    const val = Number(unitless[1]);
    if (val >= 1.0 && val <= 2.2) return val;
  }
  const lower = raw.toLowerCase();
  if (lower.includes('tight')) return 1.15;
  if (lower.includes('snug')) return 1.3;
  if (lower.includes('loose') || lower.includes('relaxed')) return 1.65;
  return isHeading ? 1.2 : 1.55;
}

function specimenSampleForLevel(level: string, isHeading: boolean): string {
  const lower = level.toLowerCase();
  if (lower.includes('display') || lower.includes('hero') || lower === 'h1') {
    return 'Visual structure shaped by deliberate proportion.';
  }
  if (lower.includes('h2') || lower.includes('section') || lower.includes('heading')) {
    return 'Clear typographic hierarchy establishes visual rhythm.';
  }
  if (lower.includes('h3') || lower.includes('card') || lower.includes('sub')) {
    return 'Structured headings anchor modular sections and cards.';
  }
  if (lower.includes('caption') || lower.includes('meta') || lower.includes('label') || lower.includes('eyebrow')) {
    return 'METADATA · 12PX SCALE · PROVENANCE VERIFIED';
  }
  if (isHeading) {
    return 'Balanced typographic expression across the interface.';
  }
  return 'Body copy relies on measured line-height, steady contrast, and comfortable measure so long-form descriptions stay legible across breakpoints.';
}

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase();
}

function roleToGroup(role: SemanticColorRole): AnatomyColorSwatch['group'] {
  switch (role) {
    case 'primary_brand':
      return 'dominant';
    case 'accent':
    case 'semantic_status':
      return 'accent';
    case 'background':
      return 'background';
    case 'surface':
      return 'surface';
    case 'primary_text':
    case 'secondary_text':
      return 'text';
    case 'border':
      return 'border';
  }
}

/**
 * Pure deterministic composition engine for the M10 Design Anatomy Board.
 * Consolidates existing M4 measured colours, M5 visual interpretation, M6 normalized
 * DesignSystem tokens, M8 regions, and M9 elements/patterns/crops without triggering
 * any extra AI calls or re-decoding images.
 */
export function buildAnatomyBoard(input: BuildAnatomyBoardInput): DesignAnatomyBoardModel {
  const { image, colorResult, visualAnalysis, designSystem, regions, elements, patterns, assets } =
    input;

  const hasScreenshot = Boolean(image);
  const hasMeasuredColors = Boolean(colorResult && colorResult.colors.length > 0);
  const hasVisualAi = Boolean(visualAnalysis);
  const hasDesignTokens = Boolean(designSystem && designSystem.tokens.length > 0);
  const hasRegions = regions.length > 0;
  const hasElements = elements.length > 0;

  // ── A. Visual Identity ──────────────────────────────────────────────────
  const identity = (() => {
    if (!visualAnalysis) {
      return {
        available: false,
        overallAesthetic: null,
        visualPersonality: null,
        interfaceType: null,
        themeMode: null,
        styleClassifications: [],
        dominantCharacteristics: [],
        distinctiveElements: [],
        recognisabilitySummary: null,
        overallConfidence: null
      };
    }

    const { summary, spacing, effects, layout, typography } = visualAnalysis.interpretation;
    const styleClassifications = deriveEvidenceBackedStyleTags(visualAnalysis, elements);

    const dominantCharacteristics: Array<{
      label: string;
      detail: string;
      provenance: TokenProvenance;
      confidence: ConfidenceLevel;
    }> = [
      {
        label: 'Surface & Elevation',
        detail: `${effects.elevationStyle.replace('-', ' ')} surfaces · ${effects.borderStyle}`,
        provenance: 'ai-inferred',
        confidence: effects.confidence
      },
      {
        label: 'Composition & Density',
        detail: `${layout.structureType} · ${spacing.density} density (${spacing.baseUnit} base unit)`,
        provenance: 'ai-inferred',
        confidence: spacing.confidence
      },
      {
        label: 'Typographic Voice',
        detail: `${typography.headingFontStyle} headings paired with ${typography.bodyFontStyle} body`,
        provenance: 'ai-inferred',
        confidence: typography.confidence
      }
    ];

    if (colorResult && colorResult.colors.length > 0) {
      const topTwo = colorResult.colors.slice(0, 2);
      dominantCharacteristics.unshift({
        label: 'Measured Palette Signature',
        detail: topTwo
          .map((c) => `${c.hex} (${c.percentage.toFixed(1)}%)`)
          .join(' anchored with '),
        provenance: 'measured',
        confidence: 'high'
      });
    }

    // Distinctive elements sourced strictly from verified M9 patterns & elements (or M8 regions)
    const distinctiveElements: DesignAnatomyBoardModel['identity']['distinctiveElements'] = [];
    for (const pat of patterns.slice(0, 2)) {
      const firstMember = elements.find((e) => pat.elementIds.includes(e.id));
      distinctiveElements.push({
        title: pat.name,
        subtitle: `Verified recurring pattern · ${pat.occurrenceCount}× occurrences`,
        selection: { kind: 'pattern', id: pat.id },
        targetBox: firstMember?.boundingBox ?? null,
        provenance: 'ai-inferred',
        confidence: pat.confidence
      });
    }
    for (const el of elements) {
      if (distinctiveElements.length >= 5) break;
      if (distinctiveElements.some((d) => d.title === el.name)) continue;
      distinctiveElements.push({
        title: el.name,
        subtitle: `${ELEMENT_CATEGORY_SHORT_LABELS[el.category]}${el.parentRegionName ? ` · ${el.parentRegionName}` : ''}`,
        selection: { kind: 'element', id: el.id },
        targetBox: el.boundingBox,
        provenance: 'ai-inferred',
        confidence: el.confidence
      });
    }

    const recognisabilityParts: string[] = [summary.styleSummary];
    if (patterns.length > 0) {
      recognisabilityParts.push(
        `Visual cohesion is reinforced by ${patterns.length} verified recurring pattern${patterns.length === 1 ? '' : 's'} (${patterns
          .slice(0, 2)
          .map((p) => p.name)
          .join(', ')}).`
      );
    } else if (elements.length > 0) {
      recognisabilityParts.push(
        `Distinctive visual cues include ${elements
          .slice(0, 3)
          .map((e) => e.name)
          .join(', ')}.`
      );
    }

    return {
      available: true,
      overallAesthetic: summary.styleSummary,
      visualPersonality: summary.designTone,
      interfaceType: summary.interfaceType,
      themeMode: summary.themeMode,
      styleClassifications,
      dominantCharacteristics,
      distinctiveElements,
      recognisabilitySummary: recognisabilityParts.join(' '),
      overallConfidence: summary.overallConfidence
    };
  })();

  // ── B. Colour Identity (M4 measured + M5/M6 semantic) ───────────────────
  const colour = (() => {
    const measuredByHex = new Map<string, { percentage: number; rank: number }>();
    const measuredSpectrum: AnatomyColorSwatch[] = [];

    if (colorResult) {
      for (const c of colorResult.colors) {
        const hex = normalizeHex(c.hex);
        measuredByHex.set(hex, { percentage: c.percentage, rank: c.rank });
        const parsed = colorSwatchSchema.safeParse({
          id: `measured-${c.rank}-${hex.slice(1)}`,
          hex,
          label: c.rank === 1 ? 'Dominant Canvas' : `Measured Tone #${c.rank}`,
          group: 'measured',
          role: null,
          cssVariable:
            designSystem?.byCategory.color.find(
              (t) => normalizeHex(t.value) === hex
            )?.cssVariable ?? null,
          coveragePercentage: Number(c.percentage.toFixed(1)),
          measuredRank: c.rank,
          provenance: 'measured',
          confidence: 'high',
          rationale: `Directly sampled from ${c.percentage.toFixed(1)}% of screenshot pixels.`
        });
        if (parsed.success) measuredSpectrum.push(parsed.data);
      }
    }

    const dominant: AnatomyColorSwatch[] = [];
    const accent: AnatomyColorSwatch[] = [];
    const backgroundAndSurface: AnatomyColorSwatch[] = [];
    const textAndBorder: AnatomyColorSwatch[] = [];

    const semanticAssignments = visualAnalysis?.interpretation.semanticColors ?? [];
    for (let idx = 0; idx < semanticAssignments.length; idx++) {
      const assignment = semanticAssignments[idx];
      const matchedHex = assignment.matchedMeasuredHex
        ? normalizeHex(assignment.matchedMeasuredHex)
        : null;
      const effectiveHex = matchedHex ?? normalizeHex(assignment.hex);
      const measuredInfo = matchedHex
        ? measuredByHex.get(matchedHex) ?? null
        : measuredByHex.get(effectiveHex) ?? null;

      const matchingToken = designSystem?.byCategory.color.find(
        (t) =>
          t.evidence.aiRole === assignment.role ||
          normalizeHex(t.value) === effectiveHex
      );

      const provenance: TokenProvenance = matchingToken
        ? matchingToken.provenance
        : measuredInfo
          ? 'derived'
          : 'ai-inferred';

      const group = roleToGroup(assignment.role);
      const parsed = colorSwatchSchema.safeParse({
        id: `semantic-${assignment.role}-${idx}`,
        hex: effectiveHex,
        label: assignment.label,
        group,
        role: assignment.role,
        cssVariable: matchingToken?.cssVariable ?? null,
        coveragePercentage: measuredInfo ? Number(measuredInfo.percentage.toFixed(1)) : null,
        measuredRank: measuredInfo?.rank ?? null,
        provenance,
        confidence: assignment.confidence,
        rationale: assignment.rationale
      });

      if (!parsed.success) continue;
      if (group === 'dominant') dominant.push(parsed.data);
      else if (group === 'accent') accent.push(parsed.data);
      else if (group === 'background' || group === 'surface') {
        backgroundAndSurface.push(parsed.data);
      } else {
        textAndBorder.push(parsed.data);
      }
    }

    // If no semantic dominant was returned yet (e.g., M4-only partial state), promote top measured swatches cleanly
    if (dominant.length === 0 && measuredSpectrum.length > 0) {
      dominant.push(...measuredSpectrum.slice(0, 3));
    }

    return {
      available: measuredSpectrum.length > 0 || semanticAssignments.length > 0,
      hasMeasuredPalette: measuredSpectrum.length > 0,
      hasSemanticRoles: semanticAssignments.length > 0,
      measuredSpectrum,
      roleSwatches: {
        dominant,
        accent,
        backgroundAndSurface,
        textAndBorder
      },
      totalMeasuredColors: measuredSpectrum.length,
      totalSemanticColors: semanticAssignments.length
    };
  })();

  // ── C. Typography Identity (M5 + M6) ────────────────────────────────────
  const typography = (() => {
    if (!visualAnalysis) {
      return {
        available: false,
        headingFontStyle: null,
        bodyFontStyle: null,
        monospaceDetected: false,
        scaleSummary: null,
        confidence: null,
        specimens: [],
        rawHierarchy: [],
        fontFamilyTokens: []
      };
    }

    const typo = visualAnalysis.interpretation.typography;
    const typoTokens = designSystem?.byCategory.typography ?? [];

    const specimens: AnatomyTypographySpecimen[] = [];
    typo.hierarchy.forEach((item, idx) => {
      const lowerLevel = item.level.toLowerCase();
      const isHeading =
        lowerLevel.includes('h1') ||
        lowerLevel.includes('h2') ||
        lowerLevel.includes('h3') ||
        lowerLevel.includes('display') ||
        lowerLevel.includes('hero') ||
        lowerLevel.includes('title') ||
        lowerLevel.includes('heading');

      const fallbackPx = isHeading ? Math.max(18, 36 - idx * 6) : Math.max(12, 16 - idx);
      const cssSizePx = parsePixelSize(item.estimatedSize, fallbackPx);
      const cssWeight = parseFontWeight(item.estimatedWeight, isHeading ? 600 : 400);
      const cssLineHeight = parseLineHeight(item.lineHeight, isHeading);

      const matchingToken = typoTokens.find(
        (t) =>
          t.name.toLowerCase().includes(lowerLevel.replace(/\s+/g, '-')) ||
          t.description.toLowerCase().includes(lowerLevel)
      );

      const parsed = typographySpecimenSchema.safeParse({
        id: `specimen-${idx}-${lowerLevel.replace(/[^a-z0-9]+/g, '-')}`,
        level: item.level,
        estimatedSize: item.estimatedSize,
        estimatedWeight: item.estimatedWeight,
        lineHeight: item.lineHeight,
        usage: item.usage,
        sampleText: specimenSampleForLevel(item.level, isHeading),
        cssSizePx,
        cssWeight,
        cssLineHeight,
        isHeading,
        cssVariable: matchingToken?.cssVariable ?? null,
        provenance: 'ai-inferred',
        confidence: item.confidence
      });

      if (parsed.success) specimens.push(parsed.data);
    });

    const fontFamilyTokens = typoTokens
      .filter((t) => t.cssType === 'fontFamily')
      .map((t) => ({
        name: t.name,
        cssVariable: t.cssVariable,
        value: t.value,
        provenance: t.provenance,
        confidence: t.confidence
      }));

    return {
      available: true,
      headingFontStyle: typo.headingFontStyle,
      bodyFontStyle: typo.bodyFontStyle,
      monospaceDetected: typo.monospaceDetected,
      scaleSummary: typo.scaleSummary,
      confidence: typo.confidence,
      specimens,
      rawHierarchy: typo.hierarchy,
      fontFamilyTokens
    };
  })();

  // ── D. Patterns & Motifs (M9) ───────────────────────────────────────────
  const motifs = elements.filter((el) => el.category === 'geometric-motif');
  const textures = elements.filter((el) => el.category === 'background-texture');
  const icons = elements.filter((el) => el.category === 'icon-symbol');
  const decorative = elements.filter((el) => el.category === 'decorative-detail');
  const patternVisualElementsCount =
    motifs.length + textures.length + icons.length + decorative.length;

  const patternsSection = {
    available: patterns.length > 0 || patternVisualElementsCount > 0,
    patterns: [...patterns],
    motifs,
    textures,
    icons,
    decorative,
    totalVisualElements: patternVisualElementsCount,
    recurringCount:
      patterns.length +
      [...motifs, ...textures, ...icons, ...decorative].filter(
        (el) => el.repetitionStatus === 'recurring'
      ).length
  };

  // ── E. Components & Shapes (M9 component-style + M5 components + M6 radii/borders) ──
  const croppedComponents = elements.filter((el) => el.category === 'component-style');
  const inferredComponents = visualAnalysis?.interpretation.components ?? [];
  const borderRadii = visualAnalysis?.interpretation.effects.borderRadiusScale ?? [];
  const borderTokens = (designSystem?.byCategory.border ?? []).map((t) => ({
    name: t.name,
    cssVariable: t.cssVariable,
    value: t.value,
    provenance: t.provenance,
    confidence: t.confidence
  }));
  const sharedComponentPatterns = patterns.filter(
    (p) => p.patternType === 'shared-component-language'
  );

  const componentsSection = {
    available:
      croppedComponents.length > 0 ||
      inferredComponents.length > 0 ||
      borderRadii.length > 0 ||
      borderTokens.length > 0,
    croppedComponents,
    inferredComponents,
    borderRadii,
    borderTokens,
    sharedComponentPatterns
  };

  // ── F. Layout & Composition (M5 layout/spacing + M8 regions) ────────────
  const layoutSection = (() => {
    if (!visualAnalysis && regions.length === 0) {
      return {
        available: false,
        structureType: null,
        gridColumns: null,
        alignment: null,
        contentWidth: null,
        confidence: null,
        spacing: null,
        inferredRegions: [],
        detectedRegions: []
      };
    }

    const layoutData = visualAnalysis?.interpretation.layout ?? null;
    const spacingData = visualAnalysis?.interpretation.spacing ?? null;

    return {
      available: true,
      structureType: layoutData?.structureType ?? null,
      gridColumns: layoutData?.gridColumns ?? null,
      alignment: layoutData?.alignment ?? null,
      contentWidth: layoutData?.contentWidth ?? null,
      confidence: layoutData?.confidence ?? null,
      spacing: spacingData
        ? {
            baseUnit: spacingData.baseUnit,
            density: spacingData.density,
            sectionRhythm: spacingData.sectionRhythm,
            containerPadding: spacingData.containerPadding,
            scaleSteps: spacingData.scaleSteps,
            confidence: spacingData.confidence
          }
        : null,
      inferredRegions: layoutData?.regions ?? [],
      detectedRegions: [...regions]
    };
  })();

  // ── G. Effects & Surface Language (M5 effects + M6 shadows + M9 surfaces) ──
  const effectsSection = (() => {
    const effectsData = visualAnalysis?.interpretation.effects ?? null;
    const shadowTokens = (designSystem?.byCategory.shadow ?? []).map((t) => ({
      name: t.name,
      cssVariable: t.cssVariable,
      value: t.value,
      provenance: t.provenance,
      confidence: t.confidence
    }));

    const available = Boolean(
      effectsData || shadowTokens.length > 0 || textures.length > 0 || decorative.length > 0
    );

    return {
      available,
      elevationStyle: effectsData?.elevationStyle ?? null,
      borderStyle: effectsData?.borderStyle ?? null,
      shadowStyle: effectsData?.shadowStyle ?? null,
      notes: effectsData?.notes ?? null,
      confidence: effectsData?.confidence ?? null,
      borderRadiusScale: effectsData?.borderRadiusScale ?? [],
      surfaceElements: textures,
      decorativeElements: decorative,
      shadowTokens
    };
  })();

  const populatedSections = [
    identity.available,
    colour.available,
    typography.available,
    patternsSection.available,
    componentsSection.available,
    layoutSection.available,
    effectsSection.available
  ].filter(Boolean).length;

  return {
    completeness: {
      hasScreenshot,
      hasMeasuredColors,
      hasVisualAi,
      hasDesignTokens,
      hasRegions,
      hasElements,
      populatedSections,
      totalSections: 7
    },
    identity,
    colour,
    typography,
    patterns: patternsSection,
    components: componentsSection,
    layout: layoutSection,
    effects: effectsSection,
    assets: {
      elementAssets: assets.elementAssets
    }
  };
}
