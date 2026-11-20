import React from 'react';
import { Check, Copy } from 'lucide-react';
import type { ConfidenceLevel, SemanticColorAssignment } from '../../types/analysis';
import { SectionCard } from '../ui/SectionCard';

export interface SemanticColorRolesProps {
  roles: SemanticColorAssignment[];
  copiedKey: string | null;
  onCopyHex: (hex: string, key: string) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

export const SemanticColorRoles: React.FC<SemanticColorRolesProps> = ({
  roles,
  copiedKey,
  onCopyHex
}) => {
  return (
    <SectionCard
      title="Semantic Colour Roles (AI-Inferred)"
      description="Provisional design roles interpreted visually from screenshot context and grounded against your measured pixel palette."
      bodyClassName="p-0"
    >
      <div className="divide-y divide-border">
        {roles.map((item, index) => {
          const copyKey = `semantic-${item.role}-${index}`;
          const isCopied = copiedKey === copyKey;

          return (
            <div
              key={`${item.role}-${item.hex}-${index}`}
              className="px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <span
                  className="w-8 h-8 rounded-lg border border-border-strong shrink-0 mt-0.5"
                  style={{ backgroundColor: item.hex }}
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-sm font-semibold text-ink">{item.label}</h3>
                    <span className="text-xs text-muted">
                      {item.matchedMeasuredHex
                        ? `Matched measured ${item.matchedMeasuredHex}`
                        : 'Visual estimate'}
                    </span>
                    <span className="text-border-strong text-xs" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-muted">
                      {CONFIDENCE_LABELS[item.confidence]}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted leading-relaxed">
                    {item.rationale}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onCopyHex(item.hex, copyKey)}
                aria-label={`Copy ${item.label} HEX ${item.hex}`}
                className="self-start inline-flex items-center gap-1.5 font-mono text-[13px] font-medium text-ink hover:text-accent transition-colors cursor-pointer rounded px-2 py-1 border border-border bg-canvas shrink-0"
              >
                <span>{item.hex}</span>
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};
