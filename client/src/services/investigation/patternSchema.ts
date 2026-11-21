import { z } from 'zod';
import type {
  ElementsAndPatternsValidationSummary,
  NormalizedBoundingBox,
  PatternRelationship,
  VisualElement,
  VisualRegion
} from '../../types/investigation';
import { confidenceLevelSchema, normalizedBoundingBoxSchema } from './regionSchema';

export const visualElementCategorySchema = z.enum([
  'geometric-motif',
  'background-texture',
  'icon-symbol',
  'component-style',
  'decorative-detail'
]);

export const visualElementCharacteristicsSchema = z.object({
  geometry: z.string().min(1).max(240),
  surfaceAndColor: z.string().min(1).max(240),
  styleTraits: z.array(z.string().min(1).max(80)).min(1).max(6),
  visualRole: z.string().min(1).max(280)
});

export const visualElementInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  category: visualElementCategorySchema,
  subcategory: z.string().min(1).max(100),
  description: z.string().min(1).max(600),
  boundingBox: normalizedBoundingBoxSchema,
  additionalLocations: z.array(normalizedBoundingBoxSchema).max(6).default([]),
  boundaryPrecision: z.enum(['precise', 'approximate']).default('approximate'),
  repetitionStatus: z.enum(['recurring', 'individual']).default('individual'),
  surfaceBasis: z
    .enum(['directly-visible-surface', 'inferred-visual-effect'])
    .default('inferred-visual-effect'),
  characteristics: visualElementCharacteristicsSchema,
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(6),
  parentRegionId: z.string().min(1).nullable().optional(),
  parentRegionName: z.string().min(1).nullable().optional(),
  relatedRegionIds: z.array(z.string().min(1)).optional(),
  occurrenceCount: z.number().int().min(1).optional()
});

export const patternRelationshipTypeSchema = z.enum([
  'repeated-motif',
  'shared-component-language',
  'recurring-background',
  'structural-rhythm'
]);

export const patternRelationshipInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  patternType: patternRelationshipTypeSchema,
  description: z.string().min(1).max(600),
  elementIds: z.array(z.string().min(1)).min(1).optional(),
  elementNames: z.array(z.string().min(1)).min(1).optional(),
  regionIds: z.array(z.string().min(1)).optional(),
  occurrenceCount: z.number().int().min(1).optional(),
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(6)
});

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || 'element';
}

function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clampBox(box: NormalizedBoundingBox): NormalizedBoundingBox | null {
  const x = roundCoord(box.x);
  const y = roundCoord(box.y);
  const width = roundCoord(Math.min(box.width, 1 - x));
  const height = roundCoord(Math.min(box.height, 1 - y));
  if (width < 0.015 || height < 0.015) return null;
  return { x, y, width, height };
}

export function computeBoxIoU(a: NormalizedBoundingBox, b: NormalizedBoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function computeContainmentRatio(
  inner: NormalizedBoundingBox,
  outer: NormalizedBoundingBox
): number {
  const x1 = Math.max(inner.x, outer.x);
  const y1 = Math.max(inner.y, outer.y);
  const x2 = Math.min(inner.x + inner.width, outer.x + outer.width);
  const y2 = Math.min(inner.y + inner.height, outer.y + outer.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const innerArea = inner.width * inner.height;
  return innerArea > 0 ? inter / innerArea : 0;
}

export function findContainingRegion(
  box: NormalizedBoundingBox,
  regions: readonly VisualRegion[]
): VisualRegion | null {
  if (regions.length === 0) return null;

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let best: VisualRegion | null = null;
  let bestScore = 0;

  for (const region of regions) {
    const rb = region.boundingBox;
    const containment = computeContainmentRatio(box, rb);
    const centerInside =
      cx >= rb.x && cx <= rb.x + rb.width && cy >= rb.y && cy <= rb.y + rb.height;
    if (containment < 0.3 && !centerInside) continue;

    const regionArea = Math.max(0.001, rb.width * rb.height);
    const score = containment * 2 + (centerInside ? 0.5 : 0) - regionArea * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = region;
    }
  }

  return best;
}

export function buildStableElementId(
  category: string,
  name: string,
  box: NormalizedBoundingBox
): string {
  return `el-${category}-${slugify(name)}-${Math.round(box.x * 100)}-${Math.round(box.y * 100)}`;
}

export function buildStablePatternId(patternType: string, name: string): string {
  return `pat-${patternType}-${slugify(name)}`;
}

/**
 * Pure, deterministic validator and normalizer for M9 visual elements and
 * shared pattern relationships.
 * - Strictly validates normalized [0, 1] bounding boxes.
 * - Deterministically links each element and its occurrences to containing M8 regions.
 * - Enforces anti-hallucination repetition discipline: never marks a single-occurrence
 *   element as recurring and never retains a PatternRelationship with < 2 verified
 *   distinct bounding-box occurrences on the screenshot.
 */
export function validateAndNormalizeElementsAndPatterns(
  rawElements: unknown,
  rawPatterns: unknown,
  regions: readonly VisualRegion[]
): ElementsAndPatternsValidationSummary {
  const elements: VisualElement[] = [];
  const usedElementIds = new Set<string>();
  let rejectedElementCount = 0;

  const regionById = new Map<string, VisualRegion>();
  for (const r of regions) {
    regionById.set(r.id, r);
  }

  if (Array.isArray(rawElements)) {
    for (const candidate of rawElements) {
      const parsed = visualElementInputSchema.safeParse(candidate);
      if (!parsed.success) {
        rejectedElementCount += 1;
        continue;
      }

      const valid = parsed.data;
      const primaryBox = clampBox(valid.boundingBox);
      if (!primaryBox) {
        rejectedElementCount += 1;
        continue;
      }

      // Deduplicate extra locations so overlapping duplicates never fabricate repetition
      const distinctAdditional: NormalizedBoundingBox[] = [];
      for (const loc of valid.additionalLocations) {
        const clamped = clampBox(loc);
        if (!clamped) continue;
        if (computeBoxIoU(primaryBox, clamped) > 0.65) continue;
        if (distinctAdditional.some((existing) => computeBoxIoU(existing, clamped) > 0.65)) {
          continue;
        }
        distinctAdditional.push(clamped);
      }

      // Resolve containing M8 region geometrically (or validate server-linked region ID)
      const linkedRegion =
        (valid.parentRegionId ? regionById.get(valid.parentRegionId) : null) ??
        findContainingRegion(primaryBox, regions);

      const relatedRegionSet = new Set<string>();
      if (linkedRegion) relatedRegionSet.add(linkedRegion.id);
      for (const loc of distinctAdditional) {
        const reg = findContainingRegion(loc, regions);
        if (reg) relatedRegionSet.add(reg.id);
      }

      const occurrenceCount = 1 + distinctAdditional.length;
      const repetitionStatus = occurrenceCount >= 2 ? 'recurring' : 'individual';

      const preferredId =
        valid.id && valid.id.trim().length > 0
          ? valid.id.trim()
          : buildStableElementId(valid.category, valid.name, primaryBox);
      let stableId = preferredId;
      let suffix = 2;
      while (usedElementIds.has(stableId)) {
        stableId = `${preferredId}-${suffix}`;
        suffix += 1;
      }
      usedElementIds.add(stableId);

      elements.push({
        id: stableId,
        name: valid.name.trim(),
        category: valid.category,
        subcategory: valid.subcategory.trim(),
        description: valid.description.trim(),
        boundingBox: primaryBox,
        additionalLocations: distinctAdditional,
        boundaryPrecision: valid.boundaryPrecision,
        repetitionStatus,
        surfaceBasis: valid.surfaceBasis,
        characteristics: {
          geometry: valid.characteristics.geometry.trim(),
          surfaceAndColor: valid.characteristics.surfaceAndColor.trim(),
          styleTraits: valid.characteristics.styleTraits.map((t) => t.trim()).filter(Boolean),
          visualRole: valid.characteristics.visualRole.trim()
        },
        confidence: valid.confidence,
        evidence: valid.evidence.map((e) => e.trim()).filter(Boolean),
        parentRegionId: linkedRegion?.id ?? null,
        parentRegionName: linkedRegion?.name ?? null,
        relatedRegionIds: Array.from(relatedRegionSet),
        occurrenceCount
      });
    }
  }

  // Deterministic reading-order sort
  elements.sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 0.02) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  // Validate PatternRelationships against verified elements
  const patterns: PatternRelationship[] = [];
  const usedPatternIds = new Set<string>();
  let rejectedPatternCount = 0;

  const elementById = new Map<string, VisualElement>();
  const elementByName = new Map<string, VisualElement>();
  for (const el of elements) {
    elementById.set(el.id, el);
    elementByName.set(el.name.toLowerCase(), el);
  }

  if (Array.isArray(rawPatterns)) {
    for (const candidate of rawPatterns) {
      const parsed = patternRelationshipInputSchema.safeParse(candidate);
      if (!parsed.success) {
        rejectedPatternCount += 1;
        continue;
      }

      const valid = parsed.data;
      const matched: VisualElement[] = [];
      const seenElIds = new Set<string>();

      if (valid.elementIds && valid.elementIds.length > 0) {
        for (const id of valid.elementIds) {
          const found = elementById.get(id);
          if (found && !seenElIds.has(found.id)) {
            seenElIds.add(found.id);
            matched.push(found);
          }
        }
      } else if (valid.elementNames && valid.elementNames.length > 0) {
        for (const rawName of valid.elementNames) {
          const needle = rawName.trim().toLowerCase();
          const found =
            elementByName.get(needle) ??
            elements.find(
              (el) =>
                el.name.toLowerCase().includes(needle) || needle.includes(el.name.toLowerCase())
            );
          if (found && !seenElIds.has(found.id)) {
            seenElIds.add(found.id);
            matched.push(found);
          }
        }
      }

      if (matched.length === 0) {
        rejectedPatternCount += 1;
        continue;
      }

      // Deduplicate bounding boxes across matched elements to verify genuine >=2 repetition
      const distinctBoxes: NormalizedBoundingBox[] = [];
      for (const el of matched) {
        for (const box of [el.boundingBox, ...el.additionalLocations]) {
          if (!distinctBoxes.some((existing) => computeBoxIoU(existing, box) > 0.65)) {
            distinctBoxes.push(box);
          }
        }
      }

      if (distinctBoxes.length < 2) {
        rejectedPatternCount += 1;
        continue;
      }

      const regionSet = new Set<string>();
      for (const el of matched) {
        for (const rId of el.relatedRegionIds) {
          regionSet.add(rId);
        }
      }

      const preferredId =
        valid.id && valid.id.trim().length > 0
          ? valid.id.trim()
          : buildStablePatternId(valid.patternType, valid.name);
      let stableId = preferredId;
      let suffix = 2;
      while (usedPatternIds.has(stableId)) {
        stableId = `${preferredId}-${suffix}`;
        suffix += 1;
      }
      usedPatternIds.add(stableId);

      patterns.push({
        id: stableId,
        name: valid.name.trim(),
        patternType: valid.patternType,
        description: valid.description.trim(),
        elementIds: matched.map((m) => m.id),
        regionIds: Array.from(regionSet),
        occurrenceCount: distinctBoxes.length,
        confidence: valid.confidence,
        evidence: valid.evidence.map((e) => e.trim()).filter(Boolean)
      });
    }
  }

  // Ensure elements belonging to a verified >=2-location pattern relationship reflect recurring status
  const patternMemberIds = new Set(patterns.flatMap((p) => p.elementIds));
  const finalElements = elements.map((el) =>
    patternMemberIds.has(el.id) && el.repetitionStatus === 'individual'
      ? { ...el, repetitionStatus: 'recurring' as const }
      : el
  );

  return {
    elements: finalElements,
    patterns,
    rejectedElementCount,
    rejectedPatternCount
  };
}
