import {
  deltaE76,
  getRelativeLuminance,
  rgbToLab
} from '../imageProcessing/colorConversions';
import type { ConfidenceLevel, TypographyHierarchyItem } from '../../types/analysis';
import type { ExtractedColor } from '../../types/colors';
import type {
  AnalysisContextSnapshot,
  ColorComparisonModel,
  ComparisonAvailability,
  ComponentsMotifsComparisonModel,
  CropComparisonItem,
  DesignComparisonModel,
  DifferenceIntelligenceModel,
  IntelligenceFindingItem,
  MatchedElementPair,
  PaletteCharacteristicsSummary,
  RefinementInsightItem,
  ScreenshotGeometryComparison,
  SharedColorMatch,
  SharedPatternComparison,
  TypographyComparisonModel,
  TypographySpecimenComparisonRow,
  VisualIdentityDimensionRow
} from '../../types/comparison';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  type VisualElement
} from '../../types/investigation';

/** CIE76 Lab distance threshold below which two measured colours are considered visually shared */
const SHARED_COLOR_DELTA_E_THRESHOLD = 14;
const NEAR_IDENTICAL_DELTA_E_THRESHOLD = 6;

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'for',
  'from',
  'style',
  'visual',
  'element',
  'section',
  'primary',
  'secondary',
  'main',
  'default',
  'block',
  'group',
  'item',
  'area'
]);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '—';
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(ratio - 16 / 10) < 0.06) return '16:10';
  if (Math.abs(ratio - 4 / 3) < 0.06) return '4:3';
  if (Math.abs(ratio - 3 / 2) < 0.06) return '3:2';
  if (Math.abs(ratio - 1) < 0.06) return '1:1';
  return `${round2(ratio)}:1`;
}

function combineConfidence(
  a: ConfidenceLevel | null | undefined,
  b: ConfidenceLevel | null | undefined
): ConfidenceLevel | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;
  if (a === 'low' || b === 'low') return 'low';
  if (a === 'medium' || b === 'medium') return 'medium';
  return 'high';
}

function tokenizeWords(input: string): Set<string> {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function parsePxNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)\s*px/i);
  if (match) return parseFloat(match[1]);
  const remMatch = raw.match(/(\d+(?:\.\d+)?)\s*rem/i);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  return null;
}

function buildGeometryComparison(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot
): ScreenshotGeometryComparison {
  const dimA = a.image
    ? {
        width: a.image.width,
        height: a.image.height,
        aspectRatio: round2(a.image.width / Math.max(1, a.image.height)),
        label: `${a.image.width} × ${a.image.height} px (${formatAspectRatio(a.image.width, a.image.height)})`
      }
    : null;
  const dimB = b.image
    ? {
        width: b.image.width,
        height: b.image.height,
        aspectRatio: round2(b.image.width / Math.max(1, b.image.height)),
        label: `${b.image.width} × ${b.image.height} px (${formatAspectRatio(b.image.width, b.image.height)})`
      }
    : null;

  if (!dimA || !dimB) {
    return {
      availability: dimA || dimB ? 'partial' : 'unavailable',
      designADimensions: dimA,
      designBDimensions: dimB,
      aspectRatioDelta: null,
      summary: 'Load both Design A and Design B screenshots to compare viewport geometry side by side.'
    };
  }

  const aspectRatioDelta = round2(Math.abs(dimA.aspectRatio - dimB.aspectRatio));
  const sameDimensions = dimA.width === dimB.width && dimA.height === dimB.height;

  const summary = sameDimensions
    ? `Both screenshots share identical pixel dimensions (${dimA.width} × ${dimA.height} px).`
    : aspectRatioDelta <= 0.1
      ? `Different resolutions (${dimA.width}×${dimA.height} vs ${dimB.width}×${dimB.height}) with closely aligned aspect ratios.`
      : `Distinct viewport proportions (${formatAspectRatio(dimA.width, dimA.height)} vs ${formatAspectRatio(dimB.width, dimB.height)}). Synchronized scrolling adapts proportionally.`;

  return {
    availability: 'ready',
    designADimensions: dimA,
    designBDimensions: dimB,
    aspectRatioDelta,
    summary
  };
}

function summarizePalette(
  colors: readonly ExtractedColor[],
  themeMode: 'light' | 'dark' | 'mixed' | null
): PaletteCharacteristicsSummary | null {
  if (colors.length === 0) return null;
  const dominant = colors[0];
  const dominantLuminance = round2(getRelativeLuminance(dominant.rgb));
  const toneLabel =
    dominantLuminance < 0.25
      ? 'Dark-dominant'
      : dominantLuminance > 0.65
        ? 'Light-dominant'
        : 'Mid-tone';

  const totalWeight = colors.reduce((sum, c) => sum + Math.max(0.1, c.percentage), 0);
  const weightedSat =
    colors.reduce((sum, c) => sum + c.hsl.s * Math.max(0.1, c.percentage), 0) /
    Math.max(1, totalWeight);

  const vividCount = colors.filter((c) => c.hsl.s >= 45 && c.hsl.l >= 15 && c.hsl.l <= 85).length;
  const neutralCount = colors.filter((c) => c.hsl.s < 18).length;

  return {
    dominantHex: dominant.hex,
    dominantPercentage: round1(dominant.percentage),
    dominantLuminance,
    toneLabel,
    averageSaturation: round1(weightedSat),
    extractedCount: colors.length,
    vividCount,
    neutralCount,
    themeMode
  };
}

function buildColorComparison(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot
): ColorComparisonModel {
  const paletteA = a.colorResult?.colors ?? [];
  const paletteB = b.colorResult?.colors ?? [];
  const summaryA = summarizePalette(
    paletteA,
    a.visualAnalysis?.interpretation.summary.themeMode ?? null
  );
  const summaryB = summarizePalette(
    paletteB,
    b.visualAnalysis?.interpretation.summary.themeMode ?? null
  );

  if (paletteA.length === 0 || paletteB.length === 0) {
    const missing =
      paletteA.length === 0 && paletteB.length === 0
        ? 'Extract measured colours for both Design A and Design B to compare palettes.'
        : paletteA.length === 0
          ? 'Extract measured colours for Design A to unlock palette comparison.'
          : 'Extract measured colours for Design B to unlock palette comparison.';
    return {
      availability: paletteA.length > 0 || paletteB.length > 0 ? 'partial' : 'unavailable',
      unavailableReason: missing,
      paletteA,
      paletteB,
      summaryA,
      summaryB,
      sharedColors: [],
      distinctiveA: [...paletteA],
      distinctiveB: [...paletteB],
      paletteOverlapPercentage: null,
      dominantLuminanceDelta: null,
      averageSaturationDelta: null,
      observations: []
    };
  }

  const labsA = paletteA.map((c) => ({ color: c, lab: rgbToLab(c.rgb) }));
  const labsB = paletteB.map((c) => ({ color: c, lab: rgbToLab(c.rgb) }));

  // Greedy deterministic 1-to-1 closest perceptual match (CIE76 Lab ΔE <= 14)
  const candidatePairs: Array<{
    idxA: number;
    idxB: number;
    deltaE: number;
  }> = [];

  for (let i = 0; i < labsA.length; i++) {
    for (let j = 0; j < labsB.length; j++) {
      const dE = deltaE76(labsA[i].lab, labsB[j].lab);
      if (dE <= SHARED_COLOR_DELTA_E_THRESHOLD) {
        candidatePairs.push({ idxA: i, idxB: j, deltaE: round1(dE) });
      }
    }
  }

  candidatePairs.sort((p1, p2) => p1.deltaE - p2.deltaE || p1.idxA - p2.idxA || p1.idxB - p2.idxB);

  const matchedA = new Set<number>();
  const matchedB = new Set<number>();
  const sharedColors: SharedColorMatch[] = [];

  for (const pair of candidatePairs) {
    if (matchedA.has(pair.idxA) || matchedB.has(pair.idxB)) continue;
    matchedA.add(pair.idxA);
    matchedB.add(pair.idxB);
    const colorA = paletteA[pair.idxA];
    const colorB = paletteB[pair.idxB];
    sharedColors.push({
      id: `shared-${colorA.hex}-${colorB.hex}`,
      colorA,
      colorB,
      deltaE: pair.deltaE,
      proportionDelta: round1(colorA.percentage - colorB.percentage),
      similarityLabel: pair.deltaE <= NEAR_IDENTICAL_DELTA_E_THRESHOLD ? 'Near-Identical' : 'Close Match'
    });
  }

  const distinctiveA = paletteA.filter((_, idx) => !matchedA.has(idx));
  const distinctiveB = paletteB.filter((_, idx) => !matchedB.has(idx));

  // Shared coverage overlap estimate (average matched pixel share across both screenshots)
  const matchedShareA = sharedColors.reduce((sum, m) => sum + m.colorA.percentage, 0);
  const matchedShareB = sharedColors.reduce((sum, m) => sum + m.colorB.percentage, 0);
  const paletteOverlapPercentage = round1(Math.min(100, (matchedShareA + matchedShareB) / 2));

  const dominantLuminanceDelta =
    summaryA && summaryB ? round2(summaryA.dominantLuminance - summaryB.dominantLuminance) : null;
  const averageSaturationDelta =
    summaryA && summaryB ? round1(summaryA.averageSaturation - summaryB.averageSaturation) : null;

  const observations: Array<{ text: string; provenance: 'measured' | 'derived' }> = [];

  if (summaryA && summaryB) {
    if (summaryA.toneLabel !== summaryB.toneLabel) {
      observations.push({
        text: `Design A is ${summaryA.toneLabel.toLowerCase()} (dominant ${summaryA.dominantHex} at ${summaryA.dominantPercentage}%), whereas Design B is ${summaryB.toneLabel.toLowerCase()} (dominant ${summaryB.dominantHex} at ${summaryB.dominantPercentage}%).`,
        provenance: 'measured'
      });
    } else {
      observations.push({
        text: `Both designs share a ${summaryA.toneLabel.toLowerCase()} foundation (${summaryA.dominantHex} at ${summaryA.dominantPercentage}% in Design A vs ${summaryB.dominantHex} at ${summaryB.dominantPercentage}% in Design B).`,
        provenance: 'measured'
      });
    }

    if (averageSaturationDelta !== null && Math.abs(averageSaturationDelta) >= 8) {
      const moreChromatic = averageSaturationDelta > 0 ? 'Design A' : 'Design B';
      observations.push({
        text: `${moreChromatic} carries higher weighted chromatic saturation (${summaryA.averageSaturation}% avg in Design A vs ${summaryB.averageSaturation}% avg in Design B).`,
        provenance: 'derived'
      });
    }

    if (sharedColors.length > 0) {
      const topShared = sharedColors[0];
      observations.push({
        text: `${sharedColors.length} measured colour cluster${sharedColors.length === 1 ? '' : 's'} fall within ΔE ≤ ${SHARED_COLOR_DELTA_E_THRESHOLD} across both screenshots (closest match: ${topShared.colorA.hex} ↔ ${topShared.colorB.hex}, ΔE ${topShared.deltaE}).`,
        provenance: 'measured'
      });
    } else {
      observations.push({
        text: `Zero measured colour clusters fall within perceptual ΔE ≤ ${SHARED_COLOR_DELTA_E_THRESHOLD}, confirming distinct colour systems.`,
        provenance: 'measured'
      });
    }
  }

  return {
    availability: 'ready',
    unavailableReason: null,
    paletteA,
    paletteB,
    summaryA,
    summaryB,
    sharedColors,
    distinctiveA,
    distinctiveB,
    paletteOverlapPercentage,
    dominantLuminanceDelta,
    averageSaturationDelta,
    observations
  };
}

function buildTypographyComparison(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot
): TypographyComparisonModel {
  const typoA = a.visualAnalysis?.interpretation.typography ?? null;
  const typoB = b.visualAnalysis?.interpretation.typography ?? null;

  const visualEstimateNotice =
    'Typography classifications, estimated sizes, weights, and line heights are AI-inferred visual estimates from screenshot pixels — not extracted webfont files or live CSS rules.';

  if (!typoA || !typoB) {
    const unavailableReason =
      !typoA && !typoB
        ? 'Run AI Visual Interpretation on both Design A and Design B to compare typography hierarchy and specimens.'
        : !typoA
          ? 'Run AI Visual Interpretation on Design A to unlock side-by-side typography comparison.'
          : 'Run AI Visual Interpretation on Design B to unlock side-by-side typography comparison.';

    return {
      availability: typoA || typoB ? 'partial' : 'unavailable',
      unavailableReason,
      visualEstimateNotice,
      designA: typoA
        ? {
            headingStyle: typoA.headingFontStyle,
            bodyStyle: typoA.bodyFontStyle,
            monospaceDetected: typoA.monospaceDetected,
            scaleSummary: typoA.scaleSummary,
            confidence: typoA.confidence,
            hierarchyCount: typoA.hierarchy.length
          }
        : null,
      designB: typoB
        ? {
            headingStyle: typoB.headingFontStyle,
            bodyStyle: typoB.bodyFontStyle,
            monospaceDetected: typoB.monospaceDetected,
            scaleSummary: typoB.scaleSummary,
            confidence: typoB.confidence,
            hierarchyCount: typoB.hierarchy.length
          }
        : null,
      specimenRows: [],
      observations: []
    };
  }

  const maxRows = Math.max(typoA.hierarchy.length, typoB.hierarchy.length);
  const specimenRows: TypographySpecimenComparisonRow[] = [];

  for (let i = 0; i < maxRows; i++) {
    const itemA: TypographyHierarchyItem | null = typoA.hierarchy[i] ?? null;
    const itemB: TypographyHierarchyItem | null = typoB.hierarchy[i] ?? null;
    const levelLabel = itemA && itemB
      ? itemA.level.toLowerCase() === itemB.level.toLowerCase()
        ? itemA.level
        : `${itemA.level} / ${itemB.level}`
      : (itemA?.level ?? itemB?.level ?? `Level ${i + 1}`);

    let differenceNote = 'Present in only one design.';
    if (itemA && itemB) {
      const pxA = parsePxNumber(itemA.estimatedSize);
      const pxB = parsePxNumber(itemB.estimatedSize);
      const notes: string[] = [];
      if (pxA !== null && pxB !== null && Math.abs(pxA - pxB) >= 3) {
        notes.push(
          pxA > pxB
            ? `Design A scales larger (${itemA.estimatedSize} vs ${itemB.estimatedSize})`
            : `Design B scales larger (${itemB.estimatedSize} vs ${itemA.estimatedSize})`
        );
      } else if (itemA.estimatedSize !== itemB.estimatedSize) {
        notes.push(`${itemA.estimatedSize} vs ${itemB.estimatedSize}`);
      }
      if (itemA.estimatedWeight !== itemB.estimatedWeight) {
        notes.push(`weight ${itemA.estimatedWeight} vs ${itemB.estimatedWeight}`);
      }
      if (itemA.lineHeight !== itemB.lineHeight) {
        notes.push(`leading ${itemA.lineHeight} vs ${itemB.lineHeight}`);
      }
      differenceNote = notes.length > 0 ? notes.join(' · ') : 'Closely aligned estimated scale and weight.';
    }

    specimenRows.push({
      levelLabel,
      designA: itemA,
      designB: itemB,
      differenceNote
    });
  }

  const observations: Array<{ text: string; provenance: 'ai-inferred' | 'derived' }> = [];

  if (typoA.headingFontStyle.toLowerCase() === typoB.headingFontStyle.toLowerCase()) {
    observations.push({
      text: `Both designs share a similar estimated heading classification (${typoA.headingFontStyle}).`,
      provenance: 'ai-inferred'
    });
  } else {
    observations.push({
      text: `Heading tone diverges: Design A reads as ${typoA.headingFontStyle}, while Design B reads as ${typoB.headingFontStyle}.`,
      provenance: 'ai-inferred'
    });
  }

  if (typoA.monospaceDetected !== typoB.monospaceDetected) {
    const monoHolder = typoA.monospaceDetected ? 'Design A' : 'Design B';
    observations.push({
      text: `${monoHolder} introduces monospace typography for technical/data accents, whereas the counterpart relies purely on proportional faces.`,
      provenance: 'ai-inferred'
    });
  } else if (typoA.monospaceDetected && typoB.monospaceDetected) {
    observations.push({
      text: 'Both screenshots incorporate monospace accents alongside their primary proportional typefaces.',
      provenance: 'ai-inferred'
    });
  }

  const topPxA = parsePxNumber(typoA.hierarchy[0]?.estimatedSize);
  const topPxB = parsePxNumber(typoB.hierarchy[0]?.estimatedSize);
  if (topPxA !== null && topPxB !== null && Math.abs(topPxA - topPxB) >= 6) {
    const bolder = topPxA > topPxB ? 'Design A' : 'Design B';
    observations.push({
      text: `${bolder} applies stronger headline display scale (${typoA.hierarchy[0]?.estimatedSize} in Design A vs ${typoB.hierarchy[0]?.estimatedSize} in Design B).`,
      provenance: 'derived'
    });
  }

  return {
    availability: 'ready',
    unavailableReason: null,
    visualEstimateNotice,
    designA: {
      headingStyle: typoA.headingFontStyle,
      bodyStyle: typoA.bodyFontStyle,
      monospaceDetected: typoA.monospaceDetected,
      scaleSummary: typoA.scaleSummary,
      confidence: typoA.confidence,
      hierarchyCount: typoA.hierarchy.length
    },
    designB: {
      headingStyle: typoB.headingFontStyle,
      bodyStyle: typoB.bodyFontStyle,
      monospaceDetected: typoB.monospaceDetected,
      scaleSummary: typoB.scaleSummary,
      confidence: typoB.confidence,
      hierarchyCount: typoB.hierarchy.length
    },
    specimenRows,
    observations
  };
}

function toCropItem(
  element: VisualElement,
  elementAssets: Record<string, { primaryCropUrl: string | null; measuredColors: Array<{ hex: string; percentage: number }> }>
): CropComparisonItem {
  const asset = elementAssets[element.id];
  return {
    id: element.id,
    name: element.name,
    category: element.category,
    subcategory: element.subcategory,
    description: element.description,
    parentRegionName: element.parentRegionName,
    confidence: element.confidence,
    occurrenceCount: element.occurrenceCount,
    cropUrl: asset?.primaryCropUrl ?? null,
    measuredColors: asset?.measuredColors ?? [],
    styleTraits: element.characteristics.styleTraits
  };
}

function buildComponentsMotifsComparison(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot
): ComponentsMotifsComparisonModel {
  const hasAiA = Boolean(a.visualAnalysis);
  const hasAiB = Boolean(b.visualAnalysis);

  const itemsA = a.elements.map((el) => toCropItem(el, a.elementAssets));
  const itemsB = b.elements.map((el) => toCropItem(el, b.elementAssets));

  if (!hasAiA || !hasAiB) {
    const unavailableReason =
      !hasAiA && !hasAiB
        ? 'Run AI Visual Interpretation on both designs to extract and compare component and motif screenshot crops.'
        : !hasAiA
          ? 'Run AI Visual Interpretation on Design A to compare components and motifs.'
          : 'Run AI Visual Interpretation on Design B to compare components and motifs.';
    return {
      availability: hasAiA || hasAiB ? 'partial' : 'unavailable',
      unavailableReason,
      matchedElements: [],
      sharedPatterns: [],
      uniqueToA: itemsA,
      uniqueToB: itemsB,
      uniquePatternsA: [...a.patterns],
      uniquePatternsB: [...b.patterns],
      totalElementsA: itemsA.length,
      totalElementsB: itemsB.length,
      totalPatternsA: a.patterns.length,
      totalPatternsB: b.patterns.length
    };
  }

  // Conservative correspondence matching:
  // Only pair elements in the SAME category with verifiable subcategory or semantic name overlap.
  // Never invent matches when no reliable correspondence exists.
  const candidates: Array<{
    idxA: number;
    idxB: number;
    score: number;
    basis: string;
  }> = [];

  for (let i = 0; i < itemsA.length; i++) {
    for (let j = 0; j < itemsB.length; j++) {
      const elA = itemsA[i];
      const elB = itemsB[j];
      if (elA.category !== elB.category) continue;

      const subA = tokenizeWords(elA.subcategory);
      const subB = tokenizeWords(elB.subcategory);
      const nameA = tokenizeWords(`${elA.name} ${elA.subcategory}`);
      const nameB = tokenizeWords(`${elB.name} ${elB.subcategory}`);

      const exactSubMatch =
        elA.subcategory.trim().toLowerCase() === elB.subcategory.trim().toLowerCase() &&
        elA.subcategory.trim().length > 0;
      const subSim = jaccardSimilarity(subA, subB);
      const nameSim = jaccardSimilarity(nameA, nameB);

      if (exactSubMatch) {
        candidates.push({
          idxA: i,
          idxB: j,
          score: round2(0.75 + nameSim * 0.25),
          basis: `Shared ${ELEMENT_CATEGORY_SHORT_LABELS[elA.category]} · ${elA.subcategory}`
        });
      } else if (subSim >= 0.4 || nameSim >= 0.35) {
        candidates.push({
          idxA: i,
          idxB: j,
          score: round2(Math.max(subSim, nameSim)),
          basis: `Shared ${ELEMENT_CATEGORY_SHORT_LABELS[elA.category]} vocabulary`
        });
      }
    }
  }

  candidates.sort((c1, c2) => c2.score - c1.score || c1.idxA - c2.idxA || c1.idxB - c2.idxB);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const matchedElements: MatchedElementPair[] = [];

  for (const cand of candidates) {
    if (usedA.has(cand.idxA) || usedB.has(cand.idxB)) continue;
    usedA.add(cand.idxA);
    usedB.add(cand.idxB);
    matchedElements.push({
      id: `match-${itemsA[cand.idxA].id}-${itemsB[cand.idxB].id}`,
      matchBasis: cand.basis,
      category: itemsA[cand.idxA].category,
      itemA: itemsA[cand.idxA],
      itemB: itemsB[cand.idxB],
      similarityScore: cand.score
    });
  }

  const uniqueToA = itemsA.filter((_, idx) => !usedA.has(idx));
  const uniqueToB = itemsB.filter((_, idx) => !usedB.has(idx));

  // Pattern relationship matching strictly by identical PatternRelationshipType
  const usedPatA = new Set<number>();
  const usedPatB = new Set<number>();
  const sharedPatterns: SharedPatternComparison[] = [];

  for (let i = 0; i < a.patterns.length; i++) {
    for (let j = 0; j < b.patterns.length; j++) {
      if (usedPatA.has(i) || usedPatB.has(j)) continue;
      if (a.patterns[i].patternType === b.patterns[j].patternType) {
        usedPatA.add(i);
        usedPatB.add(j);
        sharedPatterns.push({
          id: `shared-pat-${a.patterns[i].id}-${b.patterns[j].id}`,
          patternType: a.patterns[i].patternType,
          patternA: a.patterns[i],
          patternB: b.patterns[j]
        });
      }
    }
  }

  const uniquePatternsA = a.patterns.filter((_, idx) => !usedPatA.has(idx));
  const uniquePatternsB = b.patterns.filter((_, idx) => !usedPatB.has(idx));

  const bothEmpty = itemsA.length === 0 && itemsB.length === 0 && a.patterns.length === 0 && b.patterns.length === 0;

  return {
    availability: bothEmpty ? 'unavailable' : 'ready',
    unavailableReason: bothEmpty
      ? 'No visual components, motifs, or recurring patterns were detected in either screenshot.'
      : null,
    matchedElements,
    sharedPatterns,
    uniqueToA,
    uniqueToB,
    uniquePatternsA,
    uniquePatternsB,
    totalElementsA: itemsA.length,
    totalElementsB: itemsB.length,
    totalPatternsA: a.patterns.length,
    totalPatternsB: b.patterns.length
  };
}

function buildVisualIdentityRows(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot,
  colorComparison: ColorComparisonModel,
  componentsMotifs: ComponentsMotifsComparisonModel
): VisualIdentityDimensionRow[] {
  const va = a.visualAnalysis?.interpretation ?? null;
  const vb = b.visualAnalysis?.interpretation ?? null;

  const availabilityFor = (valA: string | null, valB: string | null): ComparisonAvailability => {
    if (valA && valB) return 'ready';
    if (valA || valB) return 'partial';
    return 'unavailable';
  };

  // 1. Overall visual style & aesthetic direction
  const styleA = va
    ? `${va.summary.designTone} · ${va.summary.interfaceType} (${va.summary.themeMode} theme) — ${va.summary.styleSummary}`
    : null;
  const styleB = vb
    ? `${vb.summary.designTone} · ${vb.summary.interfaceType} (${vb.summary.themeMode} theme) — ${vb.summary.styleSummary}`
    : null;

  // 2. Colour identity & palette (measured + AI theme)
  const colorAVal = colorComparison.summaryA
    ? `${colorComparison.summaryA.toneLabel} · Dominant ${colorComparison.summaryA.dominantHex} (${colorComparison.summaryA.dominantPercentage}%) · ${colorComparison.summaryA.extractedCount} measured clusters · ${colorComparison.summaryA.averageSaturation}% avg saturation`
    : null;
  const colorBVal = colorComparison.summaryB
    ? `${colorComparison.summaryB.toneLabel} · Dominant ${colorComparison.summaryB.dominantHex} (${colorComparison.summaryB.dominantPercentage}%) · ${colorComparison.summaryB.extractedCount} measured clusters · ${colorComparison.summaryB.averageSaturation}% avg saturation`
    : null;

  // 3. Typography hierarchy & characteristics
  const typoAVal = va
    ? `${va.typography.headingFontStyle} headings / ${va.typography.bodyFontStyle} body · ${va.typography.hierarchy.length} hierarchy levels${va.typography.monospaceDetected ? ' · Monospace present' : ''}`
    : null;
  const typoBVal = vb
    ? `${vb.typography.headingFontStyle} headings / ${vb.typography.bodyFontStyle} body · ${vb.typography.hierarchy.length} hierarchy levels${vb.typography.monospaceDetected ? ' · Monospace present' : ''}`
    : null;

  // 4. Layout & composition
  const layoutAVal = va
    ? `${va.layout.structureType} · ${va.layout.gridColumns} · ${va.layout.alignment} (${a.regions.length} detected regions)`
    : null;
  const layoutBVal = vb
    ? `${vb.layout.structureType} · ${vb.layout.gridColumns} · ${vb.layout.alignment} (${b.regions.length} detected regions)`
    : null;

  // 5. Spacing & visual density
  const spacingAVal = va
    ? `${va.spacing.density} density · ${va.spacing.baseUnit} base unit · ${va.spacing.containerPadding} container padding · ${va.spacing.sectionRhythm}`
    : null;
  const spacingBVal = vb
    ? `${vb.spacing.density} density · ${vb.spacing.baseUnit} base unit · ${vb.spacing.containerPadding} container padding · ${vb.spacing.sectionRhythm}`
    : null;

  // 6. Shapes, borders, radii & surfaces
  const radiiA = va?.effects.borderRadiusScale.map((r) => `${r.label}: ${r.value}`).join(', ');
  const radiiB = vb?.effects.borderRadiusScale.map((r) => `${r.label}: ${r.value}`).join(', ');
  const shapesAVal = va
    ? `${va.effects.borderStyle}${radiiA ? ` · Radii: ${radiiA}` : ''}`
    : null;
  const shapesBVal = vb
    ? `${vb.effects.borderStyle}${radiiB ? ` · Radii: ${radiiB}` : ''}`
    : null;

  // 7. Patterns, motifs & decorative elements
  const motifsA = a.elements.filter((el) => el.category !== 'component-style');
  const motifsB = b.elements.filter((el) => el.category !== 'component-style');
  const patternsAVal = va
    ? motifsA.length > 0 || a.patterns.length > 0
      ? `${motifsA.length} motifs/textures, ${a.patterns.length} recurring pattern${a.patterns.length === 1 ? '' : 's'} (${motifsA.slice(0, 3).map((m) => m.name).join(', ') || 'structural rhythm'})`
      : 'No prominent decorative motifs or textures detected.'
    : null;
  const patternsBVal = vb
    ? motifsB.length > 0 || b.patterns.length > 0
      ? `${motifsB.length} motifs/textures, ${b.patterns.length} recurring pattern${b.patterns.length === 1 ? '' : 's'} (${motifsB.slice(0, 3).map((m) => m.name).join(', ') || 'structural rhythm'})`
      : 'No prominent decorative motifs or textures detected.'
    : null;

  // 8. Components & interaction-style appearances
  const compAVal = va
    ? `${va.components.length} detected UI components (${va.components.slice(0, 3).map((c) => `${c.name} [${c.borderRadius}]`).join(', ') || 'none listed'})`
    : null;
  const compBVal = vb
    ? `${vb.components.length} detected UI components (${vb.components.slice(0, 3).map((c) => `${c.name} [${c.borderRadius}]`).join(', ') || 'none listed'})`
    : null;

  // 9. Shadows, depth & visual effects
  const fxAVal = va
    ? `${va.effects.elevationStyle} elevation · ${va.effects.shadowStyle}`
    : null;
  const fxBVal = vb
    ? `${vb.effects.elevationStyle} elevation · ${vb.effects.shadowStyle}`
    : null;

  return [
    {
      id: 'aesthetic-direction',
      label: 'Overall Visual Style & Aesthetic',
      designAValue: styleA,
      designBValue: styleB,
      differenceNote:
        va && vb
          ? va.summary.themeMode !== vb.summary.themeMode
            ? `Theme polarity differs (${va.summary.themeMode} vs ${vb.summary.themeMode}); tone shifts from ${va.summary.designTone} to ${vb.summary.designTone}.`
            : `Both operate in ${va.summary.themeMode} mode with distinct aesthetic positioning (${va.summary.designTone} vs ${vb.summary.designTone}).`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.summary.overallConfidence, vb?.summary.overallConfidence),
      availability: availabilityFor(styleA, styleB),
      evidence: [
        ...(va ? [`Design A: ${va.summary.interfaceType} (${va.summary.themeMode})`] : []),
        ...(vb ? [`Design B: ${vb.summary.interfaceType} (${vb.summary.themeMode})`] : [])
      ]
    },
    {
      id: 'color-identity',
      label: 'Colour Identity & Palette',
      designAValue: colorAVal,
      designBValue: colorBVal,
      differenceNote:
        colorComparison.availability === 'ready'
          ? colorComparison.sharedColors.length > 0
            ? `${colorComparison.sharedColors.length} perceptually shared colour${colorComparison.sharedColors.length === 1 ? '' : 's'} (ΔE ≤ 14), ~${colorComparison.paletteOverlapPercentage}% weighted palette overlap.`
            : `Distinct palettes with 0 perceptually matching clusters (ΔE ≤ 14); dominant tones ${colorComparison.summaryA?.dominantHex} vs ${colorComparison.summaryB?.dominantHex}.`
          : 'Requires measured colour extraction on both designs.',
      provenance: 'measured',
      confidence: colorComparison.availability === 'ready' ? 'high' : null,
      availability: availabilityFor(colorAVal, colorBVal),
      evidence: [
        ...(colorComparison.summaryA
          ? [`Design A dominant pixel cluster: ${colorComparison.summaryA.dominantHex} (${colorComparison.summaryA.dominantPercentage}%)`]
          : []),
        ...(colorComparison.summaryB
          ? [`Design B dominant pixel cluster: ${colorComparison.summaryB.dominantHex} (${colorComparison.summaryB.dominantPercentage}%)`]
          : [])
      ]
    },
    {
      id: 'typography-hierarchy',
      label: 'Typography Hierarchy & Characteristics',
      designAValue: typoAVal,
      designBValue: typoBVal,
      differenceNote:
        va && vb
          ? va.typography.headingFontStyle.toLowerCase() === vb.typography.headingFontStyle.toLowerCase()
            ? `Aligned heading voice (${va.typography.headingFontStyle}); hierarchy depth is ${va.typography.hierarchy.length} vs ${vb.typography.hierarchy.length} tiers.`
            : `Contrasting heading styles (${va.typography.headingFontStyle} vs ${vb.typography.headingFontStyle}) and ${va.typography.hierarchy.length} vs ${vb.typography.hierarchy.length} hierarchy levels.`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.typography.confidence, vb?.typography.confidence),
      availability: availabilityFor(typoAVal, typoBVal),
      evidence: [
        ...(va ? [`Design A scale: ${va.typography.scaleSummary}`] : []),
        ...(vb ? [`Design B scale: ${vb.typography.scaleSummary}`] : [])
      ]
    },
    {
      id: 'layout-composition',
      label: 'Layout & Composition',
      designAValue: layoutAVal,
      designBValue: layoutBVal,
      differenceNote:
        va && vb
          ? `Design A uses ${va.layout.structureType} (${va.layout.gridColumns}), while Design B uses ${vb.layout.structureType} (${vb.layout.gridColumns}).`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.layout.confidence, vb?.layout.confidence),
      availability: availabilityFor(layoutAVal, layoutBVal),
      evidence: [
        ...(va ? [`Design A content width: ${va.layout.contentWidth}, ${a.regions.length} regions`] : []),
        ...(vb ? [`Design B content width: ${vb.layout.contentWidth}, ${b.regions.length} regions`] : [])
      ]
    },
    {
      id: 'spacing-density',
      label: 'Spacing & Visual Density',
      designAValue: spacingAVal,
      designBValue: spacingBVal,
      differenceNote:
        va && vb
          ? va.spacing.density === vb.spacing.density
            ? `Both exhibit ${va.spacing.density} density (base units ${va.spacing.baseUnit} vs ${vb.spacing.baseUnit}).`
            : `Density shifts from ${va.spacing.density} in Design A to ${vb.spacing.density} in Design B.`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.spacing.confidence, vb?.spacing.confidence),
      availability: availabilityFor(spacingAVal, spacingBVal),
      evidence: [
        ...(va ? [`Design A rhythm: ${va.spacing.sectionRhythm}`] : []),
        ...(vb ? [`Design B rhythm: ${vb.spacing.sectionRhythm}`] : [])
      ]
    },
    {
      id: 'shapes-surfaces',
      label: 'Shapes, Borders, Radii & Surfaces',
      designAValue: shapesAVal,
      designBValue: shapesBVal,
      differenceNote:
        va && vb
          ? `Border treatment compares "${va.effects.borderStyle}" against "${vb.effects.borderStyle}".`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.effects.confidence, vb?.effects.confidence),
      availability: availabilityFor(shapesAVal, shapesBVal),
      evidence: [
        ...(va && radiiA ? [`Design A radii: ${radiiA}`] : []),
        ...(vb && radiiB ? [`Design B radii: ${radiiB}`] : [])
      ]
    },
    {
      id: 'patterns-motifs',
      label: 'Patterns, Motifs & Decorative Elements',
      designAValue: patternsAVal,
      designBValue: patternsBVal,
      differenceNote:
        va && vb
          ? motifsA.length === motifsB.length
            ? `Equal motif/texture count (${motifsA.length} each); ${componentsMotifs.sharedPatterns.length} shared recurring pattern type${componentsMotifs.sharedPatterns.length === 1 ? '' : 's'}.`
            : `${motifsA.length > motifsB.length ? 'Design A' : 'Design B'} features more detected decorative motifs & textures (${motifsA.length} vs ${motifsB.length}).`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'derived',
      confidence: combineConfidence(va?.summary.overallConfidence, vb?.summary.overallConfidence),
      availability: availabilityFor(patternsAVal, patternsBVal),
      evidence: [
        `Design A: ${motifsA.length} motifs/textures, ${a.patterns.length} pattern relationships`,
        `Design B: ${motifsB.length} motifs/textures, ${b.patterns.length} pattern relationships`
      ]
    },
    {
      id: 'components-interactions',
      label: 'Components & Interaction Appearances',
      designAValue: compAVal,
      designBValue: compBVal,
      differenceNote:
        va && vb
          ? componentsMotifs.matchedElements.length > 0
            ? `${componentsMotifs.matchedElements.length} reliable visual element correspondence${componentsMotifs.matchedElements.length === 1 ? '' : 's'} paired across ${va.components.length} vs ${vb.components.length} detected UI components.`
            : `${va.components.length} vs ${vb.components.length} detected UI components with no direct crop-level correspondence.`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(
        va?.components[0]?.confidence ?? va?.summary.overallConfidence,
        vb?.components[0]?.confidence ?? vb?.summary.overallConfidence
      ),
      availability: availabilityFor(compAVal, compBVal),
      evidence: [
        ...(va ? [`Design A detected components: ${va.components.length}`] : []),
        ...(vb ? [`Design B detected components: ${vb.components.length}`] : [])
      ]
    },
    {
      id: 'shadows-effects',
      label: 'Shadows, Depth & Visual Effects',
      designAValue: fxAVal,
      designBValue: fxBVal,
      differenceNote:
        va && vb
          ? va.effects.elevationStyle === vb.effects.elevationStyle
            ? `Both rely on ${va.effects.elevationStyle} elevation language.`
            : `Elevation shifts from ${va.effects.elevationStyle} (Design A) to ${vb.effects.elevationStyle} (Design B).`
          : 'Requires AI Visual Interpretation on both designs.',
      provenance: 'ai-inferred',
      confidence: combineConfidence(va?.effects.confidence, vb?.effects.confidence),
      availability: availabilityFor(fxAVal, fxBVal),
      evidence: [
        ...(va ? [`Design A notes: ${va.effects.notes}`] : []),
        ...(vb ? [`Design B notes: ${vb.effects.notes}`] : [])
      ]
    }
  ];
}

function buildDifferenceIntelligence(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot,
  colorComparison: ColorComparisonModel,
  typographyComparison: TypographyComparisonModel,
  componentsMotifs: ComponentsMotifsComparisonModel
): DifferenceIntelligenceModel {
  const hasMeasuredBoth = colorComparison.availability === 'ready';
  const va = a.visualAnalysis?.interpretation ?? null;
  const vb = b.visualAnalysis?.interpretation ?? null;
  const hasAiBoth = Boolean(va && vb);

  if (!hasMeasuredBoth && !hasAiBoth) {
    return {
      availability: 'unavailable',
      unavailableReason:
        'At least measured colour extraction on both Design A and Design B is required to compute difference intelligence.',
      headline: 'Difference intelligence awaits analysis on both screenshots.',
      commonalities: [],
      distinctiveA: [],
      distinctiveB: [],
      keyDifferences: []
    };
  }

  const commonalities: IntelligenceFindingItem[] = [];
  const distinctiveA: IntelligenceFindingItem[] = [];
  const distinctiveB: IntelligenceFindingItem[] = [];
  const keyDifferences: IntelligenceFindingItem[] = [];

  // --- Measured Colour Intelligence ---
  if (hasMeasuredBoth && colorComparison.summaryA && colorComparison.summaryB) {
    const sA = colorComparison.summaryA;
    const sB = colorComparison.summaryB;

    if (colorComparison.sharedColors.length > 0) {
      const top = colorComparison.sharedColors[0];
      commonalities.push({
        id: 'common-colors',
        title: `${colorComparison.sharedColors.length} Shared Measured Colour Cluster${colorComparison.sharedColors.length === 1 ? '' : 's'}`,
        detail: `Both screenshots converge around ${top.colorA.hex} ↔ ${top.colorB.hex} (ΔE ${top.deltaE}), contributing roughly ${colorComparison.paletteOverlapPercentage}% weighted palette overlap.`,
        provenance: 'measured',
        confidence: 'high',
        evidence: colorComparison.sharedColors
          .slice(0, 3)
          .map((m) => `${m.colorA.hex} (${m.colorA.percentage}%) ↔ ${m.colorB.hex} (${m.colorB.percentage}%) · ΔE ${m.deltaE}`)
      });
    }

    if (sA.toneLabel === sB.toneLabel) {
      commonalities.push({
        id: 'common-luminance-tone',
        title: `Shared ${sA.toneLabel} Luminance Polarity`,
        detail: `Both canvases anchor on ${sA.toneLabel.toLowerCase()} backgrounds (${sA.dominantHex} in Design A vs ${sB.dominantHex} in Design B).`,
        provenance: 'measured',
        confidence: 'high',
        evidence: [
          `Design A dominant luminance: ${sA.dominantLuminance}`,
          `Design B dominant luminance: ${sB.dominantLuminance}`
        ]
      });
    } else {
      const brighter = sA.dominantLuminance > sB.dominantLuminance ? 'design-a' : 'design-b';
      keyDifferences.push({
        id: 'diff-luminance-polarity',
        title: 'Opposite Surface Luminance Polarity',
        detail: `Design A anchors on ${sA.toneLabel.toLowerCase()} pixels (${sA.dominantHex} at ${sA.dominantPercentage}%), while Design B anchors on ${sB.toneLabel.toLowerCase()} pixels (${sB.dominantHex} at ${sB.dominantPercentage}%).`,
        provenance: 'measured',
        confidence: 'high',
        evidence: [
          `Design A dominant: ${sA.dominantHex} (L=${sA.dominantLuminance})`,
          `Design B dominant: ${sB.dominantHex} (L=${sB.dominantLuminance})`
        ],
        prominenceLeader: brighter,
        prominenceLabel: brighter === 'design-a' ? 'Higher brightness in Design A' : 'Higher brightness in Design B'
      });
    }

    if (colorComparison.averageSaturationDelta !== null && Math.abs(colorComparison.averageSaturationDelta) >= 6) {
      const satLeader = colorComparison.averageSaturationDelta > 0 ? 'design-a' : 'design-b';
      keyDifferences.push({
        id: 'diff-saturation',
        title: 'Chromatic Saturation Intensity',
        detail: `${satLeader === 'design-a' ? 'Design A' : 'Design B'} uses stronger colour saturation across its sampled pixels (${sA.averageSaturation}% weighted avg in Design A vs ${sB.averageSaturation}% in Design B).`,
        provenance: 'derived',
        confidence: 'high',
        evidence: [
          `Design A vivid clusters: ${sA.vividCount} of ${sA.extractedCount}`,
          `Design B vivid clusters: ${sB.vividCount} of ${sB.extractedCount}`
        ],
        prominenceLeader: satLeader,
        prominenceLabel: satLeader === 'design-a' ? 'More prominent in Design A' : 'More prominent in Design B'
      });
    }

    if (colorComparison.distinctiveA.length > 0) {
      const topUniqueA = colorComparison.distinctiveA.slice(0, 3);
      distinctiveA.push({
        id: 'distinct-a-palette',
        title: `Unique Measured Palette Signatures (${colorComparison.distinctiveA.length})`,
        detail: `Design A introduces ${topUniqueA.map((c) => `${c.hex} (${c.percentage}%)`).join(', ')} with no close perceptual equivalent (ΔE ≤ 14) in Design B.`,
        provenance: 'measured',
        confidence: 'high',
        evidence: topUniqueA.map((c) => `${c.hex} · ${c.percentage}% pixel share · HSL(${c.hsl.h}°, ${c.hsl.s}%, ${c.hsl.l}%)`)
      });
    }

    if (colorComparison.distinctiveB.length > 0) {
      const topUniqueB = colorComparison.distinctiveB.slice(0, 3);
      distinctiveB.push({
        id: 'distinct-b-palette',
        title: `Unique Measured Palette Signatures (${colorComparison.distinctiveB.length})`,
        detail: `Design B introduces ${topUniqueB.map((c) => `${c.hex} (${c.percentage}%)`).join(', ')} with no close perceptual equivalent (ΔE ≤ 14) in Design A.`,
        provenance: 'measured',
        confidence: 'high',
        evidence: topUniqueB.map((c) => `${c.hex} · ${c.percentage}% pixel share · HSL(${c.hsl.h}°, ${c.hsl.s}%, ${c.hsl.l}%)`)
      });
    }
  }

  // --- AI-Inferred & Derived Structural / Identity Intelligence ---
  if (hasAiBoth && va && vb) {
    if (va.effects.elevationStyle === vb.effects.elevationStyle) {
      commonalities.push({
        id: 'common-elevation',
        title: `Shared ${va.effects.elevationStyle} Surface Depth`,
        detail: `Both designs separate visual layers using a ${va.effects.elevationStyle} elevation approach rather than conflicting depth models.`,
        provenance: 'ai-inferred',
        confidence: combineConfidence(va.effects.confidence, vb.effects.confidence),
        evidence: [`Design A: ${va.effects.borderStyle}`, `Design B: ${vb.effects.borderStyle}`]
      });
    } else {
      keyDifferences.push({
        id: 'diff-elevation',
        title: 'Surface Elevation & Depth Language',
        detail: `Design A relies on ${va.effects.elevationStyle} layering (${va.effects.shadowStyle}), whereas Design B uses ${vb.effects.elevationStyle} (${vb.effects.shadowStyle}).`,
        provenance: 'ai-inferred',
        confidence: combineConfidence(va.effects.confidence, vb.effects.confidence),
        evidence: [`Design A border: ${va.effects.borderStyle}`, `Design B border: ${vb.effects.borderStyle}`],
        prominenceLeader: 'balanced',
        prominenceLabel: 'Distinct surface systems'
      });
    }

    if (va.spacing.density === vb.spacing.density) {
      commonalities.push({
        id: 'common-density',
        title: `Matching ${va.spacing.density} Spatial Density`,
        detail: `Both interfaces pace content at a ${va.spacing.density} density (${va.spacing.baseUnit} vs ${vb.spacing.baseUnit} estimated base unit).`,
        provenance: 'ai-inferred',
        confidence: combineConfidence(va.spacing.confidence, vb.spacing.confidence),
        evidence: [`Design A: ${va.spacing.sectionRhythm}`, `Design B: ${vb.spacing.sectionRhythm}`]
      });
    } else {
      const rank: Record<'compact' | 'comfortable' | 'spacious', number> = {
        compact: 1,
        comfortable: 2,
        spacious: 3
      };
      const airier = rank[va.spacing.density] > rank[vb.spacing.density] ? 'design-a' : 'design-b';
      keyDifferences.push({
        id: 'diff-density',
        title: 'Visual Density & Whitespace Pacing',
        detail: `Design A is paced as ${va.spacing.density} (${va.spacing.containerPadding} container padding), whereas Design B is ${vb.spacing.density} (${vb.spacing.containerPadding} container padding).`,
        provenance: 'ai-inferred',
        confidence: combineConfidence(va.spacing.confidence, vb.spacing.confidence),
        evidence: [`Design A: ${va.spacing.sectionRhythm}`, `Design B: ${vb.spacing.sectionRhythm}`],
        prominenceLeader: airier,
        prominenceLabel: airier === 'design-a' ? 'More open whitespace in Design A' : 'More open whitespace in Design B'
      });
    }

    if (va.typography.headingFontStyle.toLowerCase() !== vb.typography.headingFontStyle.toLowerCase()) {
      keyDifferences.push({
        id: 'diff-typography',
        title: 'Typographic Voice & Classification',
        detail: `Design A pairs ${va.typography.headingFontStyle} headings with ${va.typography.bodyFontStyle} body text, whereas Design B pairs ${vb.typography.headingFontStyle} headings with ${vb.typography.bodyFontStyle} body text.`,
        provenance: 'ai-inferred',
        confidence: combineConfidence(va.typography.confidence, vb.typography.confidence),
        evidence: [`Design A: ${va.typography.scaleSummary}`, `Design B: ${vb.typography.scaleSummary}`],
        prominenceLeader:
          va.typography.hierarchy.length !== vb.typography.hierarchy.length
            ? va.typography.hierarchy.length > vb.typography.hierarchy.length
              ? 'design-a'
              : 'design-b'
            : 'balanced',
        prominenceLabel:
          va.typography.hierarchy.length !== vb.typography.hierarchy.length
            ? `More hierarchy tiers in ${va.typography.hierarchy.length > vb.typography.hierarchy.length ? 'Design A' : 'Design B'}`
            : 'Equal hierarchy depth'
      });
    }

    if (componentsMotifs.sharedPatterns.length > 0) {
      commonalities.push({
        id: 'common-patterns',
        title: `Shared Structural Pattern Language (${componentsMotifs.sharedPatterns.length})`,
        detail: `Both screenshots exhibit ${componentsMotifs.sharedPatterns.map((p) => PATTERN_TYPE_LABELS[p.patternType]).join(', ')}.`,
        provenance: 'derived',
        confidence: 'medium',
        evidence: componentsMotifs.sharedPatterns.map(
          (p) => `${p.patternA.name} (Design A) ↔ ${p.patternB.name} (Design B)`
        )
      });
    }

    if (a.elements.length !== b.elements.length) {
      const richer = a.elements.length > b.elements.length ? 'design-a' : 'design-b';
      keyDifferences.push({
        id: 'diff-motif-density',
        title: 'Visual Element & Motif Richness',
        detail: `${richer === 'design-a' ? 'Design A' : 'Design B'} exhibits more distinct visual motifs and component surface elements (${a.elements.length} detected in Design A vs ${b.elements.length} in Design B).`,
        provenance: 'derived',
        confidence: 'medium',
        evidence: [
          `Design A: ${a.elements.length} elements across ${a.regions.length} regions`,
          `Design B: ${b.elements.length} elements across ${b.regions.length} regions`
        ],
        prominenceLeader: richer,
        prominenceLabel: richer === 'design-a' ? 'Higher motif density in Design A' : 'Higher motif density in Design B'
      });
    }

    // Distinctive A traits
    distinctiveA.push({
      id: 'distinct-a-identity',
      title: `${va.summary.designTone} · ${va.summary.interfaceType}`,
      detail: `${va.summary.styleSummary} Built on a ${va.layout.structureType} layout (${va.layout.gridColumns}).`,
      provenance: 'ai-inferred',
      confidence: va.summary.overallConfidence,
      evidence: [
        `Typography: ${va.typography.headingFontStyle}`,
        `Elevation: ${va.effects.elevationStyle}`
      ]
    });

    if (componentsMotifs.uniqueToA.length > 0) {
      distinctiveA.push({
        id: 'distinct-a-elements',
        title: `${componentsMotifs.uniqueToA.length} Unmatched Visual Element${componentsMotifs.uniqueToA.length === 1 ? '' : 's'}`,
        detail: `Distinctive elements appearing only in Design A include ${componentsMotifs.uniqueToA.slice(0, 3).map((e) => e.name).join(', ')}.`,
        provenance: 'derived',
        confidence: componentsMotifs.uniqueToA[0].confidence,
        evidence: componentsMotifs.uniqueToA
          .slice(0, 3)
          .map((e) => `${e.name} (${ELEMENT_CATEGORY_SHORT_LABELS[e.category]})`)
      });
    }

    // Distinctive B traits
    distinctiveB.push({
      id: 'distinct-b-identity',
      title: `${vb.summary.designTone} · ${vb.summary.interfaceType}`,
      detail: `${vb.summary.styleSummary} Built on a ${vb.layout.structureType} layout (${vb.layout.gridColumns}).`,
      provenance: 'ai-inferred',
      confidence: vb.summary.overallConfidence,
      evidence: [
        `Typography: ${vb.typography.headingFontStyle}`,
        `Elevation: ${vb.effects.elevationStyle}`
      ]
    });

    if (componentsMotifs.uniqueToB.length > 0) {
      distinctiveB.push({
        id: 'distinct-b-elements',
        title: `${componentsMotifs.uniqueToB.length} Unmatched Visual Element${componentsMotifs.uniqueToB.length === 1 ? '' : 's'}`,
        detail: `Distinctive elements appearing only in Design B include ${componentsMotifs.uniqueToB.slice(0, 3).map((e) => e.name).join(', ')}.`,
        provenance: 'derived',
        confidence: componentsMotifs.uniqueToB[0].confidence,
        evidence: componentsMotifs.uniqueToB
          .slice(0, 3)
          .map((e) => `${e.name} (${ELEMENT_CATEGORY_SHORT_LABELS[e.category]})`)
      });
    }
  }

  // Build concise, factual headline (never declaring one design better)
  let headline = '';
  if (hasAiBoth && va && vb && colorComparison.summaryA && colorComparison.summaryB) {
    headline = `Design A (${va.summary.designTone}, ${colorComparison.summaryA.dominantHex}) vs Design B (${vb.summary.designTone}, ${colorComparison.summaryB.dominantHex}) — ${keyDifferences.length} key visual divergence${keyDifferences.length === 1 ? '' : 's'} and ${commonalities.length} shared foundation${commonalities.length === 1 ? '' : 's'} identified.`;
  } else if (hasMeasuredBoth && colorComparison.summaryA && colorComparison.summaryB) {
    headline = `Measured pixel comparison ready (${colorComparison.summaryA.dominantHex} vs ${colorComparison.summaryB.dominantHex}, ${colorComparison.sharedColors.length} shared colour cluster${colorComparison.sharedColors.length === 1 ? '' : 's'}). Run AI Visual Interpretation on both slots for full structural intelligence.`;
  } else {
    headline = 'Partial comparison data available.';
  }

  return {
    availability: hasAiBoth && hasMeasuredBoth ? 'ready' : 'partial',
    unavailableReason:
      hasAiBoth && hasMeasuredBoth
        ? null
        : typographyComparison.unavailableReason ??
          'AI Visual Interpretation is incomplete on at least one design; showing measured findings only where available.',
    headline,
    commonalities,
    distinctiveA,
    distinctiveB,
    keyDifferences
  };
}

function buildRefinementInsights(
  a: AnalysisContextSnapshot,
  b: AnalysisContextSnapshot,
  colorComparison: ColorComparisonModel
): RefinementInsightItem[] {
  const insights: RefinementInsightItem[] = [];
  const va = a.visualAnalysis?.interpretation ?? null;
  const vb = b.visualAnalysis?.interpretation ?? null;

  // 1. Colour consistency opportunity (grounded in measured clusters & Delta-E near-duplicates)
  if (colorComparison.availability === 'ready' && colorComparison.summaryA && colorComparison.summaryB) {
    const closeNotIdentical = colorComparison.sharedColors.filter(
      (m) => m.deltaE > 3 && m.deltaE <= SHARED_COLOR_DELTA_E_THRESHOLD
    );
    if (closeNotIdentical.length > 0) {
      const lead = closeNotIdentical[0];
      insights.push({
        id: 'refine-color-unify',
        category: 'colour-consistency',
        categoryLabel: 'Colour Consistency',
        appliesTo: 'both',
        appliesToLabel: 'Design A & Design B',
        title: `Converge near-matching tones (${lead.colorA.hex} and ${lead.colorB.hex})`,
        observation: `Both designs use closely related measured colours separated by perceptual distance ΔE ${lead.deltaE} (${lead.colorA.hex} at ${lead.colorA.percentage}% in Design A vs ${lead.colorB.hex} at ${lead.colorB.percentage}% in Design B).`,
        suggestion:
          'If these screens belong to the same product family, collapsing near-matching hues onto a single canonical colour token eliminates subtle brand drift.',
        provenance: 'measured',
        referencedFindings: [
          `Design A: ${lead.colorA.hex} (${lead.colorA.percentage}%)`,
          `Design B: ${lead.colorB.hex} (${lead.colorB.percentage}%)`,
          `CIE76 ΔE ${lead.deltaE}`
        ]
      });
    } else if (
      colorComparison.summaryA.vividCount >= 4 ||
      colorComparison.summaryB.vividCount >= 4
    ) {
      const target =
        colorComparison.summaryA.vividCount >= colorComparison.summaryB.vividCount
          ? 'design-a'
          : 'design-b';
      const targetSum = target === 'design-a' ? colorComparison.summaryA : colorComparison.summaryB;
      const otherSum = target === 'design-a' ? colorComparison.summaryB : colorComparison.summaryA;
      insights.push({
        id: 'refine-color-restraint',
        category: 'colour-consistency',
        categoryLabel: 'Colour Consistency',
        appliesTo: target,
        appliesToLabel: target === 'design-a' ? 'Design A' : 'Design B',
        title: `Focus chromatic accents (${targetSum.vividCount} vivid clusters measured)`,
        observation: `${target === 'design-a' ? 'Design A' : 'Design B'} spans ${targetSum.vividCount} high-saturation colour clusters (weighted avg ${targetSum.averageSaturation}%), compared to ${otherSum.vividCount} in the counterpart.`,
        suggestion:
          'Consolidating secondary chromatic accents toward 1–2 primary interactive tokens can sharpen visual hierarchy and reduce competing focal points.',
        provenance: 'measured',
        referencedFindings: [
          `${target === 'design-a' ? 'Design A' : 'Design B'}: ${targetSum.vividCount} vivid clusters (${targetSum.averageSaturation}% avg sat)`,
          `Counterpart: ${otherSum.vividCount} vivid clusters (${otherSum.averageSaturation}% avg sat)`
        ]
      });
    } else if (
      Math.abs(colorComparison.summaryA.extractedCount - colorComparison.summaryB.extractedCount) >= 3
    ) {
      const broader =
        colorComparison.summaryA.extractedCount > colorComparison.summaryB.extractedCount
          ? 'design-a'
          : 'design-b';
      const broaderSum = broader === 'design-a' ? colorComparison.summaryA : colorComparison.summaryB;
      const tighterSum = broader === 'design-a' ? colorComparison.summaryB : colorComparison.summaryA;
      insights.push({
        id: 'refine-color-breadth',
        category: 'colour-consistency',
        categoryLabel: 'Colour Consistency',
        appliesTo: broader,
        appliesToLabel: broader === 'design-a' ? 'Design A' : 'Design B',
        title: `Audit palette breadth (${broaderSum.extractedCount} vs ${tighterSum.extractedCount} measured clusters)`,
        observation: `${broader === 'design-a' ? 'Design A' : 'Design B'} distributes pixels across ${broaderSum.extractedCount} quantized colour clusters versus ${tighterSum.extractedCount} in the counterpart.`,
        suggestion:
          'Review lower-percentage tail clusters to confirm each serves a deliberate semantic role (surface, border, or status) rather than incidental tonal drift.',
        provenance: 'measured',
        referencedFindings: [
          `Design A: ${colorComparison.summaryA.extractedCount} measured clusters (dominant ${colorComparison.summaryA.dominantHex})`,
          `Design B: ${colorComparison.summaryB.extractedCount} measured clusters (dominant ${colorComparison.summaryB.dominantHex})`
        ]
      });
    }
  }

  // 2. Typography hierarchy insight
  if (va && vb) {
    const tiersA = va.typography.hierarchy.length;
    const tiersB = vb.typography.hierarchy.length;
    const h1A = parsePxNumber(va.typography.hierarchy[0]?.estimatedSize);
    const h1B = parsePxNumber(vb.typography.hierarchy[0]?.estimatedSize);
    const bodyA = parsePxNumber(va.typography.hierarchy[va.typography.hierarchy.length - 1]?.estimatedSize);
    const bodyB = parsePxNumber(vb.typography.hierarchy[vb.typography.hierarchy.length - 1]?.estimatedSize);

    if (h1A && bodyA && h1B && bodyB) {
      const ratioA = round2(h1A / Math.max(1, bodyA));
      const ratioB = round2(h1B / Math.max(1, bodyB));
      if (Math.abs(ratioA - ratioB) >= 0.6) {
        const flatter = ratioA < ratioB ? 'design-a' : 'design-b';
        const flatterRatio = flatter === 'design-a' ? ratioA : ratioB;
        const steeperRatio = flatter === 'design-a' ? ratioB : ratioA;
        insights.push({
          id: 'refine-typo-scale',
          category: 'typography-hierarchy',
          categoryLabel: 'Typography Hierarchy',
          appliesTo: flatter,
          appliesToLabel: flatter === 'design-a' ? 'Design A' : 'Design B',
          title: `Expand headline-to-body scale contrast (${flatterRatio}× vs ${steeperRatio}× estimated)`,
          observation: `${flatter === 'design-a' ? 'Design A' : 'Design B'} exhibits a narrower estimated type scale ratio (${flatter === 'design-a' ? `${va.typography.hierarchy[0]?.estimatedSize} / ${va.typography.hierarchy[tiersA - 1]?.estimatedSize}` : `${vb.typography.hierarchy[0]?.estimatedSize} / ${vb.typography.hierarchy[tiersB - 1]?.estimatedSize}`}) than its counterpart.`,
          suggestion:
            'Increasing display headline size or tightening body scale can improve first-glance scanability where rapid editorial hierarchy is desired.',
          provenance: 'derived',
          referencedFindings: [
            `Design A top/bottom estimate: ${va.typography.hierarchy[0]?.estimatedSize} / ${va.typography.hierarchy[tiersA - 1]?.estimatedSize}`,
            `Design B top/bottom estimate: ${vb.typography.hierarchy[0]?.estimatedSize} / ${vb.typography.hierarchy[tiersB - 1]?.estimatedSize}`
          ]
        });
      }
    }

    if (tiersA !== tiersB && Math.abs(tiersA - tiersB) >= 2) {
      const fewer = tiersA < tiersB ? 'design-a' : 'design-b';
      insights.push({
        id: 'refine-typo-tiers',
        category: 'typography-hierarchy',
        categoryLabel: 'Typography Hierarchy',
        appliesTo: fewer,
        appliesToLabel: fewer === 'design-a' ? 'Design A' : 'Design B',
        title: `Clarify intermediate type tiers (${Math.min(tiersA, tiersB)} vs ${Math.max(tiersA, tiersB)} detected)`,
        observation: `${fewer === 'design-a' ? 'Design A' : 'Design B'} exposes ${Math.min(tiersA, tiersB)} distinct typography levels compared to ${Math.max(tiersA, tiersB)} in the counterpart.`,
        suggestion:
          'Introducing a dedicated subheading or metadata label step can separate section introductions from body copy without adding visual noise.',
        provenance: 'ai-inferred',
        referencedFindings: [
          `Design A tiers: ${tiersA} (${va.typography.headingFontStyle})`,
          `Design B tiers: ${tiersB} (${vb.typography.headingFontStyle})`
        ]
      });
    }

    // 3. Spacing consistency & visual density insight
    if (va.spacing.baseUnit !== vb.spacing.baseUnit || va.spacing.density !== vb.spacing.density) {
      const compactTarget =
        va.spacing.density === 'compact' && vb.spacing.density !== 'compact'
          ? 'design-a'
          : vb.spacing.density === 'compact' && va.spacing.density !== 'compact'
            ? 'design-b'
            : 'both';
      insights.push({
        id: 'refine-spacing-rhythm',
        category: compactTarget === 'both' ? 'spacing-consistency' : 'visual-density',
        categoryLabel: compactTarget === 'both' ? 'Spacing Consistency' : 'Visual Density',
        appliesTo: compactTarget,
        appliesToLabel:
          compactTarget === 'design-a'
            ? 'Design A'
            : compactTarget === 'design-b'
              ? 'Design B'
              : 'Design A & Design B',
        title:
          compactTarget === 'both'
            ? `Align spatial cadence (${va.spacing.baseUnit} vs ${vb.spacing.baseUnit})`
            : `Evaluate breathing room in compact regions (${compactTarget === 'design-a' ? va.spacing.containerPadding : vb.spacing.containerPadding})`,
        observation: `Design A operates at ${va.spacing.density} density (${va.spacing.baseUnit} base, ${va.spacing.containerPadding} padding) whereas Design B operates at ${vb.spacing.density} density (${vb.spacing.baseUnit} base, ${vb.spacing.containerPadding} padding).`,
        suggestion:
          compactTarget === 'both'
            ? 'Standardising on a single base spatial increment (e.g. 8px multiples) makes cross-screen margins and section rhythms immediately cohesive.'
            : 'Adding 8px–16px vertical separation between primary sections can ease visual density while preserving high information throughput.',
        provenance: 'ai-inferred',
        referencedFindings: [
          `Design A: ${va.spacing.density} · ${va.spacing.baseUnit} · ${va.spacing.sectionRhythm}`,
          `Design B: ${vb.spacing.density} · ${vb.spacing.baseUnit} · ${vb.spacing.sectionRhythm}`
        ]
      });
    }

    // 4. Component & border-radius consistency
    const radiiCountA = va.effects.borderRadiusScale.length;
    const radiiCountB = vb.effects.borderRadiusScale.length;
    if (va.effects.elevationStyle !== vb.effects.elevationStyle || radiiCountA !== radiiCountB) {
      insights.push({
        id: 'refine-component-surface',
        category: 'component-consistency',
        categoryLabel: 'Component Consistency',
        appliesTo: 'both',
        appliesToLabel: 'Design A & Design B',
        title: `Reconcile surface elevation (${va.effects.elevationStyle} vs ${vb.effects.elevationStyle})`,
        observation: `Design A surfaces use ${va.effects.elevationStyle} (${radiiCountA} radius steps, ${va.components.length} components) while Design B uses ${vb.effects.elevationStyle} (${radiiCountB} radius steps, ${vb.components.length} components).`,
        suggestion:
          'When unifying components across both layouts, lock border treatment and corner-radius tiers first so cards, buttons, and inputs share a consistent tactile feel.',
        provenance: 'ai-inferred',
        referencedFindings: [
          `Design A: ${va.effects.borderStyle} (${va.components.length} components)`,
          `Design B: ${vb.effects.borderStyle} (${vb.components.length} components)`
        ]
      });
    }

    // 5. Visual identity & distinctive motif strengthening
    const motifsA = a.elements.filter((el) => el.category !== 'component-style').length;
    const motifsB = b.elements.filter((el) => el.category !== 'component-style').length;
    if (Math.abs(motifsA - motifsB) >= 2 || (motifsA === 0 && motifsB > 0) || (motifsB === 0 && motifsA > 0)) {
      const quieter = motifsA < motifsB ? 'design-a' : 'design-b';
      const richer = quieter === 'design-a' ? 'design-b' : 'design-a';
      const richerMotifNames = (richer === 'design-a' ? a.elements : b.elements)
        .filter((el) => el.category !== 'component-style')
        .slice(0, 2)
        .map((el) => el.name);

      insights.push({
        id: 'refine-visual-identity-motifs',
        category: 'visual-identity',
        categoryLabel: 'Visual Identity',
        appliesTo: quieter,
        appliesToLabel: quieter === 'design-a' ? 'Design A' : 'Design B',
        title: `Strengthen signature visual motifs (${Math.min(motifsA, motifsB)} vs ${Math.max(motifsA, motifsB)} detected)`,
        observation: `${richer === 'design-a' ? 'Design A' : 'Design B'} reinforces brand recall through recurring visual motifs (${richerMotifNames.join(', ') || 'surface textures'}), whereas ${quieter === 'design-a' ? 'Design A' : 'Design B'} uses fewer signature decorative cues.`,
        suggestion:
          'Introducing one restrained, repeatable structural motif (such as a hairline grid rule, subtle surface pattern, or distinctive icon geometry) can make the interface more immediately recognisable.',
        provenance: 'derived',
        referencedFindings: [
          `Design A motifs/textures: ${motifsA} (${a.patterns.length} recurring patterns)`,
          `Design B motifs/textures: ${motifsB} (${b.patterns.length} recurring patterns)`
        ]
      });
    }

    // 6. Token reconciliation insight if M6 flagged divergence between measured and AI-estimated colours
    const reconA = a.designSystem?.reconciliationNotes.length ?? 0;
    const reconB = b.designSystem?.reconciliationNotes.length ?? 0;
    if (reconA > 0 || reconB > 0) {
      const target = reconA >= reconB ? 'design-a' : 'design-b';
      const firstNote =
        target === 'design-a'
          ? a.designSystem?.reconciliationNotes[0]
          : b.designSystem?.reconciliationNotes[0];
      if (firstNote) {
        insights.push({
          id: 'refine-token-reconciliation',
          category: 'colour-consistency',
          categoryLabel: 'Colour Consistency',
          appliesTo: target,
          appliesToLabel: target === 'design-a' ? 'Design A' : 'Design B',
          title: `Review measured vs semantic colour alignment`,
          observation: `${target === 'design-a' ? 'Design A' : 'Design B'} recorded ${target === 'design-a' ? reconA : reconB} M6 reconciliation note${(target === 'design-a' ? reconA : reconB) === 1 ? '' : 's'} — e.g. ${firstNote.explanation}`,
          suggestion:
            'Anchor production CSS variables to measured pixel HEX tokens so subtle overlays, gradients, or anti-aliased renders do not drift from intended brand swatches.',
          provenance: 'derived',
          referencedFindings: [`${firstNote.tokenName}: ${firstNote.explanation}`]
        });
      }
    }
  }

  // Keep insights compact and focused (max 5 highest-signal grounded items)
  return insights.slice(0, 5);
}

/**
 * Pure deterministic M12 Design Comparison & Difference Intelligence engine.
 * Derives every comparison section directly from the two independent in-memory
 * AnalysisContextSnapshots so stale results are structurally impossible.
 */
export function buildDesignComparison(
  designA: AnalysisContextSnapshot,
  designB: AnalysisContextSnapshot
): DesignComparisonModel {
  const canCompareVisuals = Boolean(designA.image && designB.image);
  const canCompareMeasured = Boolean(
    designA.colorResult &&
      designA.colorResult.colors.length > 0 &&
      designB.colorResult &&
      designB.colorResult.colors.length > 0
  );
  const canCompareFull = Boolean(
    canCompareMeasured && designA.visualAnalysis && designB.visualAnalysis
  );

  const overallAvailability: ComparisonAvailability = canCompareFull
    ? 'ready'
    : canCompareMeasured || canCompareVisuals
      ? 'partial'
      : 'unavailable';

  let readinessSummary = 'Select or upload two website screenshots to begin side-by-side comparison.';
  if (canCompareFull) {
    readinessSummary =
      'Full comparison ready across measured colour palettes, AI-inferred design systems, typography, layout, and visual element crops.';
  } else if (canCompareMeasured) {
    readinessSummary =
      'Measured colour comparison is ready. Run AI Visual Interpretation on any remaining slot to unlock typography, layout, motifs, and refinement intelligence.';
  } else if (canCompareVisuals) {
    readinessSummary =
      'Both screenshots are loaded for visual inspection. Extract colours or run full analysis on each unanalysed slot to unlock visual DNA comparison.';
  } else if (designA.image || designB.image) {
    readinessSummary =
      'One screenshot is loaded. Add a second screenshot in the opposing slot to unlock side-by-side comparison.';
  }

  const geometry = buildGeometryComparison(designA, designB);
  const colorComparison = buildColorComparison(designA, designB);
  const typographyComparison = buildTypographyComparison(designA, designB);
  const componentsMotifs = buildComponentsMotifsComparison(designA, designB);
  const visualIdentityRows = buildVisualIdentityRows(
    designA,
    designB,
    colorComparison,
    componentsMotifs
  );
  const differenceIntelligence = buildDifferenceIntelligence(
    designA,
    designB,
    colorComparison,
    typographyComparison,
    componentsMotifs
  );
  const refinementInsights = buildRefinementInsights(
    designA,
    designB,
    colorComparison
  );

  return {
    canCompareVisuals,
    canCompareMeasured,
    canCompareFull,
    overallAvailability,
    readinessSummary,
    geometry,
    visualIdentityRows,
    colorComparison,
    typographyComparison,
    componentsMotifs,
    differenceIntelligence,
    refinementInsights
  };
}
