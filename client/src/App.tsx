import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { HeaderSessionContext } from './components/layout/Header';
import type { ZoomTargetRequest } from './components/investigation/ScreenshotCanvas';
import { useColorExtraction } from './hooks/useColorExtraction';
import { computeSlotReadiness, useComparisonSlot } from './hooks/useComparisonSlot';
import { useImageUpload } from './hooks/useImageUpload';
import { useInvestigationData } from './hooks/useInvestigationData';
import { useVisualAnalysis } from './hooks/useVisualAnalysis';
import { ColorsPage } from './pages/ColorsPage';
import { ComparePage } from './pages/ComparePage';
import { ComponentsPage } from './pages/ComponentsPage';
import { DesignAnatomyBoardPage } from './pages/DesignAnatomyBoardPage';
import { DesignTokensPage } from './pages/DesignTokensPage';
import { EffectsPage } from './pages/EffectsPage';
import { ExportSuitePage } from './pages/ExportSuitePage';
import { HelpPage } from './pages/HelpPage';
import { LayoutPage } from './pages/LayoutPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { OverviewPage } from './pages/OverviewPage';
import { RecentAnalysesPage } from './pages/RecentAnalysesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SpacingPage } from './pages/SpacingPage';
import { TypographyPage } from './pages/TypographyPage';
import { VisualInvestigationPage } from './pages/VisualInvestigationPage';
import { buildAnatomyBoard } from './services/anatomyBoard/buildAnatomyBoard';
import { normalizeDesignSystem } from './services/designSystem/normalizeDesignSystem';
import type { AnalysisContextSnapshot } from './types/comparison';
import type { DesignSystem } from './types/designSystem';
import type { InvestigationSelection, NormalizedBoundingBox } from './types/investigation';
import type { DesignSystemSectionId, PageId } from './types/navigation';

const DESIGN_SYSTEM_PAGES: ReadonlySet<PageId> = new Set([
  'colors',
  'typography',
  'spacing',
  'components',
  'layout',
  'effects',
  'design-tokens'
]);

const AI_INTERPRETATION_SECTIONS: readonly DesignSystemSectionId[] = [
  'typography',
  'spacing',
  'components',
  'layout',
  'effects',
  'design-tokens'
];

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [investigationSelection, setInvestigationSelection] =
    useState<InvestigationSelection>(null);
  const [pendingInvestigationZoom, setPendingInvestigationZoom] =
    useState<ZoomTargetRequest | null>(null);
  const activePageRef = useRef<PageId>('overview');

  const imageUpload = useImageUpload();
  const colorExtraction = useColorExtraction();
  const visualAnalysis = useVisualAnalysis();
  const investigation = useInvestigationData(imageUpload.image, visualAnalysis);

  // M12: Two isolated comparison slots living purely in memory alongside the main session
  const compareSlotA = useComparisonSlot('design-a', 'Design A');
  const compareSlotB = useComparisonSlot('design-b', 'Design B');
  const [compareSlotASource, setCompareSlotASource] = useState<
    'auto-main' | 'main-session' | 'independent'
  >('auto-main');

  const handleNavigate = useCallback((page: PageId) => {
    activePageRef.current = page;
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const handleInspectInWorkspace = useCallback(
    (selection: InvestigationSelection, targetBox?: NormalizedBoundingBox | null) => {
      setInvestigationSelection(selection);
      if (targetBox) {
        setPendingInvestigationZoom((prev) => ({
          box: targetBox,
          label: selection?.id ?? 'Selection',
          seq: (prev?.seq ?? 0) + 1
        }));
      } else {
        setPendingInvestigationZoom(null);
      }
      handleNavigate('visual-investigation');
    },
    [handleNavigate]
  );

  // Invalidate previous colour extraction and AI visual interpretation results whenever the active screenshot changes or is removed
  const currentPreviewUrl = imageUpload.image?.previewUrl ?? null;
  const resetExtraction = colorExtraction.reset;
  const resetVisualAnalysis = visualAnalysis.reset;

  useEffect(() => {
    resetExtraction();
    resetVisualAnalysis();
    setInvestigationSelection(null);
    setPendingInvestigationZoom(null);
    if (!currentPreviewUrl && DESIGN_SYSTEM_PAGES.has(activePageRef.current)) {
      handleNavigate('new-analysis');
    }
  }, [currentPreviewUrl, resetExtraction, resetVisualAnalysis, handleNavigate]);

  const handleStartExtraction = useCallback(async () => {
    resetVisualAnalysis();
    setInvestigationSelection(null);
    setPendingInvestigationZoom(null);
    const extracted = await colorExtraction.extractFromImage(imageUpload.image);
    // Navigate to Colors only if extraction completed cleanly and the user is still on New Analysis
    if (extracted && activePageRef.current === 'new-analysis') {
      handleNavigate('colors');
    }
  }, [colorExtraction, imageUpload.image, resetVisualAnalysis, handleNavigate]);

  const handleRunVisualAnalysis = useCallback(() => {
    setInvestigationSelection(null);
    setPendingInvestigationZoom(null);
    void visualAnalysis.runAnalysis(imageUpload.image, colorExtraction.result);
  }, [visualAnalysis, imageUpload.image, colorExtraction.result]);

  const handleRunMainFullAnalysis = useCallback(async () => {
    if (!imageUpload.image) return;
    const palette =
      colorExtraction.status === 'completed' && colorExtraction.result
        ? colorExtraction.result
        : await colorExtraction.extractFromImage(imageUpload.image);
    if (!palette || palette.colors.length === 0) return;
    if (visualAnalysis.status === 'completed' && visualAnalysis.result) return;
    await visualAnalysis.runAnalysis(imageUpload.image, palette);
  }, [imageUpload.image, colorExtraction, visualAnalysis]);

  const designSystem = useMemo<DesignSystem | null>(() => {
    if (
      !imageUpload.image ||
      colorExtraction.status !== 'completed' ||
      !colorExtraction.result ||
      colorExtraction.result.colors.length === 0 ||
      visualAnalysis.status !== 'completed' ||
      !visualAnalysis.result
    ) {
      return null;
    }

    try {
      return normalizeDesignSystem({
        sourceImage: {
          name: imageUpload.image.name,
          format: imageUpload.image.format,
          width: imageUpload.image.width,
          height: imageUpload.image.height
        },
        colorResult: colorExtraction.result,
        visualAnalysis: visualAnalysis.result
      });
    } catch (error) {
      console.error('Failed to normalise design system tokens:', error);
      return null;
    }
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result
  ]);

  const unlockedSections = useMemo<ReadonlySet<DesignSystemSectionId>>(() => {
    const set = new Set<DesignSystemSectionId>();
    const hasColors = Boolean(
      imageUpload.image &&
        colorExtraction.status === 'completed' &&
        colorExtraction.result &&
        colorExtraction.result.colors.length > 0
    );

    if (hasColors) {
      set.add('colors');
    }

    if (hasColors && visualAnalysis.status === 'completed' && visualAnalysis.result) {
      for (const section of AI_INTERPRETATION_SECTIONS) {
        if (section === 'design-tokens' && !designSystem) continue;
        set.add(section);
      }
    }

    return set;
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result,
    designSystem
  ]);

  const headerSessionContext = useMemo<HeaderSessionContext | null>(() => {
    if (!imageUpload.image) return null;

    let statusLabel = 'Screenshot uploaded';
    if (colorExtraction.status === 'loading' || colorExtraction.status === 'processing') {
      statusLabel = 'Extracting colours';
    } else if (visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing') {
      statusLabel = 'Analysing visuals';
    } else if (designSystem && visualAnalysis.status === 'completed') {
      statusLabel = `${designSystem.metrics.totalTokens} tokens ready`;
    } else if (colorExtraction.status === 'completed' && colorExtraction.result) {
      statusLabel = `${colorExtraction.result.colors.length} colours measured`;
    }

    return {
      fileName: imageUpload.image.name,
      statusLabel,
      unlockedCount: unlockedSections.size
    };
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    designSystem,
    unlockedSections
  ]);

  // M12: Read-only snapshot of the main session so Design A can adopt it with zero re-analysis
  const mainSessionSnapshot = useMemo<AnalysisContextSnapshot>(() => {
    const hasColors = Boolean(
      imageUpload.image &&
        colorExtraction.status === 'completed' &&
        colorExtraction.result &&
        colorExtraction.result.colors.length > 0
    );
    const hasVisual = Boolean(
      hasColors && visualAnalysis.status === 'completed' && visualAnalysis.result
    );
    const isBusy =
      imageUpload.status === 'validating' ||
      colorExtraction.status === 'loading' ||
      colorExtraction.status === 'processing' ||
      visualAnalysis.status === 'preparing' ||
      visualAnalysis.status === 'analyzing' ||
      investigation.samplingAssets;

    const anatomyBoard = imageUpload.image
      ? buildAnatomyBoard({
          image: imageUpload.image,
          colorResult: hasColors ? colorExtraction.result : null,
          visualAnalysis: hasVisual ? visualAnalysis.result : null,
          designSystem,
          regions: investigation.regions,
          elements: investigation.elements,
          patterns: investigation.patterns,
          assets: investigation.assets
        })
      : null;

    return {
      slotId: 'design-a',
      slotLabel: 'Design A',
      sourceKind: 'main-session',
      image: imageUpload.image,
      colorResult: hasColors ? colorExtraction.result : null,
      visualAnalysis: hasVisual ? visualAnalysis.result : null,
      designSystem,
      regions: investigation.regions,
      elements: investigation.elements,
      patterns: investigation.patterns,
      elementAssets: investigation.assets.elementAssets,
      anatomyBoard,
      readiness: computeSlotReadiness({
        hasImage: Boolean(imageUpload.image),
        hasColors,
        hasVisualAnalysis: hasVisual
      }),
      isBusy
    };
  }, [
    imageUpload.image,
    imageUpload.status,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result,
    designSystem,
    investigation.regions,
    investigation.elements,
    investigation.patterns,
    investigation.assets,
    investigation.samplingAssets
  ]);

  const isSlotALinkedToMain =
    (compareSlotASource === 'auto-main' || compareSlotASource === 'main-session') &&
    Boolean(imageUpload.image);

  const activeCompareDesignA = isSlotALinkedToMain
    ? mainSessionSnapshot
    : compareSlotA.snapshot;

  const handleLinkSlotAToMain = useCallback(() => {
    compareSlotA.clearSlot();
    setCompareSlotASource('main-session');
  }, [compareSlotA]);

  const handleSelectCompareFileA = useCallback(
    async (files: FileList | File[] | null) => {
      setCompareSlotASource('independent');
      await compareSlotA.selectFile(files);
    },
    [compareSlotA]
  );

  const handleClearCompareSlotA = useCallback(() => {
    setCompareSlotASource('independent');
    compareSlotA.clearSlot();
  }, [compareSlotA]);

  const handleClearComparison = useCallback(() => {
    setCompareSlotASource('independent');
    compareSlotA.clearSlot();
    compareSlotB.clearSlot();
  }, [compareSlotA, compareSlotB]);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            unlockedSections={unlockedSections}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'visual-investigation':
        return (
          <VisualInvestigationPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            investigation={investigation}
            selection={investigationSelection}
            pendingZoomBox={pendingInvestigationZoom}
            onSelect={setInvestigationSelection}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'design-anatomy':
        return (
          <DesignAnatomyBoardPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            investigation={investigation}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
            onInspectInWorkspace={handleInspectInWorkspace}
          />
        );
      case 'compare':
        return (
          <ComparePage
            designA={activeCompareDesignA}
            designB={compareSlotB.snapshot}
            slotAController={compareSlotA}
            slotBController={compareSlotB}
            mainSessionAvailable={Boolean(imageUpload.image)}
            mainSessionFileName={imageUpload.image?.name ?? null}
            mainSessionReadiness={mainSessionSnapshot.readiness}
            slotASource={isSlotALinkedToMain ? 'main-session' : 'independent'}
            onLinkSlotAToMain={handleLinkSlotAToMain}
            onSelectFileA={handleSelectCompareFileA}
            onClearSlotA={handleClearCompareSlotA}
            onClearComparison={handleClearComparison}
            onExtractMainColors={handleStartExtraction}
            onRunMainVisualAnalysis={handleRunVisualAnalysis}
            onRunMainFullAnalysis={handleRunMainFullAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'export-suite':
        return (
          <ExportSuitePage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            investigation={investigation}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'new-analysis':
        return (
          <NewAnalysisPage
            onNavigate={handleNavigate}
            upload={imageUpload}
            extraction={colorExtraction}
            onStartExtraction={handleStartExtraction}
          />
        );
      case 'recent-analyses':
        return (
          <RecentAnalysesPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            unlockedSections={unlockedSections}
            onNavigate={handleNavigate}
          />
        );
      case 'colors':
        return (
          <ColorsPage
            image={imageUpload.image}
            result={colorExtraction.result}
            visualAnalysis={visualAnalysis}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'typography':
        return (
          <TypographyPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'spacing':
        return (
          <SpacingPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'components':
        return (
          <ComponentsPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'layout':
        return (
          <LayoutPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'effects':
        return (
          <EffectsPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'design-tokens':
        return (
          <DesignTokensPage
            image={imageUpload.image}
            designSystem={designSystem}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      activePage={activePage}
      onNavigate={handleNavigate}
      unlockedSections={unlockedSections}
      sessionContext={headerSessionContext}
    >
      {renderPage()}
    </AppShell>
  );
};

export default App;
