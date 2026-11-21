import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  LayoutDashboard,
  Loader2,
  Palette,
  ScanLine,
  ScanSearch,
  Wand2
} from 'lucide-react';
import { ElementInspectorPanel } from '../components/investigation/ElementInspectorPanel';
import { PatternMotifExplorer } from '../components/investigation/PatternMotifExplorer';
import { RegionInspectorPanel } from '../components/investigation/RegionInspectorPanel';
import { RegionListPanel } from '../components/investigation/RegionListPanel';
import {
  ScreenshotCanvas,
  type ZoomTargetRequest
} from '../components/investigation/ScreenshotCanvas';
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
import {
  isComponentElement,
  type ExplorerTabId,
  type InvestigationSelection,
  type NormalizedBoundingBox,
  type OverlayVisibility,
  type VisualRegion,
  type VisualRegionCategory
} from '../types/investigation';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';

export interface VisualInvestigationPageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  investigation: UseInvestigationDataResult;
  selection: InvestigationSelection;
  pendingZoomBox?: ZoomTargetRequest | null;
  onSelect: (selection: InvestigationSelection) => void;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = {
  regions: true,
  patternsAndMotifs: true,
  components: true
};

export const VisualInvestigationPage: React.FC<VisualInvestigationPageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  investigation,
  selection,
  pendingZoomBox,
  onSelect,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | VisualRegionCategory>('all');
  const [explorerTab, setExplorerTab] = useState<ExplorerTabId>('all');
  const [overlayVisibility, setOverlayVisibility] = useState<OverlayVisibility>(
    DEFAULT_OVERLAY_VISIBILITY
  );
  const [zoomTargetRequest, setZoomTargetRequest] = useState<ZoomTargetRequest | null>(null);
  const [resetViewSeq, setResetViewSeq] = useState<number>(0);

  const {
    regions,
    rejectedRegionCount: rejectedCount,
    elements,
    patterns,
    assets,
    samplingAssets
  } = investigation;

  // Reset local filter/hover/overlay state whenever the active screenshot changes
  useEffect(() => {
    setActiveCategory('all');
    setExplorerTab('all');
    setHoveredRegionId(null);
    setHoveredElementId(null);
    setOverlayVisibility(DEFAULT_OVERLAY_VISIBILITY);
    setZoomTargetRequest(null);
  }, [image?.previewUrl]);

  // Honor external focus/zoom requests (e.g. clicking a motif, component, or region on the Design Anatomy Board)
  useEffect(() => {
    if (!pendingZoomBox) return;
    setActiveCategory('all');
    setOverlayVisibility(DEFAULT_OVERLAY_VISIBILITY);
    setZoomTargetRequest(pendingZoomBox);
  }, [pendingZoomBox]);

  const filteredRegions = useMemo(() => {
    if (activeCategory === 'all') return regions;
    return regions.filter((r) => r.category === activeCategory);
  }, [regions, activeCategory]);

  // Keep selected region/element/pattern valid if data or region filters change
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === 'region') {
      if (!filteredRegions.some((r) => r.id === selection.id)) {
        onSelect(null);
      }
    } else if (selection.kind === 'element') {
      if (!elements.some((e) => e.id === selection.id)) {
        onSelect(null);
      }
    } else if (selection.kind === 'pattern') {
      if (!patterns.some((p) => p.id === selection.id)) {
        onSelect(null);
      }
    }
  }, [filteredRegions, elements, patterns, selection, onSelect]);

  const selectedRegionId = selection?.kind === 'region' ? selection.id : null;
  const selectedRegion = useMemo(
    () => (selectedRegionId ? filteredRegions.find((r) => r.id === selectedRegionId) ?? null : null),
    [filteredRegions, selectedRegionId]
  );

  const selectedElement = useMemo(
    () =>
      selection?.kind === 'element'
        ? elements.find((e) => e.id === selection.id) ?? null
        : null,
    [elements, selection]
  );

  const selectedPattern = useMemo(
    () =>
      selection?.kind === 'pattern'
        ? patterns.find((p) => p.id === selection.id) ?? null
        : null,
    [patterns, selection]
  );

  const selectedRegionChildElements = useMemo(() => {
    if (!selectedRegion) return [];
    return elements.filter(
      (el) =>
        el.parentRegionId === selectedRegion.id ||
        el.relatedRegionIds.includes(selectedRegion.id)
    );
  }, [selectedRegion, elements]);

  const handleSelectRegion = useCallback(
    (regionId: string | null) => {
      onSelect(regionId ? { kind: 'region', id: regionId } : null);
    },
    [onSelect]
  );

  const handleSelectElement = useCallback(
    (elementId: string) => {
      onSelect({ kind: 'element', id: elementId });
    },
    [onSelect]
  );

  const handleSelectPattern = useCallback(
    (patternId: string) => {
      onSelect({ kind: 'pattern', id: patternId });
    },
    [onSelect]
  );

  const handleToggleOverlayLayer = useCallback((layer: keyof OverlayVisibility) => {
    setOverlayVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleZoomToBox = useCallback((box: NormalizedBoundingBox, label: string) => {
    setZoomTargetRequest((prev) => ({
      box,
      label,
      seq: (prev?.seq ?? 0) + 1
    }));
  }, []);

  const handleZoomToRegion = useCallback(
    (region: VisualRegion) => {
      handleZoomToBox(region.boundingBox, region.name);
    },
    [handleZoomToBox]
  );

  const handleLocateFromExplorer = useCallback(
    (box: NormalizedBoundingBox, label: string, nextSelection: InvestigationSelection) => {
      onSelect(nextSelection);

      // Ensure the matching overlay layer is visible so the user sees the highlight immediately
      if (nextSelection?.kind === 'element') {
        const target = elements.find((e) => e.id === nextSelection.id);
        if (target) {
          const layer: keyof OverlayVisibility = isComponentElement(target)
            ? 'components'
            : 'patternsAndMotifs';
          setOverlayVisibility((prev) => (prev[layer] ? prev : { ...prev, [layer]: true }));
        }
      } else if (nextSelection?.kind === 'pattern') {
        setOverlayVisibility((prev) => ({
          ...prev,
          patternsAndMotifs: true,
          components: true
        }));
      }

      handleZoomToBox(box, label);
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [onSelect, elements, handleZoomToBox]
  );

  const handleReturnFullScreenshot = useCallback(() => {
    onSelect(null);
    setResetViewSeq((prev) => prev + 1);
  }, [onSelect]);

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
            description="Inspect your original website screenshot with interactive region, motif, and component overlays, zoom & pan controls, cropped visual previews, and measured pixel colours."
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

  const showingElementOrPatternInspector = Boolean(selectedElement || selectedPattern);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <PageHeading
        title="Visual Investigation"
        description="Don't just analyse a website. Explore its visual DNA."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('design-anatomy')}
              className="whitespace-nowrap"
            >
              <LayoutDashboard className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Design Anatomy Board</span>
            </SecondaryButton>

            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('new-analysis')}
              className="whitespace-nowrap"
            >
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
                    ? 'Analysing Visual DNA…'
                    : visualAnalysis.status === 'error'
                      ? 'Retry Visual AI'
                      : 'Run AI Visual Interpretation'}
                </span>
              </PrimaryButton>
            ) : null}
          </div>
        }
      />

      {/* Prerequisite / Live Progress / Error Banner when AI analysis isn't ready yet */}
      {!hasVisualAi && (
        <div className="bg-surface border border-border rounded-xl px-5 py-4">
          {isRunningVisualAi && visualAnalysis.stage ? (
            <StatusIndicator
              variant="loading"
              label="Running AI Visual Interpretation, Regions & Pattern Discovery"
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
                  and run AI Visual Interpretation to detect regions, patterns, motifs, and
                  component styles.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-ink">
                  Measured palette ready — run AI Visual Interpretation to explore visual DNA
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Region detection and visual motif discovery run inside the same single Gemini
                  analysis request used for typography, spacing, components, layout, and effects.
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
      <div ref={workspaceRef} className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Center Canvas (First on mobile/tablet for immediate screenshot focus, center on xl desktop) */}
        <div className="order-1 xl:order-2 xl:col-span-6 min-w-0">
          <ScreenshotCanvas
            image={image}
            regions={filteredRegions}
            elements={elements}
            patterns={patterns}
            selection={selection}
            hoveredRegionId={hoveredRegionId}
            hoveredElementId={hoveredElementId}
            overlayVisibility={overlayVisibility}
            zoomTargetRequest={zoomTargetRequest}
            resetViewSeq={resetViewSeq}
            onSelectRegion={handleSelectRegion}
            onSelectElement={handleSelectElement}
            onHoverRegion={setHoveredRegionId}
            onHoverElement={setHoveredElementId}
            onToggleOverlayLayer={handleToggleOverlayLayer}
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
            showAnnotations={overlayVisibility.regions}
            rejectedCount={rejectedCount}
            onSelectRegion={handleSelectRegion}
            onHoverRegion={setHoveredRegionId}
            onSelectCategory={setActiveCategory}
            onToggleAnnotations={() => handleToggleOverlayLayer('regions')}
            onZoomToRegion={handleZoomToRegion}
          />
        </div>

        {/* Right Pane: Contextual Inspection Panel (Region vs Element/Pattern) */}
        <div className="order-3 xl:order-3 xl:col-span-3 min-w-0">
          {showingElementOrPatternInspector ? (
            <ElementInspectorPanel
              image={image}
              element={selectedElement}
              pattern={selectedPattern}
              allElements={elements}
              allRegions={regions}
              allPatterns={patterns}
              elementAssetsMap={assets.elementAssets}
              samplingAssets={samplingAssets}
              onSelectRegion={(regionId) => {
                setActiveCategory('all');
                handleSelectRegion(regionId);
              }}
              onSelectElement={handleSelectElement}
              onSelectPattern={handleSelectPattern}
              onZoomToBox={handleZoomToBox}
              onReturnFullScreenshot={handleReturnFullScreenshot}
            />
          ) : (
            <RegionInspectorPanel
              image={image}
              region={selectedRegion}
              regionColors={selectedRegion ? assets.regionColors[selectedRegion.id] : undefined}
              childElements={selectedRegionChildElements}
              samplingColors={samplingAssets}
              totalRegions={regions.length}
              aiModel={visualAnalysis.result?.meta.model ?? null}
              onZoomToRegion={handleZoomToRegion}
              onSelectElement={handleSelectElement}
              onReturnFullScreenshot={handleReturnFullScreenshot}
            />
          )}
        </div>
      </div>

      {/* M9 Pattern, Motif & Component Explorer */}
      {hasVisualAi && (
        <PatternMotifExplorer
          elements={elements}
          patterns={patterns}
          regions={regions}
          elementAssetsMap={assets.elementAssets}
          samplingAssets={samplingAssets}
          activeTab={explorerTab}
          selection={selection}
          hoveredElementId={hoveredElementId}
          onSelectTab={setExplorerTab}
          onSelectElement={handleSelectElement}
          onSelectPattern={handleSelectPattern}
          onSelectRegion={(regionId) => {
            setActiveCategory('all');
            handleSelectRegion(regionId);
            workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onHoverElement={setHoveredElementId}
          onLocateOnCanvas={handleLocateFromExplorer}
        />
      )}
    </div>
  );
};

