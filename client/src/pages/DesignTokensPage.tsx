import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Braces, Check, Copy, GitCompareArrows, Palette, ScanLine } from 'lucide-react';
import type { ConfidenceLevel } from '../types/analysis';
import {
  PROVENANCE_LABELS,
  TOKEN_CATEGORY_LABELS,
  TOKEN_CATEGORY_ORDER,
  type DesignSystem,
  type TokenCategory,
  type TokenProvenance
} from '../types/designSystem';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { TokenInspector } from '../components/tokens/TokenInspector';
import { TokenOutputPreview } from '../components/tokens/TokenOutputPreview';
import { TokenScreenshotPreview } from '../components/tokens/TokenScreenshotPreview';
import { TokenVisualSwatch } from '../components/tokens/TokenVisualSwatch';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface DesignTokensPageProps {
  image: UploadedImage | null;
  designSystem: DesignSystem | null;
  onNavigate: (page: PageId) => void;
}

type CategoryFilter = 'all' | TokenCategory;
type ProvenanceFilter = 'all' | TokenProvenance;

const CONFIDENCE_SHORT: Record<ConfidenceLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

const PROVENANCE_TAG_STYLE: Record<TokenProvenance, string> = {
  measured: 'text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30',
  'ai-inferred': 'text-accent bg-accent-soft border-accent-border',
  derived: 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/30'
};

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback for restricted iframe clipboard contexts
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

export const DesignTokensPage: React.FC<DesignTokensPageProps> = ({
  image,
  designSystem,
  onNavigate
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [provenanceFilter, setProvenanceFilter] = useState<ProvenanceFilter>('all');
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const filteredTokens = useMemo(() => {
    if (!designSystem) return [];
    const baseList =
      categoryFilter === 'all'
        ? designSystem.tokens
        : designSystem.byCategory[categoryFilter];
    if (provenanceFilter === 'all') return baseList;
    return baseList.filter((t) => t.provenance === provenanceFilter);
  }, [designSystem, categoryFilter, provenanceFilter]);

  useEffect(() => {
    if (filteredTokens.length === 0) {
      setSelectedTokenId('');
      return;
    }
    if (!filteredTokens.some((t) => t.id === selectedTokenId)) {
      setSelectedTokenId(filteredTokens[0].id);
    }
  }, [filteredTokens, selectedTokenId]);

  const triggerCopy = useCallback(async (value: string, key: string) => {
    await copyTextToClipboard(value);
    setCopiedKey(key);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1500);
  }, []);

  if (!designSystem || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Design Tokens"
          description="Unified, normalised semantic design tokens combining measured pixels and AI visual interpretation."
        />
        <SectionCard>
          <EmptyState
            icon={Braces}
            title="No normalised design system yet"
            description="Upload a screenshot, extract measured colours, and run AI Visual Interpretation from Colors to generate unified semantic design tokens."
            action={
              <PrimaryButton onClick={() => onNavigate(image ? 'colors' : 'new-analysis')}>
                {image ? (
                  <>
                    <Palette className="w-4 h-4" aria-hidden="true" />
                    <span>Go to Colors</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" aria-hidden="true" />
                    <span>Go to New Analysis</span>
                  </>
                )}
              </PrimaryButton>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const selectedToken =
    filteredTokens.find((t) => t.id === selectedTokenId) ??
    filteredTokens[0] ??
    designSystem.tokens[0];

  return (
    <PageContainer>
      <PageHeading
        title="Design Tokens"
        description={`Unified DesignSystem v${designSystem.schemaVersion} normalised from ${image.name}.`}
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
            <Palette className="w-4 h-4 text-muted" aria-hidden="true" />
            <span>Back to Colors</span>
          </SecondaryButton>
        }
      />

      <div className="sr-only" aria-live="polite">
        {copiedKey ? 'Token value copied to clipboard.' : ''}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Normalised Tokens</p>
          <p className="text-lg font-semibold text-ink font-mono tabular-nums">
            {designSystem.metrics.totalTokens}
          </p>
          <p className="text-xs text-muted">Zod-validated</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Measured</p>
          <p className="text-lg font-semibold text-[#34D399] font-mono tabular-nums">
            {designSystem.metrics.measuredCount}
          </p>
          <p className="text-xs text-muted">Pixel &amp; bitmap facts</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">AI-Inferred</p>
          <p className="text-lg font-semibold text-accent font-mono tabular-nums">
            {designSystem.metrics.aiInferredCount}
          </p>
          <p className="text-xs text-muted font-mono truncate">
            {designSystem.source.aiModel ?? 'None'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Derived</p>
          <p className="text-lg font-semibold text-[#FBBF24] font-mono tabular-nums">
            {designSystem.metrics.derivedCount}
          </p>
          <p className="text-xs text-muted">Contrast &amp; scale math</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Reconciled / Deduped</p>
          <p className="text-lg font-semibold text-ink font-mono tabular-nums">
            {designSystem.metrics.conflictCount} / {designSystem.metrics.deduplicatedCount}
          </p>
          <p className="text-xs text-muted">Measured preserved</p>
        </div>
      </div>

      {/* Category & Provenance Filter Controls */}
      <SectionCard
        title="Token Browser"
        description="Filter normalised semantic tokens by category or provenance. Select any token to inspect its evidence and reconciliation trail."
      >
        <div className="space-y-3">
          {/* Category tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by token category">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={[
                'px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                categoryFilter === 'all'
                  ? 'bg-accent text-[#051315] border-accent font-semibold'
                  : 'bg-canvas text-ink border-border hover:border-border-strong'
              ].join(' ')}
            >
              All ({designSystem.tokens.length})
            </button>
            {TOKEN_CATEGORY_ORDER.map((category) => {
              const count = designSystem.byCategory[category].length;
              if (count === 0) return null;
              const isActive = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={[
                    'px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                    isActive
                      ? 'bg-accent text-[#051315] border-accent font-semibold'
                      : 'bg-canvas text-ink border-border hover:border-border-strong'
                  ].join(' ')}
                >
                  {TOKEN_CATEGORY_LABELS[category]} ({count})
                </button>
              );
            })}
          </div>

          {/* Provenance filter */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted font-medium">Provenance:</span>
            {(['all', 'measured', 'ai-inferred', 'derived'] as const).map((prov) => {
              const isActive = provenanceFilter === prov;
              const label = prov === 'all' ? 'All sources' : PROVENANCE_LABELS[prov];
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setProvenanceFilter(prov)}
                  className={[
                    'px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer',
                    isActive
                      ? 'bg-accent-soft text-accent border-accent-border'
                      : 'bg-surface text-muted border-border hover:text-ink hover:border-border-strong'
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Master-Detail Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <SectionCard
            title={
              categoryFilter === 'all'
                ? `All Tokens (${filteredTokens.length})`
                : `${TOKEN_CATEGORY_LABELS[categoryFilter]} (${filteredTokens.length})`
            }
            bodyClassName="p-0"
          >
            {filteredTokens.length === 0 ? (
              <div className="px-6 py-10 text-center space-y-1">
                <p className="text-sm font-medium text-ink">No tokens match this filter</p>
                <p className="text-xs text-muted">
                  Choose another category or provenance filter to view available tokens.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTokens.map((token) => {
                  const isSelected = selectedToken?.id === token.id;
                  const rowCopyKey = `row-${token.id}`;
                  const isCopied = copiedKey === rowCopyKey;

                  return (
                    <div
                      key={token.id}
                      onClick={() => setSelectedTokenId(token.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTokenId(token.id);
                        }
                      }}
                      aria-pressed={isSelected}
                      className={[
                        'px-4 py-3.5 sm:px-5 flex items-start justify-between gap-3 transition-colors cursor-pointer',
                        isSelected ? 'bg-subtle/90' : 'bg-surface hover:bg-canvas'
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <TokenVisualSwatch token={token} />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono text-[13px] font-semibold text-ink break-all">
                              {token.cssVariable}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium ${PROVENANCE_TAG_STYLE[token.provenance]}`}
                            >
                              {PROVENANCE_LABELS[token.provenance]}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                            <span className="font-mono text-ink/90 break-all">
                              {token.value}
                            </span>
                            <span className="text-border-strong" aria-hidden="true">
                              ·
                            </span>
                            <span>{CONFIDENCE_SHORT[token.confidence]} confidence</span>
                            {token.reconciliation &&
                              (token.reconciliation.status === 'anchored-to-measured' ||
                                token.reconciliation.status === 'conflict-preserved') && (
                                <>
                                  <span className="text-border-strong" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="text-accent font-medium">
                                    Anchored to measured
                                  </span>
                                </>
                              )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTokenId(token.id);
                          void triggerCopy(`${token.cssVariable}: ${token.value};`, rowCopyKey);
                        }}
                        aria-label={`Copy ${token.cssVariable} declaration`}
                        className="shrink-0 w-8 h-8 rounded border border-border bg-canvas hover:border-border-strong flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20">
          {selectedToken && (
            <TokenInspector
              token={selectedToken}
              copiedKey={copiedKey}
              onCopy={(value, key) => void triggerCopy(value, key)}
            />
          )}
        </div>
      </div>

      {/* Reconciliation & Deduplication Log */}
      {designSystem.reconciliationNotes.length > 0 && (
        <SectionCard
          title="Reconciliation & Deduplication Log"
          description="Transparent record of measured-vs-AI colour anchoring, conflict preservation, and duplicate token consolidation."
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {designSystem.reconciliationNotes.map((note) => (
              <div
                key={note.id}
                className="px-5 py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <GitCompareArrows
                    className="w-4 h-4 text-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-semibold text-ink">
                        --ddna-{note.tokenName}
                      </span>
                      <span className="text-xs text-muted capitalize">
                        {note.kind.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{note.explanation}</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-ink bg-canvas border border-border rounded px-2 py-0.5 self-start shrink-0">
                  {note.finalValue}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Screenshot-to-Token Visual Relationship */}
      <TokenScreenshotPreview image={image} designSystem={designSystem} />

      {/* Generated CSS & JSON Token Preview */}
      <TokenOutputPreview
        designSystem={designSystem}
        copiedKey={copiedKey}
        onCopy={(value, key) => void triggerCopy(value, key)}
      />
    </PageContainer>
  );
};
