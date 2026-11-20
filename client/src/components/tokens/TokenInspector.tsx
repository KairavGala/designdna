import React from 'react';
import { Check, Copy, GitCompareArrows } from 'lucide-react';
import type { ConfidenceLevel } from '../../types/analysis';
import {
  PROVENANCE_LABELS,
  TOKEN_CATEGORY_LABELS,
  type DesignToken,
  type TokenProvenance
} from '../../types/designSystem';
import { SectionCard } from '../ui/SectionCard';
import { TokenVisualSwatch } from './TokenVisualSwatch';

export interface TokenInspectorProps {
  token: DesignToken;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

const PROVENANCE_STYLES: Record<TokenProvenance, string> = {
  measured: 'text-[#34D399] bg-[#34D399]/10 border-[#34D399]/25',
  'ai-inferred': 'text-accent bg-accent-soft border-accent-border',
  derived: 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/25'
};

const RECONCILIATION_LABELS: Record<
  NonNullable<DesignToken['reconciliation']>['status'],
  string
> = {
  aligned: 'Aligned with measured pixels',
  'anchored-to-measured': 'Anchored to measured value',
  'conflict-preserved': 'Measured value preserved (conflict logged)',
  'ai-only': 'AI visual estimate (no close pixel cluster)'
};

export const TokenInspector: React.FC<TokenInspectorProps> = ({
  token,
  copiedKey,
  onCopy
}) => {
  const cssVarCopyKey = `var-${token.id}`;
  const valueCopyKey = `val-${token.id}`;

  return (
    <SectionCard
      title="Token Inspector"
      description={`${TOKEN_CATEGORY_LABELS[token.category]} · ${token.id}`}
    >
      <div className="space-y-5">
        {/* Header with preview & provenance */}
        <div className="flex items-start gap-3.5">
          <TokenVisualSwatch token={token} />
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold text-ink font-mono break-all">
              {token.cssVariable}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded border font-medium ${PROVENANCE_STYLES[token.provenance]}`}
              >
                {PROVENANCE_LABELS[token.provenance]}
              </span>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="text-muted">{CONFIDENCE_LABELS[token.confidence]}</span>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-muted">{token.cssType}</span>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">{token.description}</p>

        {/* Copyable CSS Variable & Value */}
        <div className="space-y-2.5">
          <div className="rounded-lg border border-border bg-canvas px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted">CSS Custom Property</p>
              <p className="font-mono text-xs text-ink break-all mt-0.5">
                {token.cssVariable}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(token.cssVariable, cssVarCopyKey)}
              aria-label={`Copy CSS variable ${token.cssVariable}`}
              className="shrink-0 w-8 h-8 rounded border border-border bg-surface hover:border-border-strong flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
            >
              {copiedKey === cssVarCopyKey ? (
                <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="rounded-lg border border-border bg-canvas px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted">Normalized Value</p>
              <p className="font-mono text-xs text-ink break-all mt-0.5">{token.value}</p>
              {token.rawValue && (
                <p className="text-[11px] text-muted mt-1 break-words">
                  Original input: <span className="font-mono">{token.rawValue}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onCopy(token.value, valueCopyKey)}
              aria-label={`Copy value ${token.value}`}
              className="shrink-0 w-8 h-8 rounded border border-border bg-surface hover:border-border-strong flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
            >
              {copiedKey === valueCopyKey ? (
                <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Reconciliation block when present */}
        {token.reconciliation && (
          <div className="rounded-lg border border-border bg-subtle/60 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <GitCompareArrows className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
              <span>{RECONCILIATION_LABELS[token.reconciliation.status]}</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {token.reconciliation.resolution}
            </p>
            {(token.reconciliation.measuredValue || token.reconciliation.aiSuggestedValue) && (
              <dl className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border text-xs">
                {token.reconciliation.measuredValue && (
                  <div>
                    <dt className="text-[11px] text-muted">Measured</dt>
                    <dd className="font-mono text-ink mt-0.5">
                      {token.reconciliation.measuredValue}
                    </dd>
                  </div>
                )}
                {token.reconciliation.aiSuggestedValue && (
                  <div>
                    <dt className="text-[11px] text-muted">AI Estimate</dt>
                    <dd className="font-mono text-ink mt-0.5">
                      {token.reconciliation.aiSuggestedValue}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        )}

        {/* Supporting Evidence */}
        <div className="pt-3 border-t border-border space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold text-ink">Supporting Evidence</h4>
            <span className="text-[11px] text-muted text-right">{token.evidence.source}</span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {token.evidence.measuredRank !== undefined && (
              <div>
                <dt className="text-muted">Measured Rank</dt>
                <dd className="font-mono tabular-nums text-ink mt-0.5">
                  #{token.evidence.measuredRank}
                </dd>
              </div>
            )}
            {token.evidence.pixelPercentage !== undefined && (
              <div>
                <dt className="text-muted">Sampled Area</dt>
                <dd className="font-mono tabular-nums text-ink mt-0.5">
                  {token.evidence.pixelPercentage.toFixed(2)}%
                </dd>
              </div>
            )}
            {token.evidence.deltaE !== undefined && (
              <div>
                <dt className="text-muted">CIE76 ΔE Distance</dt>
                <dd className="font-mono tabular-nums text-ink mt-0.5">
                  {token.evidence.deltaE.toFixed(2)}
                </dd>
              </div>
            )}
            {token.evidence.contrastRatio !== undefined && (
              <div>
                <dt className="text-muted">WCAG Contrast</dt>
                <dd className="font-mono tabular-nums text-ink mt-0.5">
                  {token.evidence.contrastRatio}:1
                </dd>
              </div>
            )}
            {token.evidence.aiRole && (
              <div>
                <dt className="text-muted">AI Semantic Role</dt>
                <dd className="font-mono text-ink mt-0.5">{token.evidence.aiRole}</dd>
              </div>
            )}
          </dl>

          {token.evidence.notes.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {token.evidence.notes.map((note, idx) => (
                <li
                  key={`${token.id}-note-${idx}`}
                  className="text-xs text-muted leading-relaxed flex items-start gap-2"
                >
                  <span className="text-border-strong select-none" aria-hidden="true">
                    —
                  </span>
                  <span className="min-w-0 break-words">{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
