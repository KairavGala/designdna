import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  Focus,
  Info,
  LayoutDashboard,
  Loader2,
  Palette,
  RotateCcw,
  ScanLine,
  ScanSearch,
  Wand2
} from 'lucide-react';
import {
  AnatomyColourSectionView,
  AnatomyTypographySectionView
} from '../components/anatomy/AnatomyColourTypographySections';
import {
  AnatomyEffectsSectionView,
  AnatomyLayoutSectionView
} from '../components/anatomy/AnatomyLayoutEffectsSections';
import {
  AnatomyComponentsSectionView,
  AnatomyPatternsSectionView
} from '../components/anatomy/AnatomyPatternsComponentsSections';
import {
  BoardSectionHeader,
  CONFIDENCE_TEXT_STYLE,
  copyToClipboard,
  ProvenanceInline,
  SectionUnavailableNotice
} from '../components/anatomy/AnatomyShared';
import { CropLightboxModal } from '../components/anatomy/CropLightboxModal';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import type { UseColorExtractionResult } from '../hooks/useColorExtraction';
import type { UseInvestigationDataResult } from '../hooks/useInvestigationData';
import {
  VISUAL_ANALYSIS_STAGE_LABELS,
  type UseVisualAnalysisResult
} from '../hooks/useVisualAnalysis';
import { buildAnatomyBoard } from '../services/anatomyBoard/buildAnatomyBoard';
import {
  ANATOMY_BOARD_SECTIONS,
  type AnatomySectionId,
  type CropLightboxTarget
} from '../types/anatomyBoard';
import type { DesignSystem } from '../types/designSystem';
import type { InvestigationSelection, NormalizedBoundingBox } from '../types/investigation';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { formatFileSize } from '../utils/imageValidation';

export interface DesignAnatomyBoardPageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  designSystem: DesignSystem | null;
  investigation: UseInvestigationDataResult;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
}

export const DesignAnatomyBoardPage: React.FC<DesignAnatomyBoardPageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  designSystem,
  investigation,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate,
  onInspectInWorkspace
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [expandedSpecimenIds, setExpandedSpecimenIds] = useState<Set<string>>(() => new Set());
  const [lightboxTarget, setLightboxTarget] = useState<CropLightboxTarget | null>(null);
  const [activeNavId, setActiveNavId] = useState<AnatomySectionId>('identity');
  const [boardNotice, setBoardNotice] = useState<string | null>(null);

  const board = useMemo(
    () =>
      buildAnatomyBoard({
        image,
        colorResult: colorExtraction.status === 'completed' ? colorExtraction.result : null,
        visualAnalysis: visualAnalysis.status === 'completed' ? visualAnalysis.result : null,
        designSystem,
        regions: investigation.regions,
        elements: investigation.elements,
        patterns: investigation.patterns,
        assets: investigation.assets
      }),
    [
      image,
      colorExtraction.status,
      colorExtraction.result,
      visualAnalysis.status,
      visualAnalysis.result,
      designSystem,
      investigation.regions,
      investigation.elements,
      investigation.patterns,
      investigation.assets
    ]
  );

  // Clear local interactive board state whenever the active screenshot changes or is removed
  useEffect(() => {
    setCopiedHex(null);
    setExpandedSpecimenIds(new Set());
    setLightboxTarget(null);
    setActiveNavId('identity');
    setBoardNotice(null);
  }, [image?.previewUrl]);

  // Clear copy feedback after a short interval
  useEffect(() => {
    if (!copiedHex) return;
    const timer = window.setTimeout(() => setCopiedHex(null), 2200);
    return () => window.clearTimeout(timer);
  }, [copiedHex]);

  // Clear reset confirmation message after a short interval
  useEffect(() => {
    if (!boardNotice) return;
    const timer = window.setTimeout(() => setBoardNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [boardNotice]);

  const handleCopyHex = useCallback((hex: string) => {
    void copyToClipboard(hex).then(() => {
      setCopiedHex(hex);
    });
  }, []);

  const handleToggleSpecimen = useCallback((id: string) => {
    setExpandedSpecimenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleScrollToSection = useCallback((sectionId: AnatomySectionId) => {
    setActiveNavId(sectionId);
    const el = document.getElementById(`anatomy-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleResetBoard = useCallback(() => {
    setExpandedSpecimenIds(new Set());
    setLightboxTarget(null);
    setCopiedHex(null);
    setActiveNavId('identity');
    setBoardNotice('Board view reset');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Empty workspace state — no screenshot uploaded
  if (!image) {
    return (
      <PageContainer>
        <PageHeading
          title="Design Anatomy Board"
          description="See the complete visual DNA of any website in one place."
        />
        <SectionCard>
          <EmptyState
            icon={LayoutDashboard}
            title="Upload a screenshot to compose its Design Anatomy Board"
            description="DesignDNA brings together measured colour palettes, inferred typography specimens, cropped patterns and motifs, component geometry, spatial layout blueprints, and surface effects in one consolidated visual identity dossier."
            action={
              <PrimaryButton onClick={() => onNavigate('new-analysis')}>
                <ScanLine className="w-4 h-4" aria-hidden="true" />
                <span>New Analysis</span>
              </PrimaryButton>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const hasColors = board.completeness.hasMeasuredColors;
  const hasVisualAi = board.completeness.hasVisualAi;
  const isExtractingColors =
    colorExtraction.status === 'loading' || colorExtraction.status === 'processing';
  const isRunningVisualAi =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';

  const sectionAvailability: Record<AnatomySectionId, boolean> = {
    identity: board.identity.available,
    colour: board.colour.available,
    typography: board.typography.available,
    patterns: board.patterns.available,
    components: board.components.available,
    layout: board.layout.available,
    effects: board.effects.available
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Live region for copy & board reset announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {copiedHex ? `Copied ${copiedHex} to clipboard` : boardNotice ?? ''}
      </div>

      {/* Editorial Board Masthead & Original Screenshot Reference */}
      <section
        aria-label="Design Anatomy Board Overview"
        className="bg-surface border border-border rounded-xl overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Editorial Identity Masthead & Controls */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent">
                Design Anatomy Board · Visual Identity Dossier
              </p>
              <h1 className="text-2xl sm:text-[30px] font-semibold tracking-[-0.03em] text-ink leading-[1.15] text-balance">
                See the complete visual DNA of any website in one place.
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
                Consolidated visual investigation board unifying measured pixel swatches,
                AI-interpreted design identity, cropped motifs and components, spatial region
                proportions, and surface craft — grounded directly in the uploaded screenshot.
              </p>

              {/* Quiet Editorial Session Summary Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted font-mono tabular-nums">
                <span className="text-ink font-semibold">
                  {board.completeness.populatedSections}/{board.completeness.totalSections} sections
                  populated
                </span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>{board.colour.totalMeasuredColors} measured colours</span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>{investigation.regions.length} regions</span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>{investigation.elements.length} visual elements</span>
                {visualAnalysis.result?.meta.model && (
                  <>
                    <span className="text-border-strong" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-faint">{visualAnalysis.result.meta.model}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              {!hasColors ? (
                <PrimaryButton
                  size="sm"
                  onClick={onStartExtraction}
                  disabled={isExtractingColors}
                  className="whitespace-nowrap"
                >
                  {isExtractingColors ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Palette className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{isExtractingColors ? 'Extracting…' : 'Extract Measured Colours'}</span>
                </PrimaryButton>
              ) : !hasVisualAi ? (
                <PrimaryButton
                  size="sm"
                  onClick={onRunVisualAnalysis}
                  disabled={isRunningVisualAi}
                  className="whitespace-nowrap"
                >
                  {isRunningVisualAi ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Wand2 className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {isRunningVisualAi
                      ? 'Analysing Visual DNA…'
                      : visualAnalysis.status === 'error'
                        ? 'Retry Visual AI'
                        : 'Run AI Visual Interpretation'}
                  </span>
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  size="sm"
                  onClick={() => onNavigate('visual-investigation')}
                  className="whitespace-nowrap"
                >
                  <ScanSearch className="w-4 h-4" aria-hidden="true" />
                  <span>Open Visual Investigation</span>
                </PrimaryButton>
              )}

              {(!hasColors || !hasVisualAi) && (
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('visual-investigation')}
                  className="whitespace-nowrap"
                >
                  <ScanSearch className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>Visual Investigation</span>
                </SecondaryButton>
              )}

              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('export-suite')}
                className="whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>Export Suite</span>
              </SecondaryButton>

              <SecondaryButton
                size="sm"
                onClick={handleResetBoard}
                className="whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Reset Board</span>
              </SecondaryButton>

              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('overview')}
                className="whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Overview</span>
              </SecondaryButton>

              {copiedHex && (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-[#34D399] ml-auto">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copied {copiedHex}</span>
                </span>
              )}
              {!copiedHex && boardNotice && (
                <span className="text-xs text-muted ml-auto">{boardNotice}</span>
              )}
            </div>
          </div>

          {/* Right: Original Unmodified Screenshot Context */}
          <div className="lg:col-span-5 bg-canvas border-t lg:border-t-0 lg:border-l border-border p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-ink truncate" title={image.name}>
                {image.name}
              </span>
              <span className="font-mono text-faint tabular-nums shrink-0">
                {image.width} × {image.height}px · {image.format} · {formatFileSize(image.size)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('visual-investigation')}
              aria-label={`Open ${image.name} in Visual Investigation`}
              className="group relative rounded-lg border border-border hover:border-accent-border bg-[#060A0C] overflow-hidden flex items-center justify-center min-h-[180px] max-h-[250px] transition-colors cursor-pointer"
            >
              <img
                src={image.previewUrl}
                alt={`Unmodified original screenshot of ${image.name}`}
                className="max-h-[246px] w-auto max-w-full object-contain"
              />
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#070B0D]/85 border border-border text-[11px] font-medium text-ink group-hover:border-accent-border transition-colors">
                <ScanSearch className="w-3 h-3 text-accent" aria-hidden="true" />
                <span>Inspect Canvas</span>
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
              <span>Unmodified source capture</span>
              <button
                type="button"
                onClick={() => onNavigate('new-analysis')}
                className="text-muted hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
              >
                Replace screenshot
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Visual AI Progress or Error Notice */}
      {isRunningVisualAi && visualAnalysis.stage && (
        <div className="bg-surface border border-border rounded-xl px-5 py-4">
          <StatusIndicator
            variant="loading"
            label="Running AI Visual Interpretation for Design Anatomy"
            detail={VISUAL_ANALYSIS_STAGE_LABELS[visualAnalysis.stage]}
          />
        </div>
      )}

      {visualAnalysis.status === 'error' && visualAnalysis.error && (
        <div
          role="alert"
          className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle
              className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold text-[#FCA5A5]">{visualAnalysis.error.title}</p>
              <p className="text-xs text-[#FECACA]/85 leading-relaxed break-words">
                {visualAnalysis.error.message}
              </p>
            </div>
          </div>
          <PrimaryButton size="sm" onClick={onRunVisualAnalysis} className="shrink-0">
            <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </PrimaryButton>
        </div>
      )}

      {/* Board Section Navigation Rail (in-flow on mobile to keep sticky chrome minimal, sticky on sm+) */}
      <nav
        aria-label="Design Anatomy Board sections"
        className="sm:sticky sm:top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-1.5 bg-canvas/95 backdrop-blur-sm border-y sm:border border-border sm:rounded-xl"
      >
        <div className="flex items-center gap-1 overflow-x-auto px-1.5 py-0.5">
          {ANATOMY_BOARD_SECTIONS.map((sec) => {
            const isAvailable = sectionAvailability[sec.id];
            const isActive = activeNavId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleScrollToSection(sec.id)}
                aria-current={isActive ? 'location' : undefined}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-accent-soft text-ink font-medium border border-accent-border'
                    : isAvailable
                      ? 'text-muted hover:text-ink hover:bg-elevated/60 border border-transparent'
                      : 'text-faint hover:text-muted border border-transparent'
                ].join(' ')}
              >
                <span className="font-mono text-[10px] text-accent tabular-nums">{sec.index}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 01. VISUAL IDENTITY */}
      <section
        id="anatomy-identity"
        aria-label="Visual Identity"
        className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
      >
        <BoardSectionHeader
          index="01"
          title="Visual Identity"
          subtitle="Overall aesthetic direction, evidence-backed design style classifications, visual personality, and the defining traits that make this interface recognisable."
          provenanceLabel={
            board.identity.available ? 'AI-Inferred + Derived' : 'Awaiting Visual AI'
          }
          provenanceKind="ai-inferred"
          confidence={board.identity.overallConfidence}
        />

        {!board.identity.available ? (
          <SectionUnavailableNotice
            title="Visual identity synthesis awaits AI interpretation"
            description={
              hasColors
                ? 'Measured colours are already available below. Run AI Visual Interpretation to synthesise visual style classifications, aesthetic personality, and distinctive visual signatures.'
                : 'Extract measured colours and run AI Visual Interpretation to generate the Visual Identity section.'
            }
            action={
              hasColors ? (
                <button
                  type="button"
                  onClick={onRunVisualAnalysis}
                  disabled={isRunningVisualAi}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isRunningVisualAi ? 'Analysing…' : 'Run Visual AI'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartExtraction}
                  disabled={isExtractingColors}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Extract Colours</span>
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Editorial Lead Statement + Interface Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent">
                  Overall Visual Aesthetic
                </p>
                <p className="text-lg sm:text-[22px] font-medium text-ink tracking-[-0.02em] leading-snug">
                  {board.identity.overallAesthetic}
                </p>
                {board.identity.recognisabilitySummary && (
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {board.identity.recognisabilitySummary}
                  </p>
                )}
              </div>

              <dl className="lg:col-span-5 rounded-xl border border-border bg-canvas/80 p-4 sm:p-5 space-y-3.5 text-xs">
                {board.identity.visualPersonality && (
                  <div className="space-y-1">
                    <dt className="text-[11px] text-faint">Visual Personality</dt>
                    <dd className="text-ink font-medium leading-relaxed">
                      {board.identity.visualPersonality}
                    </dd>
                  </div>
                )}
                <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[11px] text-faint">Interface Archetype</dt>
                    <dd className="text-ink font-medium mt-0.5">
                      {board.identity.interfaceType ?? 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-faint">Theme Polarity</dt>
                    <dd className="text-ink font-medium capitalize mt-0.5">
                      {board.identity.themeMode ?? 'Not specified'}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Evidence-Backed Style Classifications (Editorial Hairline Cards, Not Pill Soup) */}
            {board.identity.styleClassifications.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold text-muted">
                    Evidence-Backed Style Classification
                  </h3>
                  <span className="text-[11px] text-faint">
                    Assigned only when supported by screenshot findings
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {board.identity.styleClassifications.map((tag) => (
                    <div
                      key={tag.label}
                      data-anatomy-style-tag={tag.label}
                      className="rounded-xl border border-border bg-canvas/80 p-4 space-y-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-ink tracking-[-0.01em]">
                          {tag.label}
                        </span>
                        <span
                          className={`text-[11px] font-medium capitalize ${CONFIDENCE_TEXT_STYLE[tag.confidence]}`}
                        >
                          {tag.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{tag.rationale}</p>
                      <ProvenanceInline provenance={tag.provenance} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant Design Characteristics + Clickable Distinctive Elements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-border">
              {board.identity.dominantCharacteristics.length > 0 && (
                <div
                  className={
                    board.identity.distinctiveElements.length > 0
                      ? 'lg:col-span-7 space-y-3'
                      : 'lg:col-span-12 space-y-3'
                  }
                >
                  <h3 className="text-xs font-semibold text-muted">
                    Dominant Design Characteristics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {board.identity.dominantCharacteristics.map((char, idx) => (
                      <div
                        key={`${char.label}-${idx}`}
                        className="rounded-xl border border-border bg-canvas/70 p-3.5 space-y-1.5"
                      >
                        <p className="text-[11px] font-medium text-accent">{char.label}</p>
                        <p className="text-xs text-ink/95 leading-relaxed">{char.detail}</p>
                        <ProvenanceInline
                          provenance={char.provenance}
                          confidence={char.confidence}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {board.identity.distinctiveElements.length > 0 && (
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xs font-semibold text-muted">
                      Distinctive Visual Elements
                    </h3>
                    <span className="text-[11px] text-faint">Click to inspect on canvas</span>
                  </div>
                  <div className="divide-y divide-border rounded-xl border border-border bg-canvas/70">
                    {board.identity.distinctiveElements.map((item, idx) => (
                      <button
                        key={`${item.title}-${idx}`}
                        type="button"
                        onClick={() => onInspectInWorkspace(item.selection, item.targetBox)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-elevated/60 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                          <p className="text-[11px] text-muted truncate">{item.subtitle}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium shrink-0">
                          <Focus className="w-3 h-3" aria-hidden="true" />
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 02. COLOUR IDENTITY */}
      <AnatomyColourSectionView
        colour={board.colour}
        copiedHex={copiedHex}
        onCopyHex={handleCopyHex}
        onStartExtraction={onStartExtraction}
      />

      {/* 03. TYPOGRAPHY IDENTITY */}
      <AnatomyTypographySectionView
        typography={board.typography}
        expandedSpecimenIds={expandedSpecimenIds}
        onToggleSpecimen={handleToggleSpecimen}
        onRunVisualAnalysis={onRunVisualAnalysis}
        canRunVisualAi={hasColors && !isRunningVisualAi}
      />

      {/* 04. PATTERNS & MOTIFS */}
      <AnatomyPatternsSectionView
        patterns={board.patterns}
        allElements={investigation.elements}
        regions={investigation.regions}
        elementAssets={investigation.assets.elementAssets}
        image={image}
        samplingAssets={investigation.samplingAssets}
        onExpandCrop={setLightboxTarget}
        onInspectInWorkspace={onInspectInWorkspace}
        onRunVisualAnalysis={onRunVisualAnalysis}
        canRunVisualAi={hasColors && !hasVisualAi && !isRunningVisualAi}
      />

      {/* 05. COMPONENTS & SHAPES */}
      <AnatomyComponentsSectionView
        components={board.components}
        elementAssets={investigation.assets.elementAssets}
        image={image}
        samplingAssets={investigation.samplingAssets}
        onExpandCrop={setLightboxTarget}
        onInspectInWorkspace={onInspectInWorkspace}
        onRunVisualAnalysis={onRunVisualAnalysis}
        canRunVisualAi={hasColors && !hasVisualAi && !isRunningVisualAi}
      />

      {/* 06. LAYOUT & COMPOSITION */}
      <AnatomyLayoutSectionView
        layout={board.layout}
        image={image}
        onInspectInWorkspace={onInspectInWorkspace}
        onRunVisualAnalysis={onRunVisualAnalysis}
        canRunVisualAi={hasColors && !hasVisualAi && !isRunningVisualAi}
      />

      {/* 07. EFFECTS & SURFACE LANGUAGE */}
      <AnatomyEffectsSectionView
        effects={board.effects}
        elementAssets={investigation.assets.elementAssets}
        image={image}
        onExpandCrop={setLightboxTarget}
        onInspectInWorkspace={onInspectInWorkspace}
        onRunVisualAnalysis={onRunVisualAnalysis}
        canRunVisualAi={hasColors && !hasVisualAi && !isRunningVisualAi}
      />

      {/* Evidence & Methodological Honesty Footer */}
      <footer className="rounded-xl border border-border bg-surface/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-faint">
        <div className="flex items-start gap-2.5 max-w-3xl leading-relaxed">
          <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-muted font-medium">Measured</strong> values are sampled
            directly from uploaded screenshot pixels.{' '}
            <strong className="text-muted font-medium">AI-Inferred</strong> findings and{' '}
            <strong className="text-muted font-medium">Derived</strong> reconciliations come from
            visual interpretation of the screenshot alone — DesignDNA never accesses live website
            HTML, CSS stylesheets, DOM trees, or webfont files.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SecondaryButton size="sm" onClick={handleResetBoard} className="whitespace-nowrap">
            <RotateCcw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>Reset Board</span>
          </SecondaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => onNavigate('overview')}
            className="whitespace-nowrap"
          >
            <span>Return to Overview</span>
          </SecondaryButton>
        </div>
      </footer>

      {/* Expandable Screenshot Crop Lightbox */}
      <CropLightboxModal
        target={lightboxTarget}
        copiedHex={copiedHex}
        onCopyHex={handleCopyHex}
        onClose={() => setLightboxTarget(null)}
        onInspectInWorkspace={onInspectInWorkspace}
      />
    </div>
  );
};
