import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Palette,
  ScanLine,
  ScanSearch,
  Wand2
} from 'lucide-react';
import { RegionInspectorPanel } from '../components/investigation/RegionInspectorPanel';
import { RegionListPanel } from '../components/investigation/RegionListPanel';
import { ScreenshotCanvas } from '../components/investigation/ScreenshotCanvas';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import type { UseColorExtractionResult } from '../hooks/useColorExtraction';
import {
  VISUAL_ANALYSIS_STAGE_LABELS,
  type UseVisualAnalysisResult
} from '../hooks/useVisualAnalysis';
import { validateAndNormalizeRegions } from '../services/investigation/regionSchema';
import { sampleColorsForRegions } from '../services/investigation/sampleRegionColors';
import type {
  RegionMeasuredColor,
  VisualRegion,
  VisualRegionCategory
} from '../types/investigation';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';

export interface VisualInvestigationPageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string | null) => void;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

export const VisualInvestigationPage: React.FC<VisualInvestigationPageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  selectedRegionId,
  onSelectRegion,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | VisualRegionCategory>('all');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [zoomTargetRequest, setZoomTargetRequest] = useState<{
    region: VisualRegion;
    seq: number;
  } | null>(null);
  const [resetViewSeq, setResetViewSeq] = useState<number>(0);

  const [regionColorMap, setRegionColorMap] = useState<Record<string, RegionMeasuredColor[]>>({});
  const [samplingColors, setSamplingColors] = useState<boolean>(false);

  // Deterministically validate & normalize AI-detected regions with Zod
  const validationSummary = useMemo(() => {
    if (visualAnalysis.status !== 'completed' || !visualAnalysis.result) {
      return { regions: [] as VisualRegion[], rejectedCount: 0 };
    }
    return validateAndNormalizeRegions(visualAnalysis.result.interpretation.visualRegions);
  }, [visualAnalysis.status, visualAnalysis.result]);

  const { regions, rejectedCount } = validationSummary;

  // Reset local filter/hover state whenever the active screenshot changes
  useEffect(() => {
    setActiveCategory('all');
    setHoveredRegionId(null);
    setShowAnnotations(true);
    setZoomTargetRequest(null);
    setRegionColorMap({});
  }, [image?.previewUrl]);

  // Sample measured pixel colours locally for each validated region bounding box
  useEffect(() => {
    if (!image || regions.length === 0) {
      setRegionColorMap({});
      setSamplingColors(false);
      return;
    }

    let cancelled = false;
    setSamplingColors(true);

    void sampleColorsForRegions(image.file, regions)
      .then((sampled) => {
        if (!cancelled) {
          setRegionColorMap(sampled);
          setSamplingColors(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegionColorMap({});
          setSamplingColors(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [image, regions]);

  const filteredRegions = useMemo(() => {
    if (activeCategory === 'all') return regions;
    return regions.filter((r) => r.category === activeCategory);
  }, [regions, activeCategory]);

  // Keep selected region valid if category filter hides it
  useEffect(() => {
    if (selectedRegionId && !filteredRegions.some((r) => r.id === selectedRegionId)) {
      onSelectRegion(null);
    }
  }, [filteredRegions, selectedRegionId, onSelectRegion]);

  const selectedRegion = useMemo(
    () => filteredRegions.find((r) => r.id === selectedRegionId) ?? null,
    [filteredRegions, selectedRegionId]
  );

  const handleZoomToRegion = useCallback((region: VisualRegion) => {
    setZoomTargetRequest((prev) => ({
      region,
      seq: (prev?.seq ?? 0) + 1
    }));
  }, []);

  const handleReturnFullScreenshot = useCallback(() => {
    onSelectRegion(null);
    setResetViewSeq((prev) => prev + 1);
  }, [onSelectRegion]);

  // Empty workspace state — no screenshot uploaded
  if (!image) {
    return (
      <PageContainer>
        <PageHeading
          title="Visual Investigation"
          description="Don't just analyse a website. Explore its visual DNA."
        />
        <SectionCard>
          <EmptyState
            icon={ScanSearch}
            title="Upload a screenshot to begin visual investigation"
            description="Inspect your original website screenshot with interactive region overlays, zoom & pan controls, measured region colours, and AI visual design observations."
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

  const hasColors =
    colorExtraction.status === 'completed' &&
    colorExtraction.result !== null &&
    colorExtraction.result.colors.length > 0;
  const isExtractingColors =
    colorExtraction.status === 'loading' || colorExtraction.status === 'processing';
  const isRunningVisualAi =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';
  const hasVisualAi =
    visualAnalysis.status === 'completed' && visualAnalysis.result !== null;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      {/* Page Header */}
      <PageHeading
        title="Visual Investigation"
        description="Don't just analyse a website. Explore its visual DNA."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton size="sm" onClick={() => onNavigate('new-analysis')}>
              <ScanLine className="w-4 h-4 text-muted" aria-hidden="true" />
              <span>Change Screenshot</span>
            </SecondaryButton>

            {!hasColors ? (
              <PrimaryButton
                size="sm"
                onClick={onStartExtraction}
                disabled={isExtractingColors}
              >
                {isExtractingColors ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Palette className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isExtractingColors ? 'Extracting…' : 'Extract Measured Colours'}
                </span>
              </PrimaryButton>
            ) : !hasVisualAi ? (
              <PrimaryButton
                size="sm"
                onClick={onRunVisualAnalysis}
                disabled={isRunningVisualAi}
              >
                {isRunningVisualAi ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isRunningVisualAi
                    ? 'Detecting Regions…'
                    : visualAnalysis.status === 'error'
                      ? 'Retry Visual AI'
                      : 'Run AI Visual Interpretation'}
                </span>
              </PrimaryButton>
            ) : null}
          </div>
        }
      />

      {/* Prerequisite / Live Progress / Error Banner when AI regions aren't ready yet */}
      {!hasVisualAi && (
        <div className="bg-surface border border-border rounded-xl px-5 py-4">
          {isRunningVisualAi && visualAnalysis.stage ? (
            <StatusIndicator
              variant="loading"
              label="Running AI Visual Interpretation & Region Detection"
              detail={VISUAL_ANALYSIS_STAGE_LABELS[visualAnalysis.stage]}
            />
          ) : visualAnalysis.status === 'error' && visualAnalysis.error ? (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <AlertCircle
                  className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-[#FCA5A5]">
                    {visualAnalysis.error.title}
                  </p>
                  <p className="text-xs text-[#FECACA]/85 leading-relaxed break-words">
                    {visualAnalysis.error.message}
                  </p>
                </div>
              </div>
              <PrimaryButton
                size="sm"
                onClick={onRunVisualAnalysis}
                className="shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry</span>
              </PrimaryButton>
            </div>
          ) : !hasColors ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-ink">
                  Screenshot loaded — extract measured colours first
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  You can zoom and pan the unmodified screenshot below. Extract measured colours
                  and run AI Visual Interpretation to detect interactive annotated regions.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-ink">
                  Measured palette ready — run AI Visual Interpretation to annotate regions
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Region detection runs inside the same single Gemini analysis request used for
                  typography, spacing, components, layout, and effects.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Honest limitation banner if Gemini completed but returned 0 valid regions */}
      {hasVisualAi && regions.length === 0 && (
        <div
          role="status"
          className="bg-surface border border-border rounded-xl px-5 py-3.5 flex items-start gap-3 text-xs text-muted"
        >
          <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            The AI model could not verify reliable bounding-box regions for this screenshot
            {rejectedCount > 0
              ? ` (${rejectedCount} malformed candidate box${rejectedCount === 1 ? '' : 'es'} rejected by coordinate validation)`
              : ''}
            . Rather than inventing approximate boxes, DesignDNA displays your unmodified
            screenshot with full zoom and pan inspection.
          </p>
        </div>
      )}

      {/* Three-Pane Visual Investigation Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Center Canvas (First on mobile/tablet for immediate screenshot focus, center on xl desktop) */}
        <div className="order-1 xl:order-2 xl:col-span-6 min-w-0">
          <ScreenshotCanvas
            image={image}
            regions={filteredRegions}
            selectedRegionId={selectedRegionId}
            hoveredRegionId={hoveredRegionId}
            showAnnotations={showAnnotations}
            zoomTargetRequest={zoomTargetRequest}
            resetViewSeq={resetViewSeq}
            onSelectRegion={onSelectRegion}
            onHoverRegion={setHoveredRegionId}
            onToggleAnnotations={() => setShowAnnotations((prev) => !prev)}
            onReturnFullScreenshot={handleReturnFullScreenshot}
          />
        </div>

        {/* Left Pane: Region List & Category Filters */}
        <div className="order-2 xl:order-1 xl:col-span-3 min-w-0">
          <RegionListPanel
            regions={regions}
            filteredRegions={filteredRegions}
            selectedRegionId={selectedRegionId}
            hoveredRegionId={hoveredRegionId}
            activeCategory={activeCategory}
            showAnnotations={showAnnotations}
            rejectedCount={rejectedCount}
            onSelectRegion={onSelectRegion}
            onHoverRegion={setHoveredRegionId}
            onSelectCategory={setActiveCategory}
            onToggleAnnotations={() => setShowAnnotations((prev) => !prev)}
            onZoomToRegion={handleZoomToRegion}
          />
        </div>

        {/* Right Pane: Contextual Inspection Panel */}
        <div className="order-3 xl:order-3 xl:col-span-3 min-w-0">
          <RegionInspectorPanel
            image={image}
            region={selectedRegion}
            regionColors={selectedRegion ? regionColorMap[selectedRegion.id] : undefined}
            samplingColors={samplingColors}
            totalRegions={regions.length}
            aiModel={visualAnalysis.result?.meta.model ?? null}
            onZoomToRegion={handleZoomToRegion}
            onReturnFullScreenshot={handleReturnFullScreenshot}
          />
        </div>
      </div>
    </div>
  );
};
