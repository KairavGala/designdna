import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Focus,
  Info,
  RotateCcw
} from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import {
  REGION_CATEGORY_LABELS,
  type RegionMeasuredColor,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface RegionInspectorPanelProps {
  image: UploadedImage;
  region: VisualRegion | null;
  regionColors: readonly RegionMeasuredColor[] | undefined;
  samplingColors: boolean;
  totalRegions: number;
  aiModel: string | null;
  onZoomToRegion: (region: VisualRegion) => void;
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

export const RegionInspectorPanel: React.FC<RegionInspectorPanelProps> = ({
  image,
  region,
  regionColors,
  samplingColors,
  totalRegions,
  aiModel,
  onZoomToRegion,
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

  if (!region) {
    return (
      <aside
        aria-label="Region inspection panel"
        className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-ink tracking-[-0.015em]">
            Region Inspector
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            Contextual visual DNA breakdown
          </p>
        </div>

        <div className="p-5 flex-1 flex flex-col justify-center items-center text-center space-y-3 min-h-[260px]">
          <div className="w-10 h-10 rounded-lg bg-elevated border border-border flex items-center justify-center text-accent">
            <Crosshair className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-[240px]">
            <p className="text-sm font-semibold text-ink">
              {totalRegions > 0 ? 'Select a region to inspect' : 'No regions selected'}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {totalRegions > 0
                ? 'Click any highlighted region on the screenshot or choose one from the Visual Regions list to view its measured colours, visual characteristics, and design interpretation.'
                : 'Zoom and pan the unmodified screenshot to inspect visual composition manually.'}
            </p>
          </div>
          {aiModel && (
            <p className="text-[11px] font-mono text-faint pt-2">
              {totalRegions} region{totalRegions === 1 ? '' : 's'} · {aiModel}
            </p>
          )}
        </div>
      </aside>
    );
  }

  const pixelBox = normalizedBoxToPixels(region.boundingBox, image.width, image.height);
  const measuredSwatches = regionColors ?? [];

  return (
    <aside
      aria-label={`Inspection details for ${region.name}`}
      className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
    >
      <div className="sr-only" aria-live="polite">
        {copiedHex ? `Copied ${copiedHex} to clipboard.` : ''}
      </div>

      {/* Section 1: Region Overview */}
      <div className="px-4 py-3.5 border-b border-border space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-accent">
              {REGION_CATEGORY_LABELS[region.category]}
            </p>
            <h2 className="text-sm font-semibold text-ink tracking-[-0.015em] leading-snug mt-0.5">
              {region.name}
            </h2>
          </div>
          <span
            className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_STYLE[region.confidence]}`}
          >
            {region.confidence} conf.
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">{region.description}</p>

        {/* Bounds & Precision Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-muted tabular-nums">
          <span>
            {pixelBox.width} × {pixelBox.height}px
          </span>
          <span className="text-border-strong font-sans" aria-hidden="true">
            ·
          </span>
          <span>
            @{pixelBox.x},{pixelBox.y}
          </span>
          <span className="text-border-strong font-sans" aria-hidden="true">
            ·
          </span>
          <span className="font-sans text-faint capitalize">
            {region.boundaryPrecision} boundary
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onZoomToRegion(region)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent-border bg-accent-soft text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zoom to Region</span>
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
        {/* Section 2A: Dominant Region Colours (Measured locally from screenshot pixels) */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Dominant Colours</h3>
            <span className="text-[11px] font-medium text-[#34D399]">Measured pixels</span>
          </div>

          {samplingColors ? (
            <p className="text-xs text-muted">Sampling region pixels…</p>
          ) : measuredSwatches.length > 0 ? (
            <div className="space-y-1.5">
              {measuredSwatches.map((swatch) => {
                const isCopied = copiedHex === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => void handleCopy(swatch.hex)}
                    aria-label={`Copy region colour ${swatch.hex}`}
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
              No opaque dominant colour clusters could be sampled inside this region.
            </p>
          )}
        </div>

        {/* Section 2B: Visual Characteristics (AI-Inferred) */}
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Visual Characteristics</h3>
            <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
          </div>

          <dl className="space-y-2.5 text-xs">
            {region.observations.typography && (
              <div className="space-y-0.5">
                <dt className="text-[11px] font-medium text-faint">Typography</dt>
                <dd className="text-ink/95 leading-relaxed">
                  {region.observations.typography}
                </dd>
              </div>
            )}

            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">Layout &amp; Alignment</dt>
              <dd className="text-ink/95 leading-relaxed">
                {region.observations.layoutAlignment}
              </dd>
            </div>

            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">
                Shapes &amp; Components
              </dt>
              <dd className="text-ink/95 leading-relaxed">
                {region.observations.shapesAndComponents}
              </dd>
            </div>

            <div className="space-y-0.5">
              <dt className="text-[11px] font-medium text-faint">
                Spacing &amp; Composition
              </dt>
              <dd className="text-ink/95 leading-relaxed">
                {region.observations.spacingAndComposition}
              </dd>
            </div>

            {region.observations.decorativeElements && (
              <div className="space-y-0.5">
                <dt className="text-[11px] font-medium text-faint">
                  Decorative Elements
                </dt>
                <dd className="text-ink/95 leading-relaxed">
                  {region.observations.decorativeElements}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Section 3: Design Interpretation & Supporting Evidence */}
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-ink">Design Interpretation</h3>
            <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
          </div>

          <p className="text-xs text-ink leading-relaxed">
            {region.observations.designInterpretation}
          </p>

          {region.evidence.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-medium text-faint">Observable Evidence</p>
              <ul className="space-y-1 text-xs text-muted">
                {region.evidence.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span
                      className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grounded honesty note */}
          <div className="pt-2.5 border-t border-border flex items-start gap-2 text-[11px] text-faint leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Colours above are measured directly from screenshot pixels. All structural,
              typographic, and design observations are visual inferences — no HTML, CSS, or DOM
              source was inspected.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
