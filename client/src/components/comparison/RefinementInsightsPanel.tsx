import React from 'react';
import type { ComparisonProvenance, RefinementInsightItem } from '../../types/comparison';

export interface RefinementInsightsPanelProps {
  insights: readonly RefinementInsightItem[];
  canCompareMeasured: boolean;
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

export const RefinementInsightsPanel: React.FC<RefinementInsightsPanelProps> = ({
  insights,
  canCompareMeasured
}) => {
  return (
    <section
      aria-labelledby="refinement-insights-heading"
      data-compare-section="refinement-insights"
      className="rounded-xl border border-border bg-surface p-6 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-border">
        <div className="space-y-0.5">
          <h2 id="refinement-insights-heading" className="text-base font-semibold text-ink">
            07. Refinement Insights
          </h2>
          <p className="text-xs text-muted">
            Actionable, non-destructive design observations grounded strictly in measured and AI-inferred findings from your comparison. Neither screenshot nor its original analysis is modified.
          </p>
        </div>

        <span className="text-xs font-mono tabular-nums text-muted whitespace-nowrap">
          {insights.length} grounded observation{insights.length === 1 ? '' : 's'}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="text-xs text-muted leading-relaxed">
          {canCompareMeasured
            ? 'No significant cross-design inconsistencies surfaced from currently available metrics. Run AI Visual Interpretation on both slots to evaluate typography, spacing, component, and motif refinements.'
            : 'Analyse both Design A and Design B to unlock evidence-backed refinement insights.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => (
            <article
              key={insight.id}
              data-refinement-insight={insight.id}
              className="rounded-lg border border-border bg-canvas/70 p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-mono">
                  <span className="text-ink/80">
                    {insight.categoryLabel} · {insight.appliesToLabel}
                  </span>
                  <span className={PROVENANCE_TONE[insight.provenance]}>
                    {PROVENANCE_LABEL[insight.provenance]}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-ink leading-snug">
                  {insight.title}
                </h3>

                <p className="text-xs text-muted leading-relaxed">{insight.observation}</p>
                <p className="text-xs text-ink/90 leading-relaxed">{insight.suggestion}</p>
              </div>

              <div className="pt-2.5 border-t border-border/70 text-[11px] font-mono text-faint leading-relaxed">
                Evidence: {insight.referencedFindings.join(' · ')}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
