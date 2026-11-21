import React from 'react';
import type {
  ComparisonProvenance,
  DifferenceIntelligenceModel,
  IntelligenceFindingItem
} from '../../types/comparison';

export interface DifferenceIntelligencePanelProps {
  intelligence: DifferenceIntelligenceModel;
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

const FindingList: React.FC<{
  title: string;
  items: IntelligenceFindingItem[];
  emptyText: string;
}> = ({ title, items, emptyText }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold text-ink tracking-wide">{title}</h3>
    {items.length === 0 ? (
      <p className="text-xs text-faint leading-relaxed">{emptyText}</p>
    ) : (
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="pt-3 first:pt-0 border-t first:border-t-0 border-border/80 space-y-1.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <span className="text-[11px] font-mono text-muted whitespace-nowrap">
                <span className={PROVENANCE_TONE[item.provenance]}>
                  {PROVENANCE_LABEL[item.provenance]}
                </span>
                {item.confidence && (
                  <>
                    <span className="mx-1 text-border-strong">·</span>
                    <span>{item.confidence} confidence</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">{item.detail}</p>
            {item.prominenceLabel && (
              <p className="text-[11px] text-accent font-medium">{item.prominenceLabel}</p>
            )}
            {item.evidence.length > 0 && (
              <p className="text-[11px] font-mono text-faint leading-relaxed">
                {item.evidence.join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const DifferenceIntelligencePanel: React.FC<DifferenceIntelligencePanelProps> = ({
  intelligence
}) => {
  return (
    <section
      aria-labelledby="difference-intelligence-heading"
      data-compare-section="difference-intelligence"
      className="rounded-xl border border-border bg-surface p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-1 max-w-3xl">
          <h2 id="difference-intelligence-heading" className="text-base font-semibold text-ink">
            02. Difference Intelligence
          </h2>
          <p className="text-sm text-ink/90 leading-relaxed">{intelligence.headline}</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-muted whitespace-nowrap">
          <span className="text-emerald-400">Measured</span>
          <span className="text-border-strong">·</span>
          <span className="text-accent">AI-Inferred</span>
          <span className="text-border-strong">·</span>
          <span className="text-sky-300">Derived</span>
        </div>
      </div>

      {intelligence.unavailableReason && (
        <p className="text-xs text-[#FBBF24] bg-[#FBBF24]/5 border border-[#FBBF24]/25 rounded-lg px-3.5 py-2.5">
          {intelligence.unavailableReason}
        </p>
      )}

      {intelligence.availability !== 'unavailable' && (
        <div className="space-y-6">
          {/* Most Significant Visual Differences */}
          <FindingList
            title="Most Significant Visual Differences"
            items={intelligence.keyDifferences}
            emptyText="No major visual divergences detected across currently available analysis categories."
          />

          {/* 3-Column Digest: Common Ground | Distinctive A | Distinctive B */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 border-t border-border">
            <FindingList
              title="Shared Across Both Designs"
              items={intelligence.commonalities}
              emptyText="No closely matching shared traits detected across available data."
            />
            <FindingList
              title="Distinctive to Design A"
              items={intelligence.distinctiveA}
              emptyText="Analyse Design A completely to surface distinctive identity findings."
            />
            <FindingList
              title="Distinctive to Design B"
              items={intelligence.distinctiveB}
              emptyText="Analyse Design B completely to surface distinctive identity findings."
            />
          </div>
        </div>
      )}
    </section>
  );
};
