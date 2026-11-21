import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Focus,
  Info,
  Layers,
  Repeat,
  RotateCcw
} from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  type ElementVisualAssets,
  type NormalizedBoundingBox,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface ElementInspectorPanelProps {
  image: UploadedImage;
  element: VisualElement | null;
  pattern: PatternRelationship | null;
  allElements: readonly VisualElement[];
  allRegions: readonly VisualRegion[];
  allPatterns: readonly PatternRelationship[];
  elementAssetsMap: Record<string, ElementVisualAssets>;
  samplingAssets: boolean;
  onSelectRegion: (regionId: string) => void;
  onSelectElement: (elementId: string) => void;
  onSelectPattern: (patternId: string) => void;
  onZoomToBox: (box: NormalizedBoundingBox, label: string) => void;
  onReturnFullScreenshot: () => void;
}

const CONFIDENCE_STYLE = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
} as const;

async function copyHexValue(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export const ElementInspectorPanel: React.FC<ElementInspectorPanelProps> = ({
  image,
  element,
  pattern,
  allElements,
  allRegions,
  allPatterns,
  elementAssetsMap,
  samplingAssets,
  onSelectRegion,
  onSelectElement,
  onSelectPattern,
  onZoomToBox,
  onReturnFullScreenshot
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (hex: string) => {
    await copyHexValue(hex);
    setCopiedHex(hex);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev));
    }, 1500);
  }, []);

  // ── Shared Pattern Relationship Inspector ───────────────────────────────
  if (pattern) {
    const memberElements = pattern.elementIds
      .map((id) => allElements.find((e) => e.id === id))
      .filter((e): e is VisualElement => Boolean(e));

    const connectedRegions = pattern.regionIds
      .map((id) => allRegions.find((r) => r.id === id))
      .filter((r): r is VisualRegion => Boolean(r));

    const comparisonCrops: Array<{ url: string; label: string; box: NormalizedBoundingBox }> = [];
    for (const member of memberElements) {
      const assets = elementAssetsMap[member.id];
      const boxes = [member.boundingBox, ...member.additionalLocations];
      const urls = assets?.occurrenceCropUrls ?? (assets?.primaryCropUrl ? [assets.primaryCropUrl] : []);
      urls.forEach((url, idx) => {
        if (comparisonCrops.length < 6 && boxes[idx]) {
          comparisonCrops.push({
            url,
            label: `${member.name} #${idx + 1}`,
            box: boxes[idx]
          });
        }
      });
    }

    const primaryTargetBox = memberElements[0]?.boundingBox ?? null;

    return (
      <aside
        aria-label={`Pattern details for ${pattern.name}`}
        className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3.5 border-b border-border space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-mono text-[#F59E0B]">
                {PATTERN_TYPE_LABELS[pattern.patternType]}
              </p>
              <h2 className="text-sm font-semibold text-ink tracking-[-0.015em] leading-snug mt-0.5">
                {pattern.name}
              </h2>
            </div>
            <span
              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_STYLE[pattern.confidence]}`}
            >
              {pattern.confidence} conf.
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">{pattern.description}</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-medium">
              <Repeat className="w-3 h-3" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                {pattern.occurrenceCount} verified occurrences
              </span>
            </span>
            {connectedRegions.length > 0 && (
              <>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>
                  {connectedRegions.length} region{connectedRegions.length === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {primaryTargetBox && (
              <button
                type="button"
                onClick={() => onZoomToBox(primaryTargetBox, pattern.name)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent-border bg-accent-soft text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Focus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Zoom First</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReturnFullScreenshot}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-xs font-medium text-muted hover:text-ink hover:border-border-strong transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Full View</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-border overflow-y-auto max-h-[560px]">
          {/* Visual Comparison Strip of Real Screenshot Crops */}
          {comparisonCrops.length > 0 && (
            <div className="px-4 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink">Visual Comparison</h3>
                <span className="text-[11px] font-mono text-faint tabular-nums">
                  {comparisonCrops.length} crops
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {comparisonCrops.map((crop, idx) => (
                  <button
                    key={`${crop.label}-${idx}`}
                    type="button"
                    onClick={() => onZoomToBox(crop.box, crop.label)}
                    title={`Zoom to occurrence #${idx + 1}`}
                    className="group relative rounded-lg border border-border bg-canvas overflow-hidden p-2 flex flex-col items-center justify-center gap-1.5 hover:border-accent-border transition-colors cursor-pointer"
                  >
                    <img
                      src={crop.url}
                      alt={`Screenshot crop ${idx + 1} for ${pattern.name}`}
                      className="max-h-16 max-w-full object-contain rounded-sm"
                    />
                    <span className="text-[10px] font-mono text-faint group-hover:text-accent transition-colors tabular-nums">
                      Instance #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Member Elements */}
          {memberElements.length > 0 && (
            <div className="px-4 py-3.5 space-y-2">
              <h3 className="text-xs font-semibold text-ink">Participating Elements</h3>
              <div className="space-y-1.5">
                {memberElements.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectElement(member.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border bg-canvas/70 hover:border-accent-border hover:bg-elevated/70 transition-colors text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{member.name}</p>
                      <p className="text-[11px] text-muted truncate">
                        {ELEMENT_CATEGORY_SHORT_LABELS[member.category]} · {member.occurrenceCount}×
                      </p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Connected M8 Regions */}
          {connectedRegions.length > 0 && (
            <div className="px-4 py-3.5 space-y-2">
              <h3 className="text-xs font-semibold text-ink">Connected Regions</h3>
              <div className="flex flex-wrap gap-1.5">
                {connectedRegions.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => onSelectRegion(reg.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-canvas text-[11px] font-medium text-ink hover:border-accent-border hover:text-accent transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-accent" aria-hidden="true" />
                    <span>{reg.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observable Evidence */}
          <div className="px-4 py-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">Supporting Evidence</h3>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted">
              {pattern.evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span
                    className="w-1 h-1 rounded-full bg-[#F59E0B] mt-1.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2.5 border-t border-border flex items-start gap-2 text-[11px] text-faint leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Shared patterns are verified strictly from 2 or more distinct bounding-box
                occurrences on the screenshot.
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // ── Individual or Recurring Visual Element Inspector ────────────────────
  if (!element) return null;

  const assets = elementAssetsMap[element.id];
  const measuredSwatches = assets?.measuredColors ?? [];
  const primaryCropUrl = assets?.primaryCropUrl ?? null;
  const occurrenceCrops = assets?.occurrenceCropUrls ?? [];
  const pixelBox = normalizedBoxToPixels(element.boundingBox, image.width, image.height);
  const allOccurrenceBoxes = [element.boundingBox, ...element.additionalLocations];

  const parentRegion = element.parentRegionId
    ? allRegions.find((r) => r.id === element.parentRegionId) ?? null
    : null;

  const linkedPatterns = allPatterns.filter((p) => p.elementIds.includes(element.id));
  const relatedElements = allElements
    .filter(
      (other) =>
        other.id !== element.id &&
        ((element.parentRegionId && other.parentRegionId === element.parentRegionId) ||
          linkedPatterns.some((p) => p.elementIds.includes(other.id)))
    )
    .slice(0, 4);

  const isComponent = element.category === 'component-style';
  const categoryAccentClass = isComponent ? 'text-[#38BDF8]' : 'text-[#F59E0B]';

  return (
    <aside
      aria-label={`Element details for ${element.name}`}
      className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
    >
      <div className="sr-only" aria-live="polite">
        {copiedHex ? `Copied ${copiedHex} to clipboard.` : ''}
      </div>

      {/* Header & Real Screenshot Crop Preview */}
      <div className="px-4 py-3.5 border-b border-border space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-[11px] font-mono ${categoryAccentClass}`}>
              {ELEMENT_CATEGORY_SHORT_LABELS[element.category]} · {element.subcategory}
            </p>
            <h2 className="text-sm font-semibold text-ink tracking-[-0.015em] leading-snug mt-0.5">
              {element.name}
            </h2>
          </div>
          <span
            className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_STYLE[element.confidence]}`}
          >
            {element.confidence} conf.
          </span>
        </div>

        {/* Real Cropped Screenshot Preview */}
        {primaryCropUrl ? (
          <div
            className="rounded-lg border border-border bg-canvas p-2.5 flex items-center justify-center min-h-[96px] max-h-[152px] overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(rgba(145, 162, 165, 0.12) 1px, transparent 1px)',
              backgroundSize: '14px 14px'
            }}
          >
            <img
              src={primaryCropUrl}
              alt={`Cropped screenshot preview of ${element.name}`}
              className="max-h-[132px] max-w-full object-contain rounded-sm shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
            />
          </div>
        ) : samplingAssets ? (
          <div className="rounded-lg border border-border bg-canvas p-4 text-center text-[11px] text-muted">
            Generating screenshot crop…
          </div>
        ) : null}

        <p className="text-xs text-muted leading-relaxed">{element.description}</p>

        {/* Quiet Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span
            className={
              element.repetitionStatus === 'recurring'
                ? 'text-accent font-medium'
                : 'text-ink/90 font-medium'
            }
          >
            {element.repetitionStatus === 'recurring'
              ? `Recurring (${element.occurrenceCount} locations)`
              : 'Individual element'}
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {pixelBox.width} × {pixelBox.height}px
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="text-faint capitalize">{element.boundaryPrecision}</span>
        </div>

        {/* Parent Region Link */}
        {parentRegion && (
          <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
            <span className="text-[11px] text-faint">Parent region</span>
            <button
              type="button"
              onClick={() => onSelectRegion(parentRegion.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer truncate"
            >
              <Layers className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{parentRegion.name}</span>
              <ArrowUpRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onZoomToBox(element.boundingBox, element.name)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent-border bg-accent-soft text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Focus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zoom to Element</span>
          </button>
          <button
            type="button"
            onClick={onReturnFullScreenshot}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-xs font-medium text-muted hover:text-ink hover:border-border-strong transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Full View</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="divide-y divide-border overflow-y-auto max-h-[520px]">
        {/* Side-by-side repeated occurrences comparison (only when genuinely recurring) */}
        {element.repetitionStatus === 'recurring' && occurrenceCrops.length >= 2 && (
          <div className="px-4 py-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">Repeated Occurrences</h3>
              <span className="text-[11px] font-mono text-accent tabular-nums">
                {occurrenceCrops.length} crops
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {occurrenceCrops.map((url, idx) => (
                <button
                  key={`${element.id}-occ-${idx}`}
                  type="button"
                  onClick={() => {
                    const box = allOccurrenceBoxes[idx];
                    if (box) onZoomToBox(box, `${element.name} #${idx + 1}`);
                  }}
                  className="group rounded-lg border border-border bg-canvas p-1.5 flex flex-col items-center gap-1 hover:border-accent-border transition-colors cursor-pointer"
                >
                  <img
                    src={url}
                    alt={`${element.name} occurrence ${idx + 1}`}
                    className="max-h-14 max-w-full object-contain rounded-sm"
                  />
                  <span className="text-[10px] font-mono text-faint group-hover:text-accent tabular-nums">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Locally Measured Colours inside Element Bounds */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Sampled Colours</h3>
            <span className="text-[11px] font-medium text-[#34D399]">Measured pixels</span>
          </div>

          {samplingAssets ? (
            <p className="text-xs text-muted">Sampling element pixels…</p>
          ) : measuredSwatches.length > 0 ? (
            <div className="space-y-1">
              {measuredSwatches.map((swatch) => {
                const isCopied = copiedHex === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => void handleCopy(swatch.hex)}
                    aria-label={`Copy element colour ${swatch.hex}`}
                    className="group w-full flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-elevated/80 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded border border-border-strong shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-xs font-medium text-ink">{swatch.hex}</span>
                      {isCopied ? (
                        <Check className="w-3 h-3 text-[#34D399] shrink-0" aria-hidden="true" />
                      ) : (
                        <Copy
                          className="w-3 h-3 text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
                      {swatch.percentage.toFixed(1)}%
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">
              No dominant colour clusters sampled inside this crop.
            </p>
          )}
        </div>

        {/* Visual Characteristics */}
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Visual Characteristics</h3>
            <span className="text-[11px] font-medium text-accent">
              {element.category === 'background-texture' &&
              element.surfaceBasis === 'directly-visible-surface'
                ? 'Visible surface'
                : 'AI-Inferred'}
            </span>
          </div>

          <dl className="space-y-2.5 text-xs">
            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">Geometry &amp; Form</dt>
              <dd className="text-ink/95 leading-relaxed">{element.characteristics.geometry}</dd>
            </div>

            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">Surface &amp; Colour</dt>
              <dd className="text-ink/95 leading-relaxed">
                {element.characteristics.surfaceAndColor}
              </dd>
            </div>

            {element.characteristics.styleTraits.length > 0 && (
              <div className="space-y-0.5">
                <dt className="text-[11px] font-medium text-faint">Observed Traits</dt>
                <dd className="text-ink/95 leading-relaxed">
                  {element.characteristics.styleTraits.join(' · ')}
                </dd>
              </div>
            )}

            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">Visual Identity Role</dt>
              <dd className="text-ink/95 leading-relaxed">{element.characteristics.visualRole}</dd>
            </div>
          </dl>
        </div>

        {/* Linked Shared Patterns & Related Elements */}
        {(linkedPatterns.length > 0 || relatedElements.length > 0) && (
          <div className="px-4 py-3.5 space-y-2.5">
            <h3 className="text-xs font-semibold text-ink">Pattern Relationships &amp; Related</h3>

            {linkedPatterns.map((pat) => (
              <button
                key={pat.id}
                type="button"
                onClick={() => onSelectPattern(pat.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-[#F59E0B]/35 bg-[#F59E0B]/[0.06] hover:bg-[#F59E0B]/[0.12] transition-colors text-left cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{pat.name}</p>
                  <p className="text-[11px] text-[#F59E0B] font-mono tabular-nums">
                    Shared pattern · {pat.occurrenceCount}× occurrences
                  </p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
              </button>
            ))}

            {relatedElements.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <p className="text-[11px] font-medium text-faint">Related Elements</p>
                {relatedElements.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectElement(rel.id)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-elevated/80 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-xs text-ink truncate">{rel.name}</span>
                    <span className="text-[11px] text-muted shrink-0">
                      {ELEMENT_CATEGORY_SHORT_LABELS[rel.category]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Supporting Evidence & Grounded Honesty Note */}
        <div className="px-4 py-3.5 space-y-2.5">
          <p className="text-[11px] font-medium text-faint">Supporting Visual Evidence</p>
          <ul className="space-y-1 text-xs text-muted">
            {element.evidence.map((ev, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span
                  className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{ev}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2.5 border-t border-border flex items-start gap-2 text-[11px] text-faint leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Cropped preview and swatches come directly from screenshot pixels. Style and motif
              classifications are visual interpretations — no icon library source or DOM/CSS code
              was inspected.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
