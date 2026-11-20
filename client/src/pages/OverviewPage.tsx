import React, { useMemo } from 'react';
import {
  ArrowRight,
  Braces,
  History,
  ImageUp,
  Layers,
  Loader2,
  Palette,
  ScanLine,
  ScanSearch,
  SlidersHorizontal,
  Wand2
} from 'lucide-react';
import { DashboardDesignPreview } from '../components/dashboard/DashboardDesignPreview';
import { DashboardHeroContext } from '../components/dashboard/DashboardHeroContext';
import { DashboardSectionNav } from '../components/dashboard/DashboardSectionNav';
import { DashboardTokenOverview } from '../components/dashboard/DashboardTokenOverview';
import { DashboardVisualSummary } from '../components/dashboard/DashboardVisualSummary';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import type { UseColorExtractionResult } from '../hooks/useColorExtraction';
import type { UseVisualAnalysisResult } from '../hooks/useVisualAnalysis';
import { deriveDashboardState } from '../services/dashboard/deriveDashboardState';
import type { DesignSystem } from '../types/designSystem';
import {
  PRODUCT_POSITIONING,
  PRODUCT_TAGLINE,
  type DesignSystemSectionId,
  type PageId
} from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { formatFileSize } from '../utils/imageValidation';

export interface OverviewPageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  designSystem: DesignSystem | null;
  unlockedSections: ReadonlySet<DesignSystemSectionId>;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Upload a screenshot',
    description: 'Provide a crisp PNG, JPG, or WEBP capture of any website or web interface.',
    icon: ImageUp
  },
  {
    number: '02',
    title: 'Extract its design system',
    description:
      'Combine local pixel colour extraction with structured AI interpretation for typography, spacing, components, layout, and effects.',
    icon: Layers
  },
  {
    number: '03',
    title: 'Inspect normalised tokens',
    description:
      'Explore reconciled CSS custom properties and structured JSON tokens with explicit provenance and confidence.',
    icon: SlidersHorizontal
  }
] as const;

export const OverviewPage: React.FC<OverviewPageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  designSystem,
  unlockedSections,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const dashboard = useMemo(
    () =>
      deriveDashboardState({
        image,
        colorExtraction,
        visualAnalysis,
        designSystem,
        unlockedSections
      }),
    [image, colorExtraction, visualAnalysis, designSystem, unlockedSections]
  );

  const isExtractingColors =
    colorExtraction.status === 'loading' || colorExtraction.status === 'processing';
  const isRunningVisualAi =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';

  // Empty workspace state — no screenshot uploaded in the current session
  if (!image) {
    return (
      <PageContainer>
        <section className="space-y-5 pt-2">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent">
              {PRODUCT_POSITIONING}
            </p>
            <h1 className="text-[30px] sm:text-[38px] font-semibold tracking-[-0.03em] text-ink leading-[1.12] text-balance">
              {PRODUCT_TAGLINE}
            </h1>
            <p className="text-[15px] sm:text-base text-muted leading-relaxed">
              Deconstruct website screenshots into measured pixel palettes, AI-interpreted visual
              structure, and reconciled CSS &amp; JSON design tokens.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <PrimaryButton
              onClick={() => onNavigate('new-analysis')}
              className="w-full sm:w-auto"
            >
              <ScanLine className="w-4 h-4" aria-hidden="true" />
              <span>New Analysis</span>
            </PrimaryButton>
            <SecondaryButton
              onClick={() => onNavigate('help')}
              className="w-full sm:w-auto"
            >
              <span>How it works</span>
              <ArrowRight className="w-4 h-4 text-muted" aria-hidden="true" />
            </SecondaryButton>
          </div>
        </section>

        {/* Main Action Area — Visual Intelligence Workspace Intro */}
        <SectionCard bodyClassName="p-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-[0.1em] text-accent">
                  Visual Investigation Engine
                </p>
                <h2 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-ink text-balance">
                  From a single interface capture to a normalised design specification
                </h2>
                <p className="text-sm text-muted leading-relaxed">
                  Upload any website screenshot to separate measured pixel facts from AI-inferred
                  design decisions — inspecting colour proportions, typography hierarchy, spacing
                  rhythm, layout anatomy, and reusable tokens.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>Local pixel colour extraction</span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span>Structured visual AI</span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span>Deterministic token normalisation</span>
                </div>

                <div className="pt-1">
                  <SecondaryButton
                    onClick={() => onNavigate('new-analysis')}
                    className="w-full sm:w-auto"
                  >
                    <span>Open New Analysis</span>
                    <ArrowRight className="w-4 h-4 text-muted" aria-hidden="true" />
                  </SecondaryButton>
                </div>
              </div>
            </div>

            {/* Obsidian & turquoise architectural Visual DNA schematic */}
            <div
              className="lg:col-span-5 bg-canvas border-t lg:border-t-0 lg:border-l border-border p-6 sm:p-8 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="w-full max-w-[310px] space-y-4">
                <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="font-medium text-ink">Interface Capture</span>
                    <span className="font-mono text-faint">PNG · JPG · WEBP</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-1">
                    <div className="col-span-4 h-12 rounded bg-elevated border border-border-strong/70" />
                    <div className="col-span-8 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-ink/75" />
                      <div className="h-2.5 w-full rounded bg-elevated" />
                      <div className="h-2.5 w-2/3 rounded bg-accent/25 border border-accent/40" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-border-strong/70" />
                  <span className="text-[11px] font-mono text-accent">visual DNA</span>
                  <div className="h-px flex-1 bg-border-strong/70" />
                </div>

                <div className="bg-surface border border-accent-border/70 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-ink">Design System Spec</span>
                    <span className="font-mono text-accent">7 sections</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-[#070B0D] border border-border-strong" />
                    <span className="w-5 h-5 rounded bg-[#16D6C5]" />
                    <span className="w-5 h-5 rounded bg-[#00A6B2]" />
                    <span className="w-5 h-5 rounded bg-[#111D21] border border-border-strong" />
                    <span className="w-5 h-5 rounded bg-[#E8F0F0]" />
                    <span className="ml-auto text-[11px] font-mono text-muted">8px grid</span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted">
                    <span>CSS · JSON</span>
                    <span className="text-[#34D399]">Measured + AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Getting Started — 3-step workflow */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
              Getting started
            </h2>
            <span className="text-xs text-muted">Three-step workflow</span>
          </div>

          <div className="bg-surface border border-border rounded-xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {WORKFLOW_STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.number} className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-accent tabular-nums">
                      {step.number}
                    </span>
                    <StepIcon className="w-4 h-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                    <p className="text-[13px] text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Honest Current Session — Empty State */}
        <SectionCard
          title="Recent Analyses"
          description="Current in-memory workspace session."
          action={
            <button
              type="button"
              onClick={() => onNavigate('recent-analyses')}
              className="text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
            >
              View session
            </button>
          }
          bodyClassName="p-4 sm:p-6"
        >
          <EmptyState
            compact
            icon={History}
            title="No analysis in this session"
            description="DesignDNA runs local-first without persistent history or sample data. Upload a screenshot to start an analysis."
            action={
              <SecondaryButton size="sm" onClick={() => onNavigate('new-analysis')}>
                <span>Go to New Analysis</span>
              </SecondaryButton>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  // Active Analysis Dashboard (states: uploaded | colors-only | complete)
  const renderPrimaryAction = () => {
    if (dashboard.stage === 'complete') {
      return (
        <PrimaryButton
          size="sm"
          onClick={() => onNavigate('design-tokens')}
          className="w-full sm:w-auto"
        >
          <Braces className="w-4 h-4" aria-hidden="true" />
          <span>Explore Design Tokens</span>
        </PrimaryButton>
      );
    }

    if (dashboard.stage === 'colors-only') {
      return (
        <PrimaryButton
          size="sm"
          onClick={onRunVisualAnalysis}
          disabled={isRunningVisualAi}
          className="w-full sm:w-auto"
        >
          {isRunningVisualAi ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Wand2 className="w-4 h-4" aria-hidden="true" />
          )}
          <span>
            {isRunningVisualAi
              ? 'Analysing…'
              : visualAnalysis.status === 'error'
                ? 'Retry Visual AI'
                : 'Run AI Visual Interpretation'}
          </span>
        </PrimaryButton>
      );
    }

    return (
      <PrimaryButton
        size="sm"
        onClick={onStartExtraction}
        disabled={isExtractingColors}
        className="w-full sm:w-auto"
      >
        {isExtractingColors ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Palette className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{isExtractingColors ? 'Extracting…' : 'Extract Measured Colours'}</span>
      </PrimaryButton>
    );
  };

  return (
    <PageContainer>
      <PageHeading
        title="Analysis Overview"
        description={`${dashboard.statusLabel} · ${image.name}`}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {dashboard.stage === 'complete' && (
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('visual-investigation')}
                className="w-full sm:w-auto"
              >
                <ScanSearch className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>Visual Investigation</span>
              </SecondaryButton>
            )}
            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('new-analysis')}
              className="w-full sm:w-auto"
            >
              <ScanLine className="w-4 h-4 text-muted" aria-hidden="true" />
              <span>Change Screenshot</span>
            </SecondaryButton>
            {renderPrimaryAction()}
          </div>
        }
      />

      {/* Row 1: Screenshot Context, Pipeline Progress, Core Metrics, Provenance & Confidence */}
      <DashboardHeroContext
        image={image}
        dashboard={dashboard}
        onReplaceScreenshot={() => onNavigate('new-analysis')}
      />

      {/* Row 2: Visual DNA Preview (Proportional Colour Spectrum, Typography Specimen, Spacing Rhythm, Live Token Specimen) */}
      <DashboardDesignPreview
        colorResult={colorExtraction.status === 'completed' ? colorExtraction.result : null}
        visualResult={visualAnalysis.status === 'completed' ? visualAnalysis.result : null}
        designSystem={designSystem}
        onStartExtraction={onStartExtraction}
        onRunVisualAnalysis={onRunVisualAnalysis}
        onNavigate={onNavigate}
      />

      {/* Row 3: Direct Analysis Section Navigation (reusing existing state) */}
      <DashboardSectionNav
        dashboard={dashboard}
        measuredColors={
          colorExtraction.status === 'completed' ? colorExtraction.result?.colors : undefined
        }
        onNavigate={onNavigate}
      />

      {/* Row 3: Visual Analysis Summary (M5 + M4) & Design Token Overview (M6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 min-w-0">
          <DashboardVisualSummary
            colorResult={colorExtraction.status === 'completed' ? colorExtraction.result : null}
            visualAnalysis={visualAnalysis}
            onRunVisualAnalysis={onRunVisualAnalysis}
            onNavigate={onNavigate}
          />
        </div>
        <div className="lg:col-span-6 min-w-0">
          <DashboardTokenOverview
            designSystem={designSystem}
            colorResult={colorExtraction.status === 'completed' ? colorExtraction.result : null}
            dashboard={dashboard}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Row 4: Honest Session Summary linking to Recent Analyses */}
      <SectionCard
        title="Current Session"
        description="Local-first in-memory session record — screenshots and results are never stored persistently."
        action={
          <button
            type="button"
            onClick={() => onNavigate('recent-analyses')}
            className="text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
          >
            Open Recent Analyses
          </button>
        }
        bodyClassName="px-5 py-4 sm:px-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={image.previewUrl}
              alt={`Thumbnail of ${image.name}`}
              className="w-14 h-10 rounded border border-border object-cover bg-canvas shrink-0"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-ink truncate" title={image.name}>
                {image.name}
              </p>
              <p className="text-xs text-muted font-mono tabular-nums">
                {image.width} × {image.height}px · {image.format} · {formatFileSize(image.size)} ·{' '}
                <span className="font-sans text-ink">{dashboard.statusLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-muted tabular-nums">
              {dashboard.unlockedCount} / {dashboard.totalSectionCount} ready
            </span>
            <SecondaryButton size="sm" onClick={() => onNavigate('recent-analyses')}>
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            </SecondaryButton>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
};
