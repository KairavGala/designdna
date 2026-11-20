import type {
  ConfidenceLevel,
  SemanticColorRole,
  VisualAnalysisResult
} from '../../types/analysis';
import type { ExtractedColor, PaletteExtractionResult, RGBColor } from '../../types/colors';
import {
  TOKEN_CATEGORY_ORDER,
  type DesignSystem,
  type DesignSystemReconciliationNote,
  type DesignSystemSourceInfo,
  type DesignToken,
  type TokenCategory
} from '../../types/designSystem';
import {
  deltaE76,
  formatHsl,
  formatRgb,
  getRelativeLuminance,
  rgbToLab
} from '../imageProcessing/colorConversions';
import { designSystemSchema } from './designSystem.schema';
import { generateCssVariables, generateJsonTokens } from './formatters';

export interface NormalizeDesignSystemInput {
  sourceImage: {
    name: string;
    format: string;
    width: number;
    height: number;
  };
  colorResult: PaletteExtractionResult;
  visualAnalysis: VisualAnalysisResult | null;
}

const CSS_PREFIX = '--ddna-';
/** Perceptual CIE76 Lab threshold below which an AI HEX estimate is anchored to the measured M4 pixel cluster */
const COLOR_ANCHOR_DELTA_E_THRESHOLD = 12;

const SEMANTIC_ROLE_MAP: Record<
  SemanticColorRole,
  { slug: string; id: string; defaultLabel: string; priority: number }
> = {
  background: { slug: 'bg-canvas', id: 'color.bg.canvas', defaultLabel: 'Canvas Background', priority: 1 },
  surface: { slug: 'bg-surface', id: 'color.bg.surface', defaultLabel: 'Surface Background', priority: 2 },
  primary_text: { slug: 'text-primary', id: 'color.text.primary', defaultLabel: 'Primary Text', priority: 3 },
  secondary_text: { slug: 'text-secondary', id: 'color.text.secondary', defaultLabel: 'Secondary Text', priority: 4 },
  primary_brand: { slug: 'brand-primary', id: 'color.brand.primary', defaultLabel: 'Primary Brand', priority: 5 },
  accent: { slug: 'accent', id: 'color.accent', defaultLabel: 'Accent', priority: 6 },
  border: { slug: 'border-default', id: 'color.border.default', defaultLabel: 'Default Border', priority: 7 },
  semantic_status: { slug: 'status-accent', id: 'color.status.accent', defaultLabel: 'Semantic Status', priority: 8 }
};

function slugify(input: string, fallback: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (!cleaned) return fallback;
  return /^[a-z]/.test(cleaned) ? cleaned : `${fallback}-${cleaned}`;
}

function hexToRgb(hex: string): RGBColor | null {
  const match = hex.trim().match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase();
}

function contrastRatio(a: RGBColor, b: RGBColor): number {
  const la = getRelativeLuminance(a);
  const lb = getRelativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function roundNumber(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function findClosestMeasuredColor(
  targetHex: string,
  measuredColors: ExtractedColor[]
): { color: ExtractedColor; deltaE: number } | null {
  const rgb = hexToRgb(targetHex);
  if (!rgb || measuredColors.length === 0) return null;

  const targetLab = rgbToLab(rgb);
  let best: { color: ExtractedColor; deltaE: number } | null = null;

  for (const candidate of measuredColors) {
    const candidateLab = rgbToLab(candidate.rgb);
    const distance = roundNumber(deltaE76(targetLab, candidateLab), 2);
    if (
      !best ||
      distance < best.deltaE ||
      (distance === best.deltaE && candidate.rank < best.color.rank)
    ) {
      best = { color: candidate, deltaE: distance };
    }
  }

  return best;
}

function inferCssFontStack(description: string, isMono = false): string {
  const lower = description.toLowerCase();
  if (isMono || lower.includes('mono') || lower.includes('jetbrains') || lower.includes('fira code')) {
    return `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  }
  if (lower.includes('serif') && !lower.includes('sans-serif') && !lower.includes('sans serif')) {
    return `Georgia, 'Times New Roman', Cambria, serif`;
  }
  if (lower.includes('plus jakarta')) {
    return `'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif`;
  }
  if (lower.includes('geist')) {
    return `'Geist', 'Inter', system-ui, -apple-system, sans-serif`;
  }
  if (lower.includes('inter')) {
    return `'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  }
  return `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
}

function normalizePxDimension(raw: string, fallback?: string): string | null {
  const trimmed = raw.trim();
  const pxMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*px/i);
  if (pxMatch) {
    const num = Number(pxMatch[1]);
    if (Number.isFinite(num) && num >= 0) {
      return `${Number(num.toFixed(2))}px`;
    }
  }
  const remMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*rem/i);
  if (remMatch) {
    const num = Number(remMatch[1]);
    if (Number.isFinite(num) && num >= 0) {
      return `${Number(num.toFixed(3))}rem`;
    }
  }
  if (/\b(full|pill|9999|circle)\b/i.test(trimmed)) {
    return '9999px';
  }
  if (/\b(none|0|sharp|square)\b/i.test(trimmed)) {
    return '0px';
  }
  return fallback ?? null;
}

function normalizeFontWeight(raw: string): string {
  const numMatch = raw.match(/\b([1-9]00)\b/);
  if (numMatch) return numMatch[1];
  const lower = raw.toLowerCase();
  if (lower.includes('extra') && lower.includes('bold')) return '800';
  if (lower.includes('semi')) return '600';
  if (lower.includes('bold')) return '700';
  if (lower.includes('medium')) return '500';
  if (lower.includes('light')) return '300';
  return '400';
}

function normalizeLineHeight(raw: string): string {
  const ratioMatch = raw.match(/\b(1(?:\.\d{1,2})?|2(?:\.0)?)\b/);
  if (ratioMatch && !raw.toLowerCase().includes('px')) {
    return ratioMatch[1];
  }
  const px = normalizePxDimension(raw);
  if (px) return px;
  const percentMatch = raw.match(/(\d{2,3})%/);
  if (percentMatch) {
    return String(roundNumber(Number(percentMatch[1]) / 100, 2));
  }
  return '1.4';
}

function normalizeBorderCssValue(rawBorderStyle: string, borderColorHex: string): string {
  const lower = rawBorderStyle.toLowerCase();
  if (lower.includes('none') && !lower.includes('1px') && !lower.includes('2px')) {
    return 'none';
  }
  const widthMatch = rawBorderStyle.match(/(\d+(?:\.\d+)?)\s*px/i);
  const width = widthMatch ? `${widthMatch[1]}px` : '1px';
  const style = lower.includes('dashed')
    ? 'dashed'
    : lower.includes('dotted')
      ? 'dotted'
      : 'solid';
  const hexMatch = rawBorderStyle.match(/#[0-9A-Fa-f]{6}\b/);
  const color = hexMatch ? normalizeHex(hexMatch[0]) : borderColorHex;
  return `${width} ${style} ${color}`;
}

function normalizeShadowCssValue(
  elevationStyle: 'flat' | 'subtle-border' | 'layered-shadow' | 'glass',
  rawShadowStyle: string
): string {
  const lower = rawShadowStyle.toLowerCase();
  if (
    lower.includes('none') ||
    lower.includes('no shadow') ||
    elevationStyle === 'flat' ||
    (elevationStyle === 'subtle-border' && !lower.includes('0 ') && !lower.includes('px'))
  ) {
    return 'none';
  }
  if (elevationStyle === 'glass') {
    return '0 8px 24px rgba(15, 23, 42, 0.08)';
  }
  if (lower.includes('strong') || lower.includes('heavy') || lower.includes('deep')) {
    return '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 4px 10px -4px rgba(15, 23, 42, 0.06)';
  }
  return '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)';
}

function normalizeContentWidth(raw: string, capturedWidth: number): string {
  const px = normalizePxDimension(raw);
  if (px) return px;
  const lower = raw.toLowerCase();
  if (lower.includes('full')) return '100%';
  if (lower.includes('narrow') || lower.includes('compact')) return '960px';
  if (lower.includes('wide')) return '1440px';
  return `${Math.min(Math.max(capturedWidth, 960), 1440)}px`;
}

function normalizeGridColumns(raw: string): string {
  const match = raw.match(/\b(\d{1,2})\b/);
  if (match) {
    const cols = Number(match[1]);
    if (cols >= 1 && cols <= 24) return String(cols);
  }
  return '12';
}

function makeUniqueName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  let suffix = 2;
  while (usedNames.has(`${baseName}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${baseName}-${suffix}`;
  usedNames.add(unique);
  return unique;
}

/**
 * Pure, deterministic M6 DesignSystem normalisation engine.
 * Combines M4 measured pixel colour extraction with M5 AI-inferred visual interpretation,
 * reconciles inconsistencies without overwriting measured facts, deduplicates near-identical
 * tokens, derives accessible WCAG contrast pairs, and validates via Zod.
 */
export function normalizeDesignSystem(input: NormalizeDesignSystemInput): DesignSystem {
  const { sourceImage, colorResult, visualAnalysis } = input;
  const interpretation = visualAnalysis?.interpretation ?? null;

  const byCategory: Record<TokenCategory, DesignToken[]> = {
    color: [],
    typography: [],
    spacing: [],
    radius: [],
    border: [],
    shadow: [],
    layout: []
  };

  const reconciliationNotes: DesignSystemReconciliationNote[] = [];
  const usedNames = new Set<string>();
  let deduplicatedCount = 0;

  // Map measured colours by uppercase HEX for O(1) exact lookups
  const measuredColors = [...colorResult.colors].sort((a, b) => a.rank - b.rank);
  const measuredByHex = new Map<string, ExtractedColor>();
  for (const c of measuredColors) {
    measuredByHex.set(normalizeHex(c.hex), c);
  }

  // Track which measured colours have been promoted to semantic colour tokens
  const promotedMeasuredHexes = new Set<string>();
  const seenSemanticRoleHex = new Set<string>();

  // ---------------------------------------------------------------------------
  // 1. COLORS — Reconcile M5 semantic roles against M4 measured palette facts
  // ---------------------------------------------------------------------------
  let primaryBrandHex: string | null = null;
  let canvasBgHex: string | null = null;
  let resolvedBorderHex = '#EAE9E6';

  if (interpretation) {
    const sortedSemantic = [...interpretation.semanticColors].sort(
      (a, b) => SEMANTIC_ROLE_MAP[a.role].priority - SEMANTIC_ROLE_MAP[b.role].priority
    );

    for (const semantic of sortedSemantic) {
      const roleMeta = SEMANTIC_ROLE_MAP[semantic.role];
      const aiHex = normalizeHex(semantic.hex);
      const declaredMatchedHex = semantic.matchedMeasuredHex
        ? normalizeHex(semantic.matchedMeasuredHex)
        : null;

      const exactMeasured =
        measuredByHex.get(aiHex) ??
        (declaredMatchedHex ? measuredByHex.get(declaredMatchedHex) : undefined) ??
        null;

      const closestMeasured = exactMeasured
        ? { color: exactMeasured, deltaE: exactMeasured.hex === aiHex ? 0 : roundNumber(deltaE76(rgbToLab(hexToRgb(aiHex) ?? exactMeasured.rgb), rgbToLab(exactMeasured.rgb)), 2) }
        : findClosestMeasuredColor(aiHex, measuredColors);

      let finalHex = aiHex;
      let provenance: DesignToken['provenance'] = 'ai-inferred';
      let confidence: ConfidenceLevel = semantic.confidence;
      let reconciliation: DesignToken['reconciliation'];
      const evidenceNotes: string[] = [semantic.rationale];
      let evidenceMeasured: ExtractedColor | null = null;
      let evidenceDeltaE: number | undefined;

      if (closestMeasured && closestMeasured.deltaE === 0) {
        // Exact match with M4 measured pixel cluster
        finalHex = normalizeHex(closestMeasured.color.hex);
        provenance = 'measured';
        evidenceMeasured = closestMeasured.color;
        evidenceDeltaE = 0;
        reconciliation = {
          status: 'aligned',
          measuredValue: finalHex,
          aiSuggestedValue: aiHex,
          resolution: `Exact match with M4 measured Rank #${closestMeasured.color.rank} (${closestMeasured.color.percentage.toFixed(1)}% coverage).`
        };
        evidenceNotes.push(
          `Measured from ${closestMeasured.color.pixelCount.toLocaleString()} sampled pixels (${formatRgb(closestMeasured.color.rgb)}, ${formatHsl(closestMeasured.color.hsl)}).`
        );
      } else if (
        closestMeasured &&
        closestMeasured.deltaE <= COLOR_ANCHOR_DELTA_E_THRESHOLD
      ) {
        // Perceptually near-identical: preserve M4 measured fact instead of AI approximation
        finalHex = normalizeHex(closestMeasured.color.hex);
        provenance = 'measured';
        evidenceMeasured = closestMeasured.color;
        evidenceDeltaE = closestMeasured.deltaE;
        reconciliation = {
          status: 'anchored-to-measured',
          measuredValue: finalHex,
          aiSuggestedValue: aiHex,
          resolution: `Anchored to M4 measured value ${finalHex} (ΔE ${closestMeasured.deltaE} from AI estimate ${aiHex}) so measured pixels are not overwritten.`
        };
        evidenceNotes.push(
          `AI estimated ${aiHex}; anchored to closest measured pixel cluster ${finalHex} (Rank #${closestMeasured.color.rank}, ΔE ${closestMeasured.deltaE}).`
        );
      } else if (declaredMatchedHex && measuredByHex.has(declaredMatchedHex)) {
        // AI claimed a measured match that diverged strongly from AI's own hex — preserve measured fact & log conflict
        const measured = measuredByHex.get(declaredMatchedHex)!;
        const delta =
          hexToRgb(aiHex) !== null
            ? roundNumber(deltaE76(rgbToLab(hexToRgb(aiHex)!), rgbToLab(measured.rgb)), 2)
            : undefined;
        finalHex = normalizeHex(measured.hex);
        provenance = 'measured';
        evidenceMeasured = measured;
        evidenceDeltaE = delta;
        confidence = confidence === 'high' ? 'medium' : confidence;
        reconciliation = {
          status: 'conflict-preserved',
          measuredValue: finalHex,
          aiSuggestedValue: aiHex,
          resolution: `Conflict between AI estimate (${aiHex}) and referenced measured colour (${finalHex}). Preserved measured pixel value and recorded AI estimate for transparency.`
        };
        evidenceNotes.push(
          `Preserved measured ${finalHex} over divergent AI hex ${aiHex}.`
        );
      } else {
        // AI-only visual estimate (e.g., thin text or 1px borders below M4 sampling threshold)
        finalHex = aiHex;
        provenance = 'ai-inferred';
        evidenceDeltaE = closestMeasured?.deltaE;
        reconciliation = {
          status: 'ai-only',
          measuredValue: closestMeasured ? normalizeHex(closestMeasured.color.hex) : undefined,
          aiSuggestedValue: aiHex,
          resolution: closestMeasured
            ? `Retained AI visual estimate ${aiHex} because nearest measured cluster (${normalizeHex(closestMeasured.color.hex)}) is ΔE ${closestMeasured.deltaE} away (likely thin text or hairline border).`
            : 'Retained AI visual estimate because no close measured pixel cluster matched.'
        };
      }

      // Deduplicate identical (role + finalHex)
      const dedupeKey = `${semantic.role}:${finalHex}`;
      if (seenSemanticRoleHex.has(dedupeKey)) {
        deduplicatedCount += 1;
        reconciliationNotes.push({
          id: `dedupe-color-${semantic.role}-${finalHex}`,
          category: 'color',
          tokenName: `color-${roleMeta.slug}`,
          kind: 'deduplicated',
          aiSuggestedValue: aiHex,
          finalValue: finalHex,
          explanation: `Skipped duplicate semantic colour assignment for role "${semantic.role}" with identical value ${finalHex}.`
        });
        continue;
      }
      seenSemanticRoleHex.add(dedupeKey);

      const baseTokenName = `color-${roleMeta.slug}`;
      const tokenName = makeUniqueName(baseTokenName, usedNames);
      const tokenId =
        tokenName === baseTokenName
          ? roleMeta.id
          : `color.${tokenName.replace(/^color-/, '').replace(/-/g, '.')}`;

      if (evidenceMeasured) {
        promotedMeasuredHexes.add(normalizeHex(evidenceMeasured.hex));
      }

      if (reconciliation.status === 'anchored-to-measured' || reconciliation.status === 'conflict-preserved') {
        reconciliationNotes.push({
          id: `reconcile-${tokenName}`,
          category: 'color',
          tokenName,
          kind: reconciliation.status,
          measuredValue: reconciliation.measuredValue,
          aiSuggestedValue: reconciliation.aiSuggestedValue,
          finalValue: finalHex,
          explanation: reconciliation.resolution
        });
      }

      if (semantic.role === 'primary_brand' && !primaryBrandHex) primaryBrandHex = finalHex;
      if (semantic.role === 'background' && !canvasBgHex) canvasBgHex = finalHex;
      if (semantic.role === 'border') resolvedBorderHex = finalHex;

      byCategory.color.push({
        id: tokenId,
        name: tokenName,
        cssVariable: `${CSS_PREFIX}${tokenName}`,
        category: 'color',
        cssType: 'color',
        value: finalHex,
        rawValue: aiHex !== finalHex ? aiHex : undefined,
        provenance,
        confidence,
        description: `${semantic.label} — ${semantic.rationale}`,
        evidence: {
          source: evidenceMeasured
            ? 'M4 Canvas Pixel Extraction + M5 Semantic Role Mapping'
            : 'M5 Gemini Visual Interpretation',
          measuredHex: evidenceMeasured ? normalizeHex(evidenceMeasured.hex) : undefined,
          pixelPercentage: evidenceMeasured ? roundNumber(evidenceMeasured.percentage, 2) : undefined,
          measuredRank: evidenceMeasured?.rank,
          aiRole: semantic.role,
          aiEstimate: aiHex,
          deltaE: evidenceDeltaE,
          notes: evidenceNotes
        },
        reconciliation
      });
    }
  }

  // Preserve ALL remaining unmapped M4 measured palette colours so no measured pixel facts are lost
  let paletteIndex = 1;
  for (const measured of measuredColors) {
    const hex = normalizeHex(measured.hex);
    if (promotedMeasuredHexes.has(hex)) {
      deduplicatedCount += 1;
      continue;
    }

    const tokenName = makeUniqueName(`color-palette-${paletteIndex}`, usedNames);
    paletteIndex += 1;

    byCategory.color.push({
      id: `color.palette.${paletteIndex - 1}`,
      name: tokenName,
      cssVariable: `${CSS_PREFIX}${tokenName}`,
      category: 'color',
      cssType: 'color',
      value: hex,
      provenance: 'measured',
      confidence: measured.reliability,
      description: `Measured palette colour (Rank #${measured.rank}, ${measured.percentage.toFixed(1)}% of sampled screenshot pixels).`,
      evidence: {
        source: 'M4 Canvas Pixel Extraction',
        measuredHex: hex,
        pixelPercentage: roundNumber(measured.percentage, 2),
        measuredRank: measured.rank,
        notes: [
          `${measured.pixelCount.toLocaleString()} sampled pixels (${measured.percentage.toFixed(2)}% coverage).`,
          `${formatRgb(measured.rgb)} · ${formatHsl(measured.hsl)} · intra-cluster ΔE spread ${measured.intraClusterSpread.toFixed(1)}.`
        ]
      }
    });
  }

  // Derived colour token: WCAG 2.1 accessible foreground colour on Primary Brand (or Rank #1 accent)
  const brandTargetHex =
    primaryBrandHex ??
    measuredColors.find((c) => c.hsl.s >= 25)?.hex ??
    null;

  if (brandTargetHex) {
    const brandRgb = hexToRgb(brandTargetHex);
    if (brandRgb) {
      const white: RGBColor = { r: 255, g: 255, b: 255 };
      const nearBlack: RGBColor = { r: 17, g: 24, b: 39 };
      const whiteRatio = contrastRatio(brandRgb, white);
      const darkRatio = contrastRatio(brandRgb, nearBlack);
      const useWhite = whiteRatio >= darkRatio;
      const chosenHex = useWhite ? '#FFFFFF' : '#111827';
      const chosenRatio = useWhite ? whiteRatio : darkRatio;
      const wcagGrade = chosenRatio >= 7 ? 'WCAG AAA' : chosenRatio >= 4.5 ? 'WCAG AA' : 'WCAG AA Large';

      const tokenName = makeUniqueName('color-brand-on-primary', usedNames);
      byCategory.color.push({
        id: 'color.brand.on-primary',
        name: tokenName,
        cssVariable: `${CSS_PREFIX}${tokenName}`,
        category: 'color',
        cssType: 'color',
        value: chosenHex,
        provenance: 'derived',
        confidence: 'high',
        description: `Accessible foreground colour calculated for text and icons placed on ${brandTargetHex}.`,
        evidence: {
          source: 'Deterministic WCAG 2.1 Relative Luminance Contrast Calculation',
          measuredHex: measuredByHex.has(normalizeHex(brandTargetHex))
            ? normalizeHex(brandTargetHex)
            : undefined,
          contrastRatio: chosenRatio,
          notes: [
            `Selected ${chosenHex} against ${brandTargetHex} with ${chosenRatio}:1 contrast (${wcagGrade}).`,
            `Compared white (${whiteRatio}:1) vs. dark ink #111827 (${darkRatio}:1).`
          ]
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. TYPOGRAPHY — Font stacks + normalized hierarchy scale
  // ---------------------------------------------------------------------------
  if (interpretation) {
    const { typography } = interpretation;

    const headingStack = inferCssFontStack(typography.headingFontStyle, false);
    const bodyStack = inferCssFontStack(typography.bodyFontStyle, false);

    const headingFontName = makeUniqueName('font-heading', usedNames);
    byCategory.typography.push({
      id: 'typography.font.heading',
      name: headingFontName,
      cssVariable: `${CSS_PREFIX}${headingFontName}`,
      category: 'typography',
      cssType: 'fontFamily',
      value: headingStack,
      rawValue: typography.headingFontStyle,
      provenance: 'ai-inferred',
      confidence: typography.confidence,
      description: `Heading font stack mapped from AI visual classification: ${typography.headingFontStyle}.`,
      evidence: {
        source: 'M5 Gemini Visual Interpretation',
        aiEstimate: typography.headingFontStyle,
        notes: [typography.scaleSummary]
      }
    });

    if (bodyStack === headingStack) {
      // Deduplicate identical body font stack by deriving an alias reference or single shared font token
      const bodyFontName = makeUniqueName('font-body', usedNames);
      byCategory.typography.push({
        id: 'typography.font.body',
        name: bodyFontName,
        cssVariable: `${CSS_PREFIX}${bodyFontName}`,
        category: 'typography',
        cssType: 'fontFamily',
        value: `var(${CSS_PREFIX}${headingFontName})`,
        rawValue: typography.bodyFontStyle,
        provenance: 'derived',
        confidence: typography.confidence,
        description: `Body font stack aliased to heading stack (${typography.bodyFontStyle}) to avoid duplicate font declarations.`,
        evidence: {
          source: 'Deterministic Token Aliasing (from M5 Typography)',
          aiEstimate: typography.bodyFontStyle,
          notes: [`Matched heading stack "${headingStack}"; emitted CSS variable alias.`]
        }
      });
      deduplicatedCount += 1;
    } else {
      const bodyFontName = makeUniqueName('font-body', usedNames);
      byCategory.typography.push({
        id: 'typography.font.body',
        name: bodyFontName,
        cssVariable: `${CSS_PREFIX}${bodyFontName}`,
        category: 'typography',
        cssType: 'fontFamily',
        value: bodyStack,
        rawValue: typography.bodyFontStyle,
        provenance: 'ai-inferred',
        confidence: typography.confidence,
        description: `Body font stack mapped from AI visual classification: ${typography.bodyFontStyle}.`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: typography.bodyFontStyle,
          notes: [typography.scaleSummary]
        }
      });
    }

    if (typography.monospaceDetected) {
      const monoName = makeUniqueName('font-mono', usedNames);
      byCategory.typography.push({
        id: 'typography.font.mono',
        name: monoName,
        cssVariable: `${CSS_PREFIX}${monoName}`,
        category: 'typography',
        cssType: 'fontFamily',
        value: inferCssFontStack('monospace', true),
        provenance: 'ai-inferred',
        confidence: typography.confidence,
        description: 'Monospace font stack for technical labels, numeric values, and code snippets detected in screenshot.',
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: 'monospaceDetected = true',
          notes: ['Monospace typography was visually identified in the interface.']
        }
      });
    }

    const seenTypeSignatures = new Set<string>();
    for (const item of typography.hierarchy) {
      const levelSlug = slugify(item.level, 'level');
      const normSize = normalizePxDimension(item.estimatedSize, '16px')!;
      const normWeight = normalizeFontWeight(item.estimatedWeight);
      const normLeading = normalizeLineHeight(item.lineHeight);

      const signature = `${normSize}|${normWeight}|${normLeading}`;
      if (seenTypeSignatures.has(signature)) {
        deduplicatedCount += 1;
        reconciliationNotes.push({
          id: `dedupe-type-${levelSlug}`,
          category: 'typography',
          tokenName: `text-${levelSlug}-size`,
          kind: 'deduplicated',
          aiSuggestedValue: `${item.estimatedSize} / ${item.estimatedWeight}`,
          finalValue: normSize,
          explanation: `Skipped duplicate typography level "${item.level}" with identical size/weight/line-height (${normSize}, ${normWeight}, ${normLeading}).`
        });
        continue;
      }
      seenTypeSignatures.add(signature);

      const sizeName = makeUniqueName(`text-${levelSlug}-size`, usedNames);
      byCategory.typography.push({
        id: `typography.scale.${levelSlug}.size`,
        name: sizeName,
        cssVariable: `${CSS_PREFIX}${sizeName}`,
        category: 'typography',
        cssType: 'dimension',
        value: normSize,
        rawValue: item.estimatedSize !== normSize ? item.estimatedSize : undefined,
        provenance: 'ai-inferred',
        confidence: item.confidence,
        description: `${item.level} font size — ${item.usage}`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: `${item.estimatedSize} / weight ${item.estimatedWeight} / leading ${item.lineHeight}`,
          notes: [
            `Estimated weight: ${normWeight} · Estimated line-height: ${normLeading}.`,
            item.usage
          ]
        }
      });

      const weightName = makeUniqueName(`text-${levelSlug}-weight`, usedNames);
      byCategory.typography.push({
        id: `typography.scale.${levelSlug}.weight`,
        name: weightName,
        cssVariable: `${CSS_PREFIX}${weightName}`,
        category: 'typography',
        cssType: 'fontWeight',
        value: normWeight,
        rawValue: item.estimatedWeight !== normWeight ? item.estimatedWeight : undefined,
        provenance: 'ai-inferred',
        confidence: item.confidence,
        description: `${item.level} font weight (${item.estimatedWeight}).`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: item.estimatedWeight,
          notes: [`Paired with ${CSS_PREFIX}${sizeName} (${normSize}).`]
        }
      });

      const leadingName = makeUniqueName(`text-${levelSlug}-leading`, usedNames);
      byCategory.typography.push({
        id: `typography.scale.${levelSlug}.leading`,
        name: leadingName,
        cssVariable: `${CSS_PREFIX}${leadingName}`,
        category: 'typography',
        cssType: 'number',
        value: normLeading,
        rawValue: item.lineHeight !== normLeading ? item.lineHeight : undefined,
        provenance: 'ai-inferred',
        confidence: item.confidence,
        description: `${item.level} line height (${item.lineHeight}).`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: item.lineHeight,
          notes: [`Normalized for CSS line-height on ${item.level}.`]
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SPACING — Base unit, container padding, deduplicated scale steps + derived grid
  // ---------------------------------------------------------------------------
  if (interpretation) {
    const { spacing } = interpretation;
    const seenSpacingValues = new Map<string, string>();

    const baseUnitValue = normalizePxDimension(spacing.baseUnit, '4px')!;
    const baseName = makeUniqueName('space-unit', usedNames);
    seenSpacingValues.set(baseUnitValue, baseName);

    byCategory.spacing.push({
      id: 'spacing.unit',
      name: baseName,
      cssVariable: `${CSS_PREFIX}${baseName}`,
      category: 'spacing',
      cssType: 'dimension',
      value: baseUnitValue,
      rawValue: spacing.baseUnit !== baseUnitValue ? spacing.baseUnit : undefined,
      provenance: 'ai-inferred',
      confidence: spacing.confidence,
      description: `Base spacing unit (${spacing.density} layout density).`,
      evidence: {
        source: 'M5 Gemini Visual Interpretation',
        aiEstimate: spacing.baseUnit,
        notes: [spacing.sectionRhythm]
      }
    });

    const containerPadValue = normalizePxDimension(spacing.containerPadding);
    if (containerPadValue) {
      const containerName = makeUniqueName('space-container', usedNames);
      seenSpacingValues.set(containerPadValue, containerName);
      byCategory.spacing.push({
        id: 'spacing.container',
        name: containerName,
        cssVariable: `${CSS_PREFIX}${containerName}`,
        category: 'spacing',
        cssType: 'dimension',
        value: containerPadValue,
        rawValue: spacing.containerPadding !== containerPadValue ? spacing.containerPadding : undefined,
        provenance: 'ai-inferred',
        confidence: spacing.confidence,
        description: `Primary container/card padding inferred from layout (${spacing.containerPadding}).`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: spacing.containerPadding,
          notes: [`Normalized from "${spacing.containerPadding}" to CSS dimension ${containerPadValue}.`]
        }
      });
    }

    for (const step of spacing.scaleSteps) {
      const normVal = normalizePxDimension(step.value);
      if (!normVal) continue;

      const existingName = seenSpacingValues.get(normVal);
      if (existingName) {
        deduplicatedCount += 1;
        reconciliationNotes.push({
          id: `dedupe-space-${slugify(step.token, 'step')}-${normVal}`,
          category: 'spacing',
          tokenName: existingName,
          kind: 'deduplicated',
          aiSuggestedValue: `${step.token}: ${step.value}`,
          finalValue: normVal,
          explanation: `Merged spacing step "${step.token}" (${normVal}) into existing token ${CSS_PREFIX}${existingName} to prevent duplicate spacing values.`
        });
        continue;
      }

      const rawSlug = slugify(step.token, 'step').replace(/^space-|^spacing-/, '');
      const stepName = makeUniqueName(`space-${rawSlug || 'step'}`, usedNames);
      seenSpacingValues.set(normVal, stepName);

      byCategory.spacing.push({
        id: `spacing.scale.${rawSlug || stepName}`,
        name: stepName,
        cssVariable: `${CSS_PREFIX}${stepName}`,
        category: 'spacing',
        cssType: 'dimension',
        value: normVal,
        rawValue: step.value !== normVal ? step.value : undefined,
        provenance: 'ai-inferred',
        confidence: spacing.confidence,
        description: step.usage,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: `${step.token} = ${step.value}`,
          notes: [step.usage]
        }
      });
    }

    // Derived standard spacing multiples (2x, 4x, 6x base unit) ONLY for steps not already covered
    const basePxNum = Number(baseUnitValue.replace(/px$/i, ''));
    if (Number.isFinite(basePxNum) && basePxNum >= 2 && basePxNum <= 16) {
      const derivedMultiples: Array<{ suffix: string; factor: number; usage: string }> = [
        { suffix: 'sm', factor: 2, usage: 'Derived compact gap (2× base spacing unit).' },
        { suffix: 'md', factor: 4, usage: 'Derived standard component padding/gap (4× base spacing unit).' },
        { suffix: 'lg', factor: 6, usage: 'Derived section rhythm spacing (6× base spacing unit).' }
      ];

      for (const mult of derivedMultiples) {
        const val = `${basePxNum * mult.factor}px`;
        if (seenSpacingValues.has(val)) continue;
        const name = makeUniqueName(`space-${mult.suffix}`, usedNames);
        seenSpacingValues.set(val, name);
        byCategory.spacing.push({
          id: `spacing.derived.${mult.suffix}`,
          name,
          cssVariable: `${CSS_PREFIX}${name}`,
          category: 'spacing',
          cssType: 'dimension',
          value: val,
          provenance: 'derived',
          confidence: spacing.confidence,
          description: mult.usage,
          evidence: {
            source: 'Deterministic Base-Unit Scale Derivation',
            notes: [`Calculated as ${mult.factor} × ${baseUnitValue} (${CSS_PREFIX}${baseName}).`]
          }
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. BORDER RADII — Deduplicated corner radius scale
  // ---------------------------------------------------------------------------
  if (interpretation) {
    const { effects } = interpretation;
    const seenRadiusValues = new Map<string, string>();

    for (const item of effects.borderRadiusScale) {
      const normVal = normalizePxDimension(item.value);
      if (!normVal) continue;

      const existing = seenRadiusValues.get(normVal);
      if (existing) {
        deduplicatedCount += 1;
        reconciliationNotes.push({
          id: `dedupe-radius-${slugify(item.label, 'r')}-${normVal}`,
          category: 'radius',
          tokenName: existing,
          kind: 'deduplicated',
          aiSuggestedValue: `${item.label}: ${item.value}`,
          finalValue: normVal,
          explanation: `Merged duplicate border radius "${item.label}" (${normVal}) into ${CSS_PREFIX}${existing}.`
        });
        continue;
      }

      const rawSlug = slugify(item.label, 'radius').replace(/^radius-|^border-radius-/, '');
      const tokenName = makeUniqueName(`radius-${rawSlug || 'default'}`, usedNames);
      seenRadiusValues.set(normVal, tokenName);

      byCategory.radius.push({
        id: `radius.${rawSlug || tokenName}`,
        name: tokenName,
        cssVariable: `${CSS_PREFIX}${tokenName}`,
        category: 'radius',
        cssType: 'dimension',
        value: normVal,
        rawValue: item.value !== normVal ? item.value : undefined,
        provenance: 'ai-inferred',
        confidence: effects.confidence,
        description: `${item.label} — ${item.usage}`,
        evidence: {
          source: 'M5 Gemini Visual Interpretation',
          aiEstimate: `${item.label}: ${item.value}`,
          notes: [item.usage]
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. BORDERS & 6. SHADOWS — Normalized CSS shorthand + elevation tokens
  // ---------------------------------------------------------------------------
  if (interpretation) {
    const { effects } = interpretation;

    const borderCss = normalizeBorderCssValue(effects.borderStyle, resolvedBorderHex);
    const borderName = makeUniqueName('border-default', usedNames);
    byCategory.border.push({
      id: 'border.default',
      name: borderName,
      cssVariable: `${CSS_PREFIX}${borderName}`,
      category: 'border',
      cssType: 'border',
      value: borderCss,
      rawValue: effects.borderStyle !== borderCss ? effects.borderStyle : undefined,
      provenance: 'ai-inferred',
      confidence: effects.confidence,
      description: `Primary container and divider border shorthand (${effects.elevationStyle}).`,
      evidence: {
        source: 'M5 Gemini Visual Interpretation',
        aiEstimate: effects.borderStyle,
        notes: [effects.notes]
      }
    });

    const shadowCss = normalizeShadowCssValue(effects.elevationStyle, effects.shadowStyle);
    const shadowName = makeUniqueName('shadow-surface', usedNames);
    byCategory.shadow.push({
      id: 'shadow.surface',
      name: shadowName,
      cssVariable: `${CSS_PREFIX}${shadowName}`,
      category: 'shadow',
      cssType: 'shadow',
      value: shadowCss,
      rawValue: effects.shadowStyle !== shadowCss ? effects.shadowStyle : undefined,
      provenance: shadowCss === 'none' ? 'ai-inferred' : 'derived',
      confidence: effects.confidence,
      description: `Surface elevation shadow normalized from "${effects.elevationStyle}" treatment (${effects.shadowStyle}).`,
      evidence: {
        source:
          shadowCss === 'none'
            ? 'M5 Gemini Visual Interpretation'
            : 'Normalized CSS Shadow Derived from M5 Elevation Style',
        aiEstimate: `${effects.elevationStyle} · ${effects.shadowStyle}`,
        notes: [effects.notes]
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 7. LAYOUT — Grid columns, content max width, and captured viewport aspect
  // ---------------------------------------------------------------------------
  if (interpretation) {
    const { layout, spacing } = interpretation;

    const gridCols = normalizeGridColumns(layout.gridColumns);
    const gridName = makeUniqueName('layout-grid-columns', usedNames);
    byCategory.layout.push({
      id: 'layout.grid.columns',
      name: gridName,
      cssVariable: `${CSS_PREFIX}${gridName}`,
      category: 'layout',
      cssType: 'number',
      value: gridCols,
      rawValue: layout.gridColumns !== gridCols ? layout.gridColumns : undefined,
      provenance: 'ai-inferred',
      confidence: layout.confidence,
      description: `${layout.structureType} (${layout.alignment}).`,
      evidence: {
        source: 'M5 Gemini Visual Interpretation',
        aiEstimate: `${layout.structureType} · ${layout.gridColumns} columns`,
        notes: layout.regions.map((r) => `${r.name} (${r.proportion}): ${r.role}`)
      }
    });

    const contentWidth = normalizeContentWidth(layout.contentWidth, sourceImage.width);
    const widthName = makeUniqueName('layout-content-max-width', usedNames);
    byCategory.layout.push({
      id: 'layout.content.max-width',
      name: widthName,
      cssVariable: `${CSS_PREFIX}${widthName}`,
      category: 'layout',
      cssType: 'dimension',
      value: contentWidth,
      rawValue: layout.contentWidth !== contentWidth ? layout.contentWidth : undefined,
      provenance: 'ai-inferred',
      confidence: layout.confidence,
      description: `Primary content container width (${layout.contentWidth}).`,
      evidence: {
        source: 'M5 Gemini Visual Interpretation',
        aiEstimate: layout.contentWidth,
        notes: [`Captured screenshot width: ${sourceImage.width}px · Density: ${spacing.density}.`]
      }
    });
  }

  // Always include deterministic measured viewport dimensions from the uploaded screenshot
  const viewportWidthName = makeUniqueName('layout-source-width', usedNames);
  byCategory.layout.push({
    id: 'layout.source.width',
    name: viewportWidthName,
    cssVariable: `${CSS_PREFIX}${viewportWidthName}`,
    category: 'layout',
    cssType: 'dimension',
    value: `${sourceImage.width}px`,
    provenance: 'measured',
    confidence: 'high',
    description: `Intrinsic pixel width of the analysed screenshot (${sourceImage.width} × ${sourceImage.height} px).`,
    evidence: {
      source: 'M3 Browser Image Decode Metadata',
      notes: [`Measured directly from decoded ${sourceImage.format} image bitmap.`]
    }
  });

  // Flatten in canonical deterministic category order
  const allTokens: DesignToken[] = [];
  for (const category of TOKEN_CATEGORY_ORDER) {
    allTokens.push(...byCategory[category]);
  }

  let measuredCount = 0;
  let aiInferredCount = 0;
  let derivedCount = 0;
  for (const token of allTokens) {
    if (token.provenance === 'measured') measuredCount += 1;
    else if (token.provenance === 'ai-inferred') aiInferredCount += 1;
    else derivedCount += 1;
  }

  const conflictCount = reconciliationNotes.filter(
    (n) => n.kind === 'anchored-to-measured' || n.kind === 'conflict-preserved'
  ).length;

  const sourceInfo: DesignSystemSourceInfo = {
    fileName: sourceImage.name,
    format: sourceImage.format,
    width: sourceImage.width,
    height: sourceImage.height,
    colorExtractionMethod: colorResult.statistics.method,
    aiModel: visualAnalysis?.meta.model ?? null,
    hasAiInterpretation: Boolean(interpretation)
  };

  const inferredThemeMode: 'light' | 'dark' | 'mixed' =
    interpretation?.summary.themeMode ??
    (canvasBgHex && hexToRgb(canvasBgHex)
      ? getRelativeLuminance(hexToRgb(canvasBgHex)!) > 0.5
        ? 'light'
        : 'dark'
      : measuredColors[0] && getRelativeLuminance(measuredColors[0].rgb) > 0.5
        ? 'light'
        : 'dark');

  const cssVariables = generateCssVariables(byCategory, sourceInfo);
  const jsonBundle = generateJsonTokens(byCategory, sourceInfo);

  const candidate: DesignSystem = {
    schemaVersion: '1.0.0',
    source: sourceInfo,
    summary: {
      styleSummary:
        interpretation?.summary.styleSummary ??
        `Measured ${measuredColors.length}-colour palette extracted locally from ${sourceImage.name}.`,
      designTone: interpretation?.summary.designTone ?? 'Measured pixel palette',
      interfaceType: interpretation?.summary.interfaceType ?? 'Web Interface Screenshot',
      themeMode: inferredThemeMode,
      overallConfidence: interpretation?.summary.overallConfidence ?? 'high'
    },
    tokens: allTokens,
    byCategory,
    reconciliationNotes,
    metrics: {
      totalTokens: allTokens.length,
      measuredCount,
      aiInferredCount,
      derivedCount,
      deduplicatedCount,
      conflictCount
    },
    cssVariables,
    jsonBundle
  };

  // Validate entire normalised DesignSystem deterministically via Zod
  return designSystemSchema.parse(candidate);
}
