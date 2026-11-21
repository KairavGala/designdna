import React from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Info, Wand2 } from 'lucide-react';
import type {
  AnatomyColorSection,
  AnatomyColorSwatch,
  AnatomyTypographySection
} from '../../types/anatomyBoard';
import {
  BoardSectionHeader,
  ProvenanceInline,
  SectionUnavailableNotice
} from './AnatomyShared';

export interface AnatomyColourSectionProps {
  colour: AnatomyColorSection;
  copiedHex: string | null;
  onCopyHex: (hex: string) => void;
  onStartExtraction?: () => void;
}

const SwatchTile: React.FC<{
  swatch: AnatomyColorSwatch;
  large?: boolean;
  copiedHex: string | null;
  onCopyHex: (hex: string) => void;
}> = ({ swatch, large = false, copiedHex, onCopyHex }) => {
  const isCopied = copiedHex === swatch.hex;
  return (
    <button
      type="button"
      data-anatomy-swatch={swatch.hex}
      onClick={() => onCopyHex(swatch.hex)}
      aria-label={`Copy colour ${swatch.label} ${swatch.hex}`}
      className="group text-left rounded-xl border border-border bg-canvas/80 hover:border-accent-border overflow-hidden transition-all duration-150 flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div
        className={[
          'w-full relative border-b border-border transition-transform duration-200',
          large ? 'h-28 sm:h-32' : 'h-20'
        ].join(' ')}
        style={{ backgroundColor: swatch.hex }}
      >
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#070B0D]/80 text-[#F0F6F7] text-[10px] font-mono opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-[#34D399]" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </span>
      </div>

      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-ink truncate" title={swatch.label}>
              {swatch.label}
            </span>
            {swatch.coveragePercentage !== null && (
              <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
                {swatch.coveragePercentage.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-accent">{swatch.hex}</span>
            {swatch.cssVariable && (
              <span
                className="font-mono text-[10px] text-faint truncate max-w-[140px]"
                title={swatch.cssVariable}
              >
                {swatch.cssVariable}
              </span>
            )}
          </div>
        </div>

        <ProvenanceInline provenance={swatch.provenance} confidence={swatch.confidence} />
      </div>
    </button>
  );
};

export const AnatomyColourSectionView: React.FC<AnatomyColourSectionProps> = ({
  colour,
  copiedHex,
  onCopyHex,
  onStartExtraction
}) => {
  const roleGroups: Array<{
    title: string;
    items: AnatomyColorSwatch[];
    large?: boolean;
  }> = [
    {
      title: colour.hasSemanticRoles ? 'Dominant & Brand Identity' : 'Dominant Measured Swatches',
      items: colour.roleSwatches.dominant,
      large: true
    },
    {
      title: 'Accent & Highlight Roles',
      items: colour.roleSwatches.accent,
      large: true
    },
    {
      title: 'Background & Surface Layers',
      items: colour.roleSwatches.backgroundAndSurface
    },
    {
      title: 'Typography & Border Tones',
      items: colour.roleSwatches.textAndBorder
    }
  ].filter((g) => g.items.length > 0);

  return (
    <section
      id="anatomy-colour"
      aria-label="Colour Identity"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="02"
        title="Colour Identity"
        subtitle="Measured pixel coverage from the screenshot combined with reconciled semantic palette roles. Click any swatch to copy its HEX value."
        provenanceLabel={
          colour.hasSemanticRoles ? 'Measured + AI-Inferred' : 'Measured Pixels'
        }
        provenanceKind={colour.hasSemanticRoles ? 'derived' : 'measured'}
      />

      {!colour.available ? (
        <SectionUnavailableNotice
          title="No colour palette extracted yet"
          description="Run measured pixel colour extraction on the uploaded screenshot to populate dominant swatches, pixel coverage ratios, and semantic roles."
          action={
            onStartExtraction && (
              <button
                type="button"
                onClick={onStartExtraction}
                className="px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Extract Colours
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Proportional Measured Spectrum Strip */}
          {colour.measuredSpectrum.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">Measured Pixel Spectrum</span>
                <span className="font-mono text-[11px] text-muted tabular-nums">
                  {colour.totalMeasuredColors} measured colours · click any band to copy
                </span>
              </div>

              <div className="h-10 w-full rounded-lg overflow-hidden border border-border-strong flex">
                {colour.measuredSpectrum.map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => onCopyHex(sw.hex)}
                    title={`${sw.hex} (${sw.coveragePercentage?.toFixed(1) ?? '0'}% measured coverage) — click to copy`}
                    aria-label={`Copy measured colour ${sw.hex} (${sw.coveragePercentage?.toFixed(1) ?? '0'} percent coverage)`}
                    className="h-full relative group transition-opacity hover:opacity-90 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                    style={{
                      backgroundColor: sw.hex,
                      flexGrow: Math.max(sw.coveragePercentage ?? 2, 3)
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-muted tabular-nums">
                {colour.measuredSpectrum.map((sw) => (
                  <button
                    key={`${sw.id}-legend`}
                    type="button"
                    onClick={() => onCopyHex(sw.hex)}
                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-[2px] border border-border-strong shrink-0"
                      style={{ backgroundColor: sw.hex }}
                      aria-hidden="true"
                    />
                    <span>{sw.hex}</span>
                    {sw.coveragePercentage !== null && (
                      <span className="text-faint">{sw.coveragePercentage.toFixed(1)}%</span>
                    )}
                    {copiedHex === sw.hex && (
                      <Check className="w-3 h-3 text-[#34D399]" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Curated Editorial Swatch Groups */}
          <div className="space-y-6">
            {roleGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-xs font-semibold text-muted">{group.title}</h3>
                <div
                  className={
                    group.large
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5'
                  }
                >
                  {group.items.map((swatch) => (
                    <SwatchTile
                      key={swatch.id}
                      swatch={swatch}
                      large={group.large}
                      copiedHex={copiedHex}
                      onCopyHex={onCopyHex}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export interface AnatomyTypographySectionProps {
  typography: AnatomyTypographySection;
  expandedSpecimenIds: ReadonlySet<string>;
  onToggleSpecimen: (id: string) => void;
  onRunVisualAnalysis?: () => void;
  canRunVisualAi: boolean;
}

export const AnatomyTypographySectionView: React.FC<AnatomyTypographySectionProps> = ({
  typography,
  expandedSpecimenIds,
  onToggleSpecimen,
  onRunVisualAnalysis,
  canRunVisualAi
}) => {
  return (
    <section
      id="anatomy-typography"
      aria-label="Typography Identity"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="03"
        title="Typography Identity"
        subtitle="Visually inferred typographic pairing, weight progression, line-height rhythm, and expandable live scale specimens."
        provenanceLabel="AI-Inferred"
        provenanceKind="ai-inferred"
        confidence={typography.confidence}
      />

      {!typography.available ? (
        <SectionUnavailableNotice
          title="Typography interpretation not yet available"
          description="Run AI Visual Interpretation to estimate heading and body font classifications, typographic scale steps, and hierarchy specimens."
          action={
            canRunVisualAi &&
            onRunVisualAnalysis && (
              <button
                type="button"
                onClick={onRunVisualAnalysis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Visual AI</span>
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Pairing Overview Strip (Editorial 2-column split) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 rounded-xl border border-border bg-canvas/80 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] text-faint">Heading Typography</p>
                <p className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-ink leading-none pt-1">
                  Aa Bb
                </p>
                <p className="text-sm font-medium text-ink pt-2">
                  {typography.headingFontStyle}
                </p>
              </div>
              <p className="text-[11px] text-muted">
                Visually inferred style · font file not verified
              </p>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-border bg-canvas/80 p-5 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-faint">Body Typography</p>
                  <p className="text-sm font-medium text-ink leading-snug">
                    {typography.bodyFontStyle}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-faint">Monospace Presence</p>
                  <p className="text-sm font-medium text-ink">
                    {typography.monospaceDetected
                      ? 'Detected in data or labels'
                      : 'Not prominently detected'}
                  </p>
                </div>
              </div>

              {typography.scaleSummary && (
                <div className="pt-3 border-t border-border space-y-1">
                  <p className="text-[11px] text-faint">Scale &amp; Hierarchy Summary</p>
                  <p className="text-xs text-muted leading-relaxed">
                    {typography.scaleSummary}
                  </p>
                </div>
              )}

              {typography.fontFamilyTokens.length > 0 && (
                <div className="pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-muted">
                  {typography.fontFamilyTokens.map((tok) => (
                    <span key={tok.cssVariable}>
                      <span className="text-accent">{tok.cssVariable}</span>: {tok.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expandable Typographic Specimens */}
          {typography.specimens.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-muted">
                  Interactive Type Scale Specimens
                </h3>
                <span className="text-[11px] text-faint">
                  Click any specimen to expand full details
                </span>
              </div>

              <div className="divide-y divide-border rounded-xl border border-border bg-canvas/70 overflow-hidden">
                {typography.specimens.map((specimen) => {
                  const expanded = expandedSpecimenIds.has(specimen.id);
                  return (
                    <div key={specimen.id} data-typography-specimen={specimen.id}>
                      <button
                        type="button"
                        onClick={() => onToggleSpecimen(specimen.id)}
                        aria-expanded={expanded}
                        className="w-full px-4 sm:px-5 py-4 text-left hover:bg-elevated/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                              <span className="font-semibold text-ink">{specimen.level}</span>
                              <span className="text-border-strong" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono tabular-nums">
                                {specimen.estimatedSize}
                              </span>
                              <span className="text-border-strong" aria-hidden="true">
                                ·
                              </span>
                              <span>{specimen.estimatedWeight}</span>
                              <span className="text-border-strong" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono tabular-nums">
                                LH {specimen.lineHeight}
                              </span>
                            </div>

                            <p
                              className="text-ink truncate"
                              style={{
                                fontSize: `${specimen.cssSizePx}px`,
                                fontWeight: specimen.cssWeight,
                                lineHeight: specimen.cssLineHeight
                              }}
                            >
                              {specimen.sampleText}
                            </p>
                          </div>

                          <span className="mt-1 text-muted shrink-0">
                            {expanded ? (
                              <ChevronUp className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            )}
                          </span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="px-4 sm:px-5 pb-5 pt-2 bg-surface/60 border-t border-border/70 space-y-4">
                          <div className="space-y-2">
                            <p
                              className="text-ink break-words"
                              style={{
                                fontSize: `${specimen.cssSizePx}px`,
                                fontWeight: specimen.cssWeight,
                                lineHeight: specimen.cssLineHeight
                              }}
                            >
                              {specimen.sampleText}
                            </p>
                            <p className="font-mono text-xs text-muted tracking-wider">
                              ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-border">
                            <div>
                              <p className="text-[11px] text-faint">Observed Usage</p>
                              <p className="text-ink/95 mt-0.5 leading-relaxed">{specimen.usage}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-faint">Estimated Metrics</p>
                              <p className="font-mono text-ink/95 mt-0.5 tabular-nums">
                                {specimen.estimatedSize} / {specimen.estimatedWeight} / LH{' '}
                                {specimen.lineHeight}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-faint">Provenance &amp; Token</p>
                              <div className="mt-0.5 space-y-0.5">
                                <ProvenanceInline
                                  provenance={specimen.provenance}
                                  confidence={specimen.confidence}
                                />
                                {specimen.cssVariable && (
                                  <p className="font-mono text-[11px] text-accent">
                                    {specimen.cssVariable}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grounded font honesty disclosure */}
          <div className="flex items-start gap-2 text-[11px] text-faint leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Typography classifications, sizes, weights, and line heights are visually inferred
              from screenshot rendering. Original webfont files and computed CSS stylesheets were
              not inspected.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
