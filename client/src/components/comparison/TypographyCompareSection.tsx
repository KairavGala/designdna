import React from 'react';
import type { TypographyComparisonModel } from '../../types/comparison';

export interface TypographyCompareSectionProps {
  typography: TypographyComparisonModel;
}

function resolveSpecimenFontClass(fontStyle: string | undefined): string {
  if (!fontStyle) return 'font-sans';
  const lower = fontStyle.toLowerCase();
  if (lower.includes('mono') || lower.includes('code')) return 'font-mono';
  if (lower.includes('serif') && !lower.includes('sans')) return 'font-serif';
  return 'font-sans';
}

function clampSpecimenPx(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const px = raw.match(/(\d+(?:\.\d+)?)\s*px/i);
  if (px) return Math.max(12, Math.min(34, Math.round(parseFloat(px[1]) * 0.72)));
  const rem = raw.match(/(\d+(?:\.\d+)?)\s*rem/i);
  if (rem) return Math.max(12, Math.min(34, Math.round(parseFloat(rem[1]) * 16 * 0.72)));
  return fallback;
}

export const TypographyCompareSection: React.FC<TypographyCompareSectionProps> = ({
  typography
}) => {
  return (
    <section
      aria-labelledby="typography-compare-heading"
      data-compare-section="typography"
      className="rounded-xl border border-border bg-surface p-6 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-border">
        <div className="space-y-0.5">
          <h2 id="typography-compare-heading" className="text-base font-semibold text-ink">
            05. Typography Comparison
          </h2>
          <p className="text-xs text-muted">{typography.visualEstimateNotice}</p>
        </div>

        <span className="text-xs font-mono text-accent whitespace-nowrap">
          AI-Inferred Visual Estimates
        </span>
      </div>

      {typography.unavailableReason && (
        <p className="text-xs text-[#FBBF24] bg-[#FBBF24]/5 border border-[#FBBF24]/25 rounded-lg px-3.5 py-2.5">
          {typography.unavailableReason}
        </p>
      )}

      {/* Side-by-Side Type Voice Cards */}
      {(typography.designA || typography.designB) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: 'Design A', data: typography.designA },
            { label: 'Design B', data: typography.designB }
          ].map(({ label, data }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-canvas/70 p-4 space-y-3 min-w-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{label}</h3>
                {data ? (
                  <span className="text-[11px] font-mono text-muted">
                    {data.confidence} confidence · {data.hierarchyCount} tiers
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-faint">Unavailable</span>
                )}
              </div>

              {data ? (
                <>
                  {/* Specimen preview reflecting inferred family category */}
                  <div className="py-3 border-y border-border/70 space-y-1.5">
                    <p
                      className={`text-xl font-semibold text-ink leading-tight truncate ${resolveSpecimenFontClass(
                        data.headingStyle
                      )}`}
                    >
                      Aa Bb Cc — {data.headingStyle}
                    </p>
                    <p
                      className={`text-xs text-muted leading-relaxed ${resolveSpecimenFontClass(
                        data.bodyStyle
                      )}`}
                    >
                      Body specimen ({data.bodyStyle}): Hierarchy, proportion, and optical balance from screenshot pixels.
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[11px] text-faint">Heading Estimate</dt>
                      <dd className="text-ink font-medium">{data.headingStyle}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-faint">Body Estimate</dt>
                      <dd className="text-ink font-medium">{data.bodyStyle}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-faint">Monospace Accents</dt>
                      <dd className="text-ink font-medium">
                        {data.monospaceDetected ? 'Detected' : 'Not detected'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-faint">Scale Summary</dt>
                      <dd className="text-muted">{data.scaleSummary}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-xs text-faint py-4">
                  Run AI Visual Interpretation on {label} to inspect typography estimates.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aligned Hierarchy Specimens */}
      {typography.specimenRows.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-ink">
            Aligned Hierarchy Specimens (Visual Estimates)
          </h3>
          <div className="divide-y divide-border rounded-lg border border-border bg-canvas/50">
            {typography.specimenRows.map((row, idx) => (
              <div key={`${row.levelLabel}-${idx}`} className="p-4 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{row.levelLabel}</span>
                  <span className="text-[11px] text-muted">{row.differenceNote}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-mono text-faint">Design A</span>
                    {row.designA ? (
                      <>
                        <p
                          style={{ fontSize: `${clampSpecimenPx(row.designA.estimatedSize, 16)}px` }}
                          className={`text-ink leading-tight truncate ${resolveSpecimenFontClass(
                            typography.designA?.headingStyle
                          )}`}
                        >
                          {row.designA.level} · {row.designA.usage}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-muted">
                          ~{row.designA.estimatedSize} · weight {row.designA.estimatedWeight} · lh{' '}
                          {row.designA.lineHeight}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-faint italic">No corresponding tier in Design A.</p>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 md:border-l md:border-border/70 md:pl-4">
                    <span className="text-[11px] font-mono text-faint">Design B</span>
                    {row.designB ? (
                      <>
                        <p
                          style={{ fontSize: `${clampSpecimenPx(row.designB.estimatedSize, 16)}px` }}
                          className={`text-ink leading-tight truncate ${resolveSpecimenFontClass(
                            typography.designB?.headingStyle
                          )}`}
                        >
                          {row.designB.level} · {row.designB.usage}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-muted">
                          ~{row.designB.estimatedSize} · weight {row.designB.estimatedWeight} · lh{' '}
                          {row.designB.lineHeight}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-faint italic">No corresponding tier in Design B.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {typography.observations.length > 0 && (
        <ul className="space-y-1.5 pt-3 border-t border-border/70">
          {typography.observations.map((obs, idx) => (
            <li key={idx} className="text-xs text-muted leading-relaxed">
              <span className="font-mono text-[11px] text-accent mr-2">
                [{obs.provenance === 'ai-inferred' ? 'AI-Inferred' : 'Derived'}]
              </span>
              {obs.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
