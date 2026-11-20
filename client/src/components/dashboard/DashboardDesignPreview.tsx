import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Layers, Palette, Wand2 } from 'lucide-react';
import type { VisualAnalysisResult } from '../../types/analysis';
import type { PaletteExtractionResult } from '../../types/colors';
import type { DesignSystem } from '../../types/designSystem';
import type { PageId } from '../../types/navigation';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { SectionCard } from '../ui/SectionCard';

export interface DashboardDesignPreviewProps {
  colorResult: PaletteExtractionResult | null;
  visualResult: VisualAnalysisResult | null;
  designSystem: DesignSystem | null;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

async function copyText(value: string): Promise<boolean> {
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

function findTokenValue(
  designSystem: DesignSystem,
  candidateNames: string[],
  fallback: string
): string {
  for (const name of candidateNames) {
    const match = designSystem.tokens.find((t) => t.name === name);
    if (match) return match.value;
  }
  return fallback;
}

function parseFontPx(raw: string, fallback: number): number {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(28, Math.max(11, value));
}

function parseFontWeight(raw: string): number {
  const numeric = raw.match(/\b([1-9]00)\b/);
  if (numeric) return parseInt(numeric[1], 10);
  const lower = raw.toLowerCase();
  if (lower.includes('bold') || lower.includes('heavy') || lower.includes('black')) return 700;
  if (lower.includes('semi')) return 600;
  if (lower.includes('medium')) return 500;
  if (lower.includes('light')) return 300;
  return 400;
}

function resolveFontFamilyStack(fontStyle: string): string {
  const lower = fontStyle.toLowerCase();
  if (lower.includes('mono') || lower.includes('code')) {
    return 'var(--font-mono), ui-monospace, monospace';
  }
  if (lower.includes('serif') && !lower.includes('sans')) {
    return 'Georgia, "Times New Roman", serif';
  }
  return 'var(--font-sans), system-ui, sans-serif';
}

export const DashboardDesignPreview: React.FC<DashboardDesignPreviewProps> = ({
  colorResult,
  visualResult,
  designSystem,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopyHex = useCallback(async (hex: string) => {
    await copyText(hex);
    setCopiedHex(hex);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev));
    }, 1500);
  }, []);

  // State: screenshot uploaded, no colour extraction yet
  if (!colorResult || colorResult.colors.length === 0) {
    return (
      <SectionCard
        title="Visual DNA Preview"
        description="Live visual synthesis of extracted colour proportions, typography hierarchy, spacing rhythm, and tokenised UI specimens."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center text-muted shrink-0">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">
                Extract measured colours to generate the Visual DNA spectrum
              </p>
              <p className="text-xs text-muted leading-relaxed">
                DesignDNA never shows fabricated placeholder palettes or mock specimens. Run pixel
                extraction first to inspect real colour proportions.
              </p>
            </div>
          </div>
          <PrimaryButton size="sm" onClick={onStartExtraction} className="shrink-0">
            <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Extract Colours</span>
          </PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  const measuredColors = colorResult.colors.slice(0, 8);
  const totalMeasuredShare = measuredColors.reduce((sum, c) => sum + c.percentage, 0) || 100;

  const typography = visualResult?.interpretation.typography ?? null;
  const spacing = visualResult?.interpretation.spacing ?? null;
  const components = visualResult?.interpretation.components ?? [];

  const spacingSteps =
    designSystem && designSystem.byCategory.spacing.length > 0
      ? designSystem.byCategory.spacing.slice(0, 6).map((token) => ({
          id: token.id,
          label: token.name.replace(/^space-/, ''),
          value: token.value
        }))
      : spacing
        ? spacing.scaleSteps.slice(0, 6).map((step, i) => ({
            id: `${step.token}-${i}`,
            label: step.token,
            value: step.value
          }))
        : [];

  // Build scoped live UI specimen CSS variables strictly from extracted M6 tokens
  const specimenVars = designSystem
    ? ({
        '--spec-canvas': findTokenValue(
          designSystem,
          ['color-bg-canvas', 'color-palette-1'],
          measuredColors[0].hex
        ),
        '--spec-surface': findTokenValue(
          designSystem,
          ['color-bg-surface', 'color-bg-canvas', 'color-palette-1'],
          measuredColors[0].hex
        ),
        '--spec-text': findTokenValue(
          designSystem,
          ['color-text-primary', 'color-palette-2'],
          '#E8F0F0'
        ),
        '--spec-muted': findTokenValue(
          designSystem,
          ['color-text-secondary', 'color-text-primary'],
          '#91A2A5'
        ),
        '--spec-brand': findTokenValue(
          designSystem,
          ['color-brand-primary', 'color-accent', 'color-palette-3'],
          '#16D6C5'
        ),
        '--spec-on-brand': findTokenValue(designSystem, ['color-brand-on-primary'], '#051315'),
        '--spec-border': findTokenValue(designSystem, ['border-default'], '1px solid #1A2B30'),
        '--spec-radius': designSystem.byCategory.radius[0]?.value ?? '8px',
        '--spec-shadow': findTokenValue(designSystem, ['shadow-surface'], 'none'),
        '--spec-font-heading': typography
          ? resolveFontFamilyStack(typography.headingFontStyle)
          : 'var(--font-sans)',
        '--spec-font-body': typography
          ? resolveFontFamilyStack(typography.bodyFontStyle)
          : 'var(--font-sans)'
      } as React.CSSProperties)
    : null;

  return (
    <SectionCard
      title="Visual DNA Preview"
      description="Proportional colour spectrum, live typographic hierarchy, spacing rhythm, and extracted token preview."
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('colors')}
            className="text-xs font-medium text-muted hover:text-accent transition-colors cursor-pointer whitespace-nowrap"
          >
            Inspect Colors
          </button>
          {designSystem && (
            <>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() => onNavigate('design-tokens')}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer whitespace-nowrap"
              >
                All Tokens
              </button>
            </>
          )}
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="sr-only" aria-live="polite">
        {copiedHex ? `Copied ${copiedHex} to clipboard.` : ''}
      </div>

      {/* Band 1: Measured Proportional Colour Spectrum */}
      <div className="p-5 sm:p-6 border-b border-border space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-ink">Measured Colour Spectrum</p>
            <span className="text-[11px] font-medium text-[#34D399]">Measured pixels</span>
          </div>
          <span className="text-[11px] font-mono text-muted tabular-nums">
            {colorResult.colors.length} clusters · {colorResult.statistics.coveragePercentage.toFixed(1)}%
            coverage · click any swatch to copy HEX
          </span>
        </div>

        {/* Continuous Proportional Bar */}
        <div
          className="h-9 w-full rounded-lg overflow-hidden border border-border-strong/70 flex bg-canvas"
          role="img"
          aria-label={`Proportional colour spectrum of ${measuredColors.length} measured colours`}
        >
          {measuredColors.map((color) => {
            const widthPct = Math.max(2, (color.percentage / totalMeasuredShare) * 100);
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => void handleCopyHex(color.hex)}
                title={`Copy ${color.hex} (${color.percentage.toFixed(1)}%)`}
                aria-label={`Copy colour ${color.hex}, ${color.percentage.toFixed(1)} percent area`}
                style={{ width: `${widthPct}%`, backgroundColor: color.hex }}
                className="h-full transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer relative group"
              />
            );
          })}
        </div>

        {/* Interactive Click-to-Copy Swatch Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {measuredColors.map((color) => {
            const isCopied = copiedHex === color.hex;
            return (
              <button
                key={`legend-${color.id}`}
                type="button"
                onClick={() => void handleCopyHex(color.hex)}
                className="group flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-canvas hover:border-accent-border hover:bg-elevated/70 transition-colors text-left cursor-pointer min-w-0"
              >
                <span
                  className="w-4 h-4 rounded-[4px] border border-border-strong/80 shrink-0"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-mono font-medium text-ink truncate">
                      {color.hex}
                    </span>
                    {isCopied ? (
                      <Check
                        className="w-3 h-3 text-[#34D399] shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy
                        className="w-2.5 h-2.5 text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted tabular-nums">
                    {color.percentage.toFixed(1)}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Band 2: Typography Specimen + Spacing Rhythm + Tokenised UI & Components */}
      {visualResult && typography && spacing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Column A: Live Typography Specimen */}
          <div className="lg:col-span-4 p-5 sm:p-6 space-y-4 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Typography Specimen</p>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>

            <div className="space-y-3">
              {typography.hierarchy.slice(0, 4).map((item, idx) => {
                const fontSizePx = parseFontPx(item.estimatedSize, idx === 0 ? 22 : 14);
                const fontWeight = parseFontWeight(item.estimatedWeight);
                const isHeading = idx < 2;
                return (
                  <div
                    key={`${item.level}-${idx}`}
                    className="pb-2.5 border-b border-border/60 last:border-b-0 last:pb-0 space-y-1 min-w-0"
                  >
                    <p
                      className="text-ink truncate leading-tight"
                      style={{
                        fontSize: `${fontSizePx}px`,
                        fontWeight,
                        fontFamily: resolveFontFamilyStack(
                          isHeading ? typography.headingFontStyle : typography.bodyFontStyle
                        )
                      }}
                    >
                      {item.level}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-muted tabular-nums">
                      <span>{item.estimatedSize}</span>
                      <span className="text-border-strong" aria-hidden="true">
                        ·
                      </span>
                      <span>{item.estimatedWeight}</span>
                      <span className="text-border-strong" aria-hidden="true">
                        ·
                      </span>
                      <span>LH {item.lineHeight}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted pt-1">
              {typography.headingFontStyle}
              {typography.bodyFontStyle !== typography.headingFontStyle
                ? ` / ${typography.bodyFontStyle}`
                : ''}
              {typography.monospaceDetected ? ' · Monospace detected' : ''}
            </p>
          </div>

          {/* Column B: Visual Spacing Rhythm */}
          <div className="lg:col-span-4 p-5 sm:p-6 space-y-4 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Spacing Rhythm</p>
              <span className="text-[11px] font-mono text-muted">
                {spacing.baseUnit} base · <span className="capitalize">{spacing.density}</span>
              </span>
            </div>

            {spacingSteps.length > 0 ? (
              <div className="space-y-2.5">
                {spacingSteps.map((step) => {
                  const numericPx = parseFloat(step.value);
                  const barPx =
                    Number.isFinite(numericPx) && numericPx > 0
                      ? Math.min(140, Math.max(6, numericPx * 2.2))
                      : 16;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-3 text-xs min-w-0"
                    >
                      <span className="font-mono text-muted truncate w-20 shrink-0">
                        {step.label}
                      </span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 rounded-[2px] bg-accent/80 border border-accent/40 shrink-0"
                          style={{ width: `${barPx}px`, maxWidth: '100%' }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="font-mono text-ink tabular-nums shrink-0">
                        {step.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted">{spacing.sectionRhythm}</p>
            )}

            <p className="text-[11px] text-muted leading-relaxed pt-1">
              Container padding: <span className="font-mono text-ink">{spacing.containerPadding}</span>
            </p>
          </div>

          {/* Column C: Live Token UI Specimen & Detected Components */}
          <div className="lg:col-span-4 p-5 sm:p-6 space-y-4 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Live Token Specimen</p>
              <span className="text-[11px] font-mono text-muted">
                {designSystem ? `${designSystem.summary.themeMode} theme` : 'AI preview'}
              </span>
            </div>

            {specimenVars && designSystem ? (
              <div
                className="rounded-lg border border-border p-3.5"
                style={{
                  ...specimenVars,
                  backgroundColor: 'var(--spec-canvas)',
                  fontFamily: 'var(--spec-font-body)'
                }}
              >
                <div
                  className="p-3 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--spec-surface)',
                    border:
                      specimenVars['--spec-border' as keyof React.CSSProperties] === 'none'
                        ? '1px solid rgba(145,162,165,0.22)'
                        : 'var(--spec-border)',
                    borderRadius: 'var(--spec-radius)',
                    boxShadow: 'var(--spec-shadow)'
                  }}
                >
                  <p
                    className="text-xs font-semibold truncate"
                    style={{
                      color: 'var(--spec-text)',
                      fontFamily: 'var(--spec-font-heading)'
                    }}
                  >
                    {designSystem.summary.interfaceType}
                  </p>
                  <p
                    className="text-[11px] leading-relaxed line-clamp-2"
                    style={{ color: 'var(--spec-muted)' }}
                  >
                    {designSystem.summary.designTone}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: 'var(--spec-brand)',
                        color: 'var(--spec-on-brand)',
                        borderRadius: 'var(--spec-radius)'
                      }}
                    >
                      Primary
                    </span>
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: 'var(--spec-surface)',
                        color: 'var(--spec-text)',
                        border:
                          specimenVars['--spec-border' as keyof React.CSSProperties] === 'none'
                            ? '1px solid rgba(145,162,165,0.25)'
                            : 'var(--spec-border)',
                        borderRadius: 'var(--spec-radius)'
                      }}
                    >
                      Secondary
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Real M5 detected components preview */}
            {components.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted">
                    Detected components ({components.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('components')}
                    className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
                  >
                    View all
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {components.slice(0, 3).map((comp, idx) => (
                    <li
                      key={`${comp.name}-${idx}`}
                      className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/50 last:border-b-0"
                    >
                      <span className="text-ink truncate">{comp.name}</span>
                      <span className="font-mono text-[11px] text-muted shrink-0">
                        {comp.borderRadius}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas/50">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-medium text-ink">
              Run AI Visual Interpretation to unlock typography, spacing, and live token previews
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Your measured pixel colour spectrum is ready above. Run Visual AI to infer type
              hierarchy, spacing rhythm, detected components, and live CSS token specimens.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrimaryButton size="sm" onClick={onRunVisualAnalysis}>
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run Visual AI</span>
            </PrimaryButton>
            <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
              <span>Colors</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            </SecondaryButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
};
