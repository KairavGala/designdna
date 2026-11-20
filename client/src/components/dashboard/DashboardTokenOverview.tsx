import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Braces, Check, Copy } from 'lucide-react';
import type { DashboardState } from '../../services/dashboard/deriveDashboardState';
import type { PaletteExtractionResult } from '../../types/colors';
import {
  PROVENANCE_LABELS,
  TOKEN_CATEGORY_LABELS,
  TOKEN_CATEGORY_ORDER,
  type DesignSystem
} from '../../types/designSystem';
import type { PageId } from '../../types/navigation';
import { SecondaryButton } from '../ui/Buttons';
import { EmptyState } from '../ui/EmptyState';
import { SectionCard } from '../ui/SectionCard';

export interface DashboardTokenOverviewProps {
  designSystem: DesignSystem | null;
  colorResult: PaletteExtractionResult | null;
  dashboard: DashboardState;
  onNavigate: (page: PageId) => void;
}

const PROVENANCE_TEXT_COLOR = {
  measured: 'text-[#34D399]',
  'ai-inferred': 'text-accent',
  derived: 'text-[#FBBF24]'
} as const;

async function copyTokenValue(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback for restricted iframe contexts
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

export const DashboardTokenOverview: React.FC<DashboardTokenOverviewProps> = ({
  designSystem,
  colorResult,
  dashboard,
  onNavigate
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (id: string, value: string) => {
    await copyTokenValue(value);
    setCopiedId(id);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1500);
  }, []);

  if (!designSystem) {
    return (
      <SectionCard
        title="Design Token Overview"
        description="Unified semantic tokens normalised from measured pixels and visual AI."
      >
        {colorResult ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-ink">
                  Measured palette preview
                </p>
                <span className="text-xs font-mono text-[#34D399] tabular-nums">
                  {colorResult.colors.length} measured
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                {colorResult.colors.slice(0, 6).map((color) => {
                  const isCopied = copiedId === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => void handleCopy(color.id, color.hex)}
                      aria-label={`Copy ${color.hex}`}
                      className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-elevated/70 transition-colors text-left cursor-pointer min-w-0"
                    >
                      <span
                        className="w-5 h-5 rounded border border-border-strong shrink-0"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-mono font-medium text-ink truncate">
                            {color.hex}
                          </p>
                          {isCopied && (
                            <Check className="w-3 h-3 text-[#34D399] shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-muted tabular-nums">
                          {color.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-1.5">
              <p className="text-sm font-medium text-ink">
                Full token normalisation awaits Visual AI
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Complete AI Visual Interpretation to generate semantic CSS variables and structured
                JSON tokens across colours, typography, spacing, radii, borders, shadows, and layout.
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            compact
            icon={Braces}
            title="No normalised design tokens yet"
            description="Semantic design tokens will populate here automatically once measured colour extraction and AI Visual Interpretation complete."
          />
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Design Token Overview"
      description={`${designSystem.metrics.totalTokens} normalised tokens across ${TOKEN_CATEGORY_ORDER.filter((c) => dashboard.categoryCounts[c] > 0).length} categories.`}
      action={
        <SecondaryButton size="sm" onClick={() => onNavigate('design-tokens')}>
          <span>Open Explorer</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
        </SecondaryButton>
      }
      bodyClassName="p-0"
    >
      <div className="sr-only" aria-live="polite">
        {copiedId ? 'Token value copied to clipboard.' : ''}
      </div>

      {/* Category Distribution */}
      <div className="px-5 py-4 sm:px-6 border-b border-border space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-ink">Tokens by category</p>
          <span className="text-[11px] text-muted font-mono tabular-nums">
            {designSystem.metrics.deduplicatedCount} deduplicated ·{' '}
            {designSystem.reconciliationNotes.length} reconciled
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
          {TOKEN_CATEGORY_ORDER.map((category) => (
            <div
              key={category}
              className="flex items-baseline justify-between gap-2 text-xs py-1 border-b border-border/60"
            >
              <span className="text-muted truncate">
                {TOKEN_CATEGORY_LABELS[category]}
              </span>
              <span className="font-mono font-medium text-ink tabular-nums">
                {dashboard.categoryCounts[category]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Colour Tokens Preview */}
      {dashboard.previewTokens.colors.length > 0 && (
        <div className="px-5 py-4 sm:px-6 border-b border-border space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-ink">Key colour tokens</p>
            <button
              type="button"
              onClick={() => onNavigate('design-tokens')}
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              View all {dashboard.categoryCounts.color}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {dashboard.previewTokens.colors.slice(0, 6).map((token) => {
              const isCopied = copiedId === token.id;
              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => void handleCopy(token.id, token.value)}
                  aria-label={`Copy ${token.name} value ${token.value}`}
                  className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-elevated/70 transition-colors text-left cursor-pointer min-w-0"
                >
                  <span
                    className="w-6 h-6 rounded border border-border-strong shrink-0"
                    style={{ backgroundColor: token.value }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p
                        className="text-xs font-mono font-medium text-ink truncate"
                        title={token.cssVariable}
                      >
                        {token.name}
                      </p>
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
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="font-mono text-ink/85">{token.value}</span>
                      <span aria-hidden="true">·</span>
                      <span className={PROVENANCE_TEXT_COLOR[token.provenance]}>
                        {PROVENANCE_LABELS[token.provenance]}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Typography & Spacing Previews */}
      <div className="px-5 py-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Typography Preview */}
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-ink">Typography tokens</p>
            <span className="text-[11px] font-mono text-muted tabular-nums">
              {dashboard.categoryCounts.typography}
            </span>
          </div>
          {dashboard.previewTokens.typography.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {dashboard.previewTokens.typography.map((token) => (
                <li
                  key={token.id}
                  className="py-1.5 flex items-baseline justify-between gap-3 text-xs min-w-0"
                >
                  <span className="font-mono text-muted truncate" title={token.cssVariable}>
                    {token.name}
                  </span>
                  <span
                    className="font-mono text-ink tabular-nums truncate max-w-[50%] text-right"
                    title={token.value}
                  >
                    {token.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No typography tokens generated.</p>
          )}
        </div>

        {/* Spacing Preview */}
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-ink">Spacing tokens</p>
            <span className="text-[11px] font-mono text-muted tabular-nums">
              {dashboard.categoryCounts.spacing}
            </span>
          </div>
          {dashboard.previewTokens.spacing.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {dashboard.previewTokens.spacing.map((token) => {
                const numericPx = parseFloat(token.value);
                const barWidth =
                  Number.isFinite(numericPx) && numericPx > 0
                    ? Math.min(48, Math.max(4, numericPx))
                    : 12;

                return (
                  <li
                    key={token.id}
                    className="py-1.5 flex items-center justify-between gap-3 text-xs min-w-0"
                  >
                    <span className="font-mono text-muted truncate" title={token.cssVariable}>
                      {token.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="h-1.5 rounded-[1px] bg-accent/80"
                        style={{ width: `${barWidth}px` }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-ink tabular-nums">
                        {token.value}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted">No spacing tokens generated.</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
