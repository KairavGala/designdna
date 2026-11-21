import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Focus,
  Info,
  Repeat2,
  RotateCcw
} from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import type { VisualRegion } from '../../types/investigation';
import {
  VISUAL_ELEMENT_CATEGORY_LABELS,
  VISUAL_ELEMENT_CATEGORY_SHORT_LABELS,
  type PatternVisualAsset,
  type VisualPatternElement
} from '../../types/patterns';
import type { UploadedImage } from '../../types/upload';

export interface PatternInspectorPanelProps {
  image: UploadedImage;
  pattern: VisualPatternElement;
  asset: PatternVisualAsset | undefined;
  regions: readonly VisualRegion[];
  allPatterns: readonly VisualPatternElement[];
  samplingAssets: boolean;
  onFocusPattern: (pattern: VisualPatternElement, occurrenceIndex?: number) => void;
  onSelectRegion: (regionId: string) => void;
  onSelectPattern: (patternId: string) => void;
  onReturnFullScreenshot: () => void;
}

const CONFIDENCE_STYLE = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
} as const;

async function copyHex(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback for restricted clipboard contexts
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

export const PatternInspectorPanel: React.FC<PatternInspectorPanelProps> = ({
  image,
  pattern,
  asset,
  regions,
  allPatterns,
  samplingAssets,
  onFocusPattern,
  onSelectRegion,
  onSelectPattern,
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
    await copyHex(hex);
    setCopiedHex(hex);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev));
    }, 1500);
  }, []);

  const primaryOcc = pattern.occurrences[0];
  const primaryPixelBox = normalizedBoxToPixels(
    primaryOcc.boundingBox,
    image.width,
    image.height
  );
  const isRecurring = pattern.recurrenceType === 'recurring-pattern';
  const measuredSwatches = asset?.measuredColors ?? [];
  const crops = asset?.occurrenceCrops ?? [];

  const linkedRegions = pattern.associatedRegionIds
    .map((id) => regions.find((r) => r.id === id))
    .filter((r): r is VisualRegion => Boolean(r));

  const relatedElements = pattern.relatedElementIds
    .map((id) => allPatterns.find((p) => p.id === id))
    .filter((p): p is VisualPatternElement => Boolean(p));

  return (
    <aside
      data-pattern-inspector="true"
      aria-label={`Pattern inspection details for ${pattern.name}`}
      className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
    >
      <div className="sr-only" aria-live="polite">
        {copiedHex ? `Copied ${copiedHex} to clipboard.` : ''}
      </div>

      {/* Header & Overview */}
      <div className="px-4 py-3.5 border-b border-border space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-mono ${
                pattern.category === 'component-style' ? 'text-[#38BDF8]' : 'text-[#F59E0B]'
              }`}
            >
              {VISUAL_ELEMENT_CATEGORY_LABELS[pattern.category]}
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

        {/* Recurrence & Observation Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-ink">
            {isRecurring && <Repeat2 className="w-3 h-3 text-[#FBBF24]" aria-hidden="true" />}
            <span>
              {isRecurring
                ? `Recurring pattern (${pattern.occurrenceCount}×)`
                : 'Individual element (1×)'}
            </span>
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="text-faint">
            {pattern.evidenceBasis === 'visible-surface'
              ? 'Visible surface'
              : 'AI visual inference'}
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-faint tabular-nums">
            {primaryPixelBox.width} × {primaryPixelBox.height}px
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onFocusPattern(pattern, 0)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent-border bg-accent-soft text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zoom to Element</span>
          </button>
          <button
            type="button"
            onClick={onReturnFullScreenshot}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-xs font-medium text-muted hover:text-ink hover:border-border-strong transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Full View</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="divide-y divide-border overflow-y-auto max-h-[560px]">
        {/* Screenshot Crops & Occurrence Comparison */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">
              {isRecurring ? 'Repeated Occurrence Comparison' : 'Screenshot Crop'}
            </h3>
            <span className="text-[11px] font-mono text-faint tabular-nums">
              {pattern.occurrences.length} location{pattern.occurrences.length === 1 ? '' : 's'}
            </span>
          </div>

          <div
            className={
              pattern.occurrences.length > 1 ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'
            }
          >
            {pattern.occurrences.map((occ, idx) => {
              const cropUrl = crops[idx] ?? null;
              const px = normalizedBoxToPixels(occ.boundingBox, image.width, image.height);
              return (
                <button
                  key={`${occ.locationLabel}-${idx}`}
                  type="button"
                  onClick={() => onFocusPattern(pattern, idx)}
                  title={`Zoom canvas to occurrence #${idx + 1}: ${occ.locationLabel}`}
                  className="group rounded-lg border border-border bg-canvas overflow-hidden text-left hover:border-accent-border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div className="h-20 bg-[#05080A] flex items-center justify-center p-1.5 overflow-hidden">
                    {cropUrl ? (
                      <img
                        src={cropUrl}
                        alt={`${pattern.name} — ${occ.locationLabel}`}
                        className="max-w-full max-h-full object-contain rounded-[2px]"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-faint tabular-nums">
                        {px.width}×{px.height}px
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1.5 border-t border-border/80 flex items-center justify-between gap-1 text-[10px]">
                    <span className="truncate text-muted group-hover:text-ink">
                      {pattern.occurrences.length > 1 ? `#${idx + 1} ` : ''}
                      {occ.locationLabel}
                    </span>
                    <span className="font-mono text-faint shrink-0 tabular-nums">
                      @{px.x},{px.y}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pattern Relationship (Strict Repetition Honesty) */}
        <div className="px-4 py-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Pattern Relationship</h3>
            <span className="text-[11px] font-medium text-accent">
              {isRecurring ? 'Shared motif' : 'Single instance'}
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {isRecurring && pattern.relationshipNote
              ? pattern.relationshipNote
              : 'Only one visible occurrence was verified on this screenshot, so this finding is classified as an individual visual element rather than a recurring pattern.'}
          </p>
        </div>

        {/* Measured Pixel Colours Inside Element */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Sampled Colours</h3>
            <span className="text-[11px] font-medium text-[#34D399]">Measured pixels</span>
          </div>

          {samplingAssets ? (
            <p className="text-xs text-muted">Sampling pixels…</p>
          ) : measuredSwatches.length > 0 ? (
            <div className="space-y-1.5">
              {measuredSwatches.map((swatch) => {
                const isCopied = copiedHex === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => void handleCopy(swatch.hex)}
                    aria-label={`Copy colour ${swatch.hex}`}
                    className="group w-full flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-elevated/80 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-5 h-5 rounded border border-border-strong shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-xs font-medium text-ink">
                        {swatch.hex}
                      </span>
                      {isCopied ? (
                        <Check
                          className="w-3 h-3 text-[#34D399] shrink-0"
                          aria-hidden="true"
                        />
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
              No dominant opaque colour clusters sampled inside this element bounds.
            </p>
          )}
        </div>

        {/* Visual Characteristics */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Visual Characteristics</h3>
            <span className="text-[11px] font-medium text-accent">
              {pattern.evidenceBasis === 'visible-surface' ? 'Visible surface' : 'AI-Inferred'}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-ink/95">
            {pattern.visualCharacteristics.map((trait, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span
                  className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Linked M8 Parent Regions */}
        {linkedRegions.length > 0 && (
          <div className="px-4 py-3.5 space-y-2">
            <h3 className="text-xs font-semibold text-ink">Parent Region{linkedRegions.length > 1 ? 's' : ''}</h3>
            <div className="space-y-1.5">
              {linkedRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelectRegion(region.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border bg-canvas/70 hover:border-accent-border hover:text-accent text-xs text-ink transition-colors cursor-pointer text-left"
                >
                  <span className="truncate font-medium">{region.name}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related Elements */}
        {relatedElements.length > 0 && (
          <div className="px-4 py-3.5 space-y-2">
            <h3 className="text-xs font-semibold text-ink">Related Visual Elements</h3>
            <div className="space-y-1.5">
              {relatedElements.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectPattern(rel.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border bg-canvas/70 hover:border-accent-border text-xs transition-colors cursor-pointer text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{rel.name}</p>
                    <p className="text-[11px] text-faint truncate">
                      {VISUAL_ELEMENT_CATEGORY_SHORT_LABELS[rel.category]}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Supporting Evidence & Honesty Disclaimer */}
        <div className="px-4 py-3.5 space-y-2.5">
          <h3 className="text-xs font-semibold text-ink">Supporting Evidence</h3>
          <ul className="space-y-1 text-xs text-muted">
            {pattern.evidence.map((ev, idx) => (
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
              Crops and colour swatches are extracted directly from screenshot pixels. Pattern,
              icon, and component classifications are visual observations — no HTML, CSS, SVG
              source, or icon library packages were inspected.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
