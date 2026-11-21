import React from 'react';
import { Info } from 'lucide-react';
import type { ConfidenceLevel } from '../../types/analysis';
import { PROVENANCE_LABELS, type TokenProvenance } from '../../types/designSystem';

export const PROVENANCE_TEXT_STYLE: Record<TokenProvenance, string> = {
  measured: 'text-[#34D399]',
  'ai-inferred': 'text-accent',
  derived: 'text-[#FBBF24]'
};

export const CONFIDENCE_TEXT_STYLE: Record<ConfidenceLevel, string> = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
};

export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below
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

export interface BoardSectionHeaderProps {
  index: string;
  title: string;
  subtitle: string;
  provenanceLabel?: string;
  provenanceKind?: TokenProvenance;
  confidence?: ConfidenceLevel | null;
  rightSlot?: React.ReactNode;
}

export const BoardSectionHeader: React.FC<BoardSectionHeaderProps> = ({
  index,
  title,
  subtitle,
  provenanceLabel,
  provenanceKind,
  confidence,
  rightSlot
}) => (
  <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-border">
    <div className="space-y-1 min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-xs text-accent tabular-nums">{index}.</span>
        <h2 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
      </div>
      <p className="text-xs sm:text-[13px] text-muted leading-relaxed max-w-2xl">
        {subtitle}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs shrink-0">
      {provenanceLabel && (
        <span
          className={
            provenanceKind
              ? `font-medium ${PROVENANCE_TEXT_STYLE[provenanceKind]}`
              : 'text-muted font-medium'
          }
        >
          {provenanceLabel}
        </span>
      )}
      {provenanceLabel && confidence && (
        <span className="text-border-strong" aria-hidden="true">
          ·
        </span>
      )}
      {confidence && (
        <span className={`font-medium capitalize ${CONFIDENCE_TEXT_STYLE[confidence]}`}>
          {confidence} confidence
        </span>
      )}
      {rightSlot}
    </div>
  </header>
);

export interface ProvenanceInlineProps {
  provenance: TokenProvenance;
  confidence?: ConfidenceLevel | null;
  extra?: string | null;
}

export const ProvenanceInline: React.FC<ProvenanceInlineProps> = ({
  provenance,
  confidence,
  extra
}) => (
  <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
    <span className={`font-medium ${PROVENANCE_TEXT_STYLE[provenance]}`}>
      {PROVENANCE_LABELS[provenance]}
    </span>
    {confidence && (
      <>
        <span className="text-border-strong" aria-hidden="true">
          ·
        </span>
        <span className={`capitalize ${CONFIDENCE_TEXT_STYLE[confidence]}`}>
          {confidence}
        </span>
      </>
    )}
    {extra && (
      <>
        <span className="text-border-strong" aria-hidden="true">
          ·
        </span>
        <span className="text-faint">{extra}</span>
      </>
    )}
  </span>
);

export interface SectionUnavailableNoticeProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const SectionUnavailableNotice: React.FC<SectionUnavailableNoticeProps> = ({
  title,
  description,
  action
}) => (
  <div className="rounded-xl border border-border bg-canvas/60 px-5 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3 min-w-0">
      <Info className="w-4 h-4 text-faint shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-muted leading-relaxed max-w-2xl">{description}</p>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
