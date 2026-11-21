import React from 'react';
import type { ComparisonProvenance, VisualIdentityDimensionRow } from '../../types/comparison';

export interface VisualIdentityCompareMatrixProps {
  rows: readonly VisualIdentityDimensionRow[];
}

const PROVENANCE_LABEL: Record<ComparisonProvenance, string> = {
  measured: 'Measured',
  'ai-inferred': 'AI-Inferred',
  derived: 'Derived'
};

const PROVENANCE_TONE: Record<ComparisonProvenance, string> = {
  measured: 'text-emerald-400',
  'ai-inferred': 'text-accent',
  derived: 'text-sky-300'
};

export const VisualIdentityCompareMatrix: React.FC<VisualIdentityCompareMatrixProps> = ({
  rows
}) => {
  const readyCount = rows.filter((r) => r.availability === 'ready').length;

  return (
    <section
      aria-labelledby="visual-identity-compare-heading"
      data-compare-section="visual-identity"
      className="rounded-xl border border-border bg-surface overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <h2 id="visual-identity-compare-heading" className="text-base font-semibold text-ink">
            03. Visual Identity Comparison
          </h2>
          <p className="text-xs text-muted">
            Nine core design dimensions aligned side by side with provenance and screenshot-only evidence.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-muted whitespace-nowrap">
          {readyCount} / {rows.length} dimensions comparable
        </span>
      </div>

      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="px-6 py-4 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">{row.label}</h3>
              <div className="flex items-center gap-2 text-[11px] font-mono whitespace-nowrap">
                <span className={PROVENANCE_TONE[row.provenance]}>
                  {PROVENANCE_LABEL[row.provenance]}
                </span>
                {row.confidence && (
                  <>
                    <span className="text-border-strong">·</span>
                    <span className="text-muted">{row.confidence} confidence</span>
                  </>
                )}
                <span className="text-border-strong">·</span>
                <span
                  className={
                    row.availability === 'ready'
                      ? 'text-ink/80'
                      : row.availability === 'partial'
                        ? 'text-[#FBBF24]'
                        : 'text-faint'
                  }
                >
                  {row.availability === 'ready'
                    ? 'Comparable'
                    : row.availability === 'partial'
                      ? 'Partial'
                      : 'Unavailable'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] font-mono text-faint">Design A</p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  {row.designAValue ?? (
                    <span className="text-faint italic">Not yet analysed for Design A.</span>
                  )}
                </p>
              </div>
              <div className="space-y-1 min-w-0 md:border-l md:border-border/70 md:pl-4">
                <p className="text-[11px] font-mono text-faint">Design B</p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  {row.designBValue ?? (
                    <span className="text-faint italic">Not yet analysed for Design B.</span>
                  )}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed pt-1">{row.differenceNote}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
