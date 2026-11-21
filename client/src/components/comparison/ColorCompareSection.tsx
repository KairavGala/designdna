import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { ExtractedColor } from '../../types/colors';
import type { ColorComparisonModel, PaletteCharacteristicsSummary } from '../../types/comparison';

export interface ColorCompareSectionProps {
  colorComparison: ColorComparisonModel;
}

const PaletteColumn: React.FC<{
  title: string;
  colors: readonly ExtractedColor[];
  summary: PaletteCharacteristicsSummary | null;
  copiedHex: string | null;
  onCopyHex: (hex: string) => void;
}> = ({ title, colors, summary, copiedHex, onCopyHex }) => (
  <div className="space-y-3 min-w-0">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {summary ? (
        <span className="text-[11px] font-mono tabular-nums text-muted">
          {summary.toneLabel} · {summary.extractedCount} clusters · {summary.averageSaturation}% avg sat
        </span>
      ) : (
        <span className="text-[11px] font-mono text-faint">Not extracted</span>
      )}
    </div>

    {colors.length === 0 ? (
      <p className="text-xs text-faint py-4">
        Measured palette unavailable. Run colour extraction on {title}.
      </p>
    ) : (
      <>
        {/* Proportional spectrum bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-md border border-border/80 bg-canvas">
          {colors.map((c) => (
            <div
              key={c.id}
              style={{
                width: `${Math.max(3, c.percentage)}%`,
                backgroundColor: c.hex
              }}
              title={`${c.hex} · ${c.percentage}%`}
            />
          ))}
        </div>

        {/* Measured swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colors.map((c) => {
            const isCopied = copiedHex === `${title}-${c.hex}`;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCopyHex(`${title}-${c.hex}`)}
                className="group flex items-center gap-2.5 rounded-lg border border-border bg-canvas/80 hover:border-border-strong p-2 text-left transition-colors cursor-pointer min-w-0"
                title={`Copy ${c.hex}`}
              >
                <span
                  className="w-7 h-7 rounded border border-white/10 shrink-0"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono text-ink truncate">{c.hex}</span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-accent shrink-0" aria-hidden="true" />
                    ) : (
                      <Copy
                        className="w-3 h-3 text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="text-[11px] font-mono tabular-nums text-muted">
                    {c.percentage}% · #{c.rank}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </>
    )}
  </div>
);

export const ColorCompareSection: React.FC<ColorCompareSectionProps> = ({
  colorComparison
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    const hex = key.split('-').pop() ?? '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && hex) {
      void navigator.clipboard.writeText(hex).catch(() => undefined);
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  return (
    <section
      aria-labelledby="color-compare-heading"
      data-compare-section="colors"
      className="rounded-xl border border-border bg-surface p-6 space-y-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-border">
        <div className="space-y-0.5">
          <h2 id="color-compare-heading" className="text-base font-semibold text-ink">
            04. Measured Colour Comparison
          </h2>
          <p className="text-xs text-muted">
            Direct pixel-sampled HEX palettes matched via CIE76 Lab perceptual distance (ΔE ≤ 14).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums whitespace-nowrap">
          <span className="text-emerald-400">Measured</span>
          {colorComparison.availability === 'ready' && (
            <>
              <span className="text-border-strong">·</span>
              <span className="text-ink">
                {colorComparison.sharedColors.length} shared ·{' '}
                {colorComparison.paletteOverlapPercentage ?? 0}% overlap
              </span>
            </>
          )}
        </div>
      </div>

      {colorComparison.unavailableReason && (
        <p className="text-xs text-[#FBBF24] bg-[#FBBF24]/5 border border-[#FBBF24]/25 rounded-lg px-3.5 py-2.5">
          {colorComparison.unavailableReason}
        </p>
      )}

      {/* Side-by-Side Palettes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaletteColumn
          title="Design A"
          colors={colorComparison.paletteA}
          summary={colorComparison.summaryA}
          copiedHex={copiedKey}
          onCopyHex={handleCopy}
        />
        <PaletteColumn
          title="Design B"
          colors={colorComparison.paletteB}
          summary={colorComparison.summaryB}
          copiedHex={copiedKey}
          onCopyHex={handleCopy}
        />
      </div>

      {/* Shared vs Noticeably Different Colours */}
      {colorComparison.availability === 'ready' && (
        <div className="space-y-5 pt-5 border-t border-border">
          {/* Shared Perceptual Matches */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">
                Perceptually Shared Colours (CIE76 ΔE ≤ 14)
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-muted">
                {colorComparison.sharedColors.length} pair
                {colorComparison.sharedColors.length === 1 ? '' : 's'}
              </span>
            </div>

            {colorComparison.sharedColors.length === 0 ? (
              <p className="text-xs text-muted">
                No measured colour clusters fall within perceptual distance ΔE ≤ 14 across both screenshots.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {colorComparison.sharedColors.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas/70 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-7 h-7 rounded-l border border-white/15"
                          style={{ backgroundColor: match.colorA.hex }}
                          title={`Design A: ${match.colorA.hex}`}
                        />
                        <span
                          className="w-7 h-7 rounded-r border border-white/15"
                          style={{ backgroundColor: match.colorB.hex }}
                          title={`Design B: ${match.colorB.hex}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-ink truncate">
                          {match.colorA.hex} ↔ {match.colorB.hex}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-muted">
                          A {match.colorA.percentage}% · B {match.colorB.percentage}%
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono tabular-nums text-accent">
                        ΔE {match.deltaE}
                      </p>
                      <p className="text-[11px] text-faint">{match.similarityLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Noticeably Different Colours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/70">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ink">
                Distinctive to Design A ({colorComparison.distinctiveA.length})
              </h3>
              {colorComparison.distinctiveA.length === 0 ? (
                <p className="text-xs text-faint">All measured clusters matched Design B.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colorComparison.distinctiveA.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-canvas/70 px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/15 shrink-0"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden="true"
                      />
                      <span className="text-ink">{c.hex}</span>
                      <span className="text-muted">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ink">
                Distinctive to Design B ({colorComparison.distinctiveB.length})
              </h3>
              {colorComparison.distinctiveB.length === 0 ? (
                <p className="text-xs text-faint">All measured clusters matched Design A.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colorComparison.distinctiveB.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-canvas/70 px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/15 shrink-0"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden="true"
                      />
                      <span className="text-ink">{c.hex}</span>
                      <span className="text-muted">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Palette Characteristics Summary Notes */}
          {colorComparison.observations.length > 0 && (
            <ul className="space-y-1.5 pt-3 border-t border-border/70">
              {colorComparison.observations.map((obs, idx) => (
                <li key={idx} className="text-xs text-muted leading-relaxed">
                  <span className="font-mono text-[11px] text-emerald-400 mr-2">
                    [{obs.provenance === 'measured' ? 'Measured' : 'Derived'}]
                  </span>
                  {obs.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
