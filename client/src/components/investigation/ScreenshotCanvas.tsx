import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Focus,
  Maximize2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  isComponentElement,
  REGION_CATEGORY_SHORT_LABELS,
  type InvestigationSelection,
  type NormalizedBoundingBox,
  type OverlayVisibility,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface ZoomTargetRequest {
  box: NormalizedBoundingBox;
  label: string;
  seq: number;
}

export interface ScreenshotCanvasProps {
  image: UploadedImage;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  selection: InvestigationSelection;
  hoveredRegionId: string | null;
  hoveredElementId: string | null;
  overlayVisibility: OverlayVisibility;
  zoomTargetRequest: ZoomTargetRequest | null;
  resetViewSeq: number;
  onSelectRegion: (regionId: string | null) => void;
  onSelectElement: (elementId: string) => void;
  onHoverRegion: (regionId: string | null) => void;
  onHoverElement: (elementId: string | null) => void;
  onToggleOverlayLayer: (layer: keyof OverlayVisibility) => void;
  onReturnFullScreenshot: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const ScreenshotCanvas: React.FC<ScreenshotCanvasProps> = ({
  image,
  regions,
  elements,
  patterns,
  selection,
  hoveredRegionId,
  hoveredElementId,
  overlayVisibility,
  zoomTargetRequest,
  resetViewSeq,
  onSelectRegion,
  onSelectElement,
  onHoverRegion,
  onHoverElement,
  onToggleOverlayLayer,
  onReturnFullScreenshot
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false
  });

  const selectedRegionId = selection?.kind === 'region' ? selection.id : null;
  const selectedElementId = selection?.kind === 'element' ? selection.id : null;
  const selectedPatternId = selection?.kind === 'pattern' ? selection.id : null;

  const selectedRegion = useMemo(
    () => (selectedRegionId ? regions.find((r) => r.id === selectedRegionId) ?? null : null),
    [regions, selectedRegionId]
  );

  const selectedElement = useMemo(
    () => (selectedElementId ? elements.find((e) => e.id === selectedElementId) ?? null : null),
    [elements, selectedElementId]
  );

  const selectedPattern = useMemo(
    () => (selectedPatternId ? patterns.find((p) => p.id === selectedPatternId) ?? null : null),
    [patterns, selectedPatternId]
  );

  const activePatternElementIds = useMemo(() => {
    if (!selectedPattern) return new Set<string>();
    return new Set(selectedPattern.elementIds);
  }, [selectedPattern]);

  const motifElements = useMemo(
    () => elements.filter((el) => !isComponentElement(el)),
    [elements]
  );

  const componentElements = useMemo(
    () => elements.filter((el) => isComponentElement(el)),
    [elements]
  );

  const visibleElements = useMemo(
    () =>
      elements.filter((el) =>
        isComponentElement(el)
          ? overlayVisibility.components
          : overlayVisibility.patternsAndMotifs
      ),
    [elements, overlayVisibility.components, overlayVisibility.patternsAndMotifs]
  );

  const activeFocusTarget = useMemo<{ box: NormalizedBoundingBox; label: string } | null>(() => {
    if (selectedRegion) {
      return { box: selectedRegion.boundingBox, label: selectedRegion.name };
    }
    if (selectedElement) {
      return { box: selectedElement.boundingBox, label: selectedElement.name };
    }
    if (selectedPattern) {
      const firstMember = elements.find((e) => selectedPattern.elementIds.includes(e.id));
      if (firstMember) {
        return { box: firstMember.boundingBox, label: selectedPattern.name };
      }
    }
    return null;
  }, [selectedRegion, selectedElement, selectedPattern, elements]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset zoom/pan whenever the screenshot changes or parent requests reset
  useEffect(() => {
    resetView();
  }, [image.previewUrl, resetViewSeq, resetView]);

  const zoomToBox = useCallback((box: NormalizedBoundingBox) => {
    const frameEl = frameRef.current;
    const viewportEl = viewportRef.current;
    if (!frameEl || !viewportEl) {
      setZoom(1.8);
      setPan({ x: 0, y: 0 });
      return;
    }

    const baseWidth = frameEl.offsetWidth;
    const baseHeight = frameEl.offsetHeight;
    if (baseWidth <= 0 || baseHeight <= 0) {
      setZoom(1.8);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Choose a comfortable magnification that fills ~70% of the frame along the limiting axis
    const desiredScale = Math.min(0.7 / Math.max(box.width, 0.04), 0.7 / Math.max(box.height, 0.04));
    const nextZoom = clamp(Math.round(desiredScale * 20) / 20, 1.35, 3.25);

    const centerOffsetX = (box.x + box.width / 2 - 0.5) * baseWidth;
    const centerOffsetY = (box.y + box.height / 2 - 0.5) * baseHeight;

    const maxPanX = (baseWidth * nextZoom) / 2;
    const maxPanY = (baseHeight * nextZoom) / 2;

    setZoom(nextZoom);
    setPan({
      x: clamp(-centerOffsetX * nextZoom, -maxPanX, maxPanX),
      y: clamp(-centerOffsetY * nextZoom, -maxPanY, maxPanY)
    });
  }, []);

  useEffect(() => {
    if (zoomTargetRequest) {
      zoomToBox(zoomTargetRequest.box);
    }
  }, [zoomTargetRequest, zoomToBox]);

  const handleZoomIn = () => {
    setZoom((prev) => clamp(Math.round((prev + ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = clamp(Math.round((prev - ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM);
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest('button[data-region-box="true"]') ||
      target?.closest('button[data-element-box="true"]')
    ) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false
    };
    setIsPanning(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }

    const frameEl = frameRef.current;
    const limitX = frameEl ? (frameEl.offsetWidth * zoom) / 2 : 600;
    const limitY = frameEl ? (frameEl.offsetHeight * zoom) / 2 : 600;

    setPan({
      x: clamp(dragRef.current.originX + dx, -limitX, limitX),
      y: clamp(dragRef.current.originY + dy, -limitY, limitY)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safe no-op if pointer capture already released
    }
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (
      !target?.closest('button[data-region-box="true"]') &&
      !target?.closest('button[data-element-box="true"]')
    ) {
      onSelectRegion(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom((prev) => {
      const next = clamp(Math.round((prev + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const zoomPercent = Math.round(zoom * 100);
  const isModifiedView = zoom !== 1 || pan.x !== 0 || pan.y !== 0;
  const hasAnySelection = selection !== null;

  const activeRegionCount = overlayVisibility.regions ? regions.length : 0;
  const activeElementCount = visibleElements.length;

  return (
    <section
      aria-label="Interactive screenshot investigation canvas"
      className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden min-w-0"
    >
      {/* Top Canvas Toolbar */}
      <div className="px-3.5 py-2.5 border-b border-border bg-sidebar/80 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Screenshot dimensions & pan cue */}
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <span className="font-mono text-ink tabular-nums whitespace-nowrap">
            {image.width} × {image.height}px
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-muted whitespace-nowrap">{image.format}</span>
          {zoom > 1 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-accent pl-1">
              <Move className="w-3 h-3" aria-hidden="true" />
              <span>Drag to pan</span>
            </span>
          )}
        </div>

        {/* Right: Zoom, Fit, Focus & Reset */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="inline-flex items-center rounded-lg border border-border bg-canvas overflow-hidden"
            role="group"
            aria-label="Zoom controls"
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
              className="w-8 h-7 flex items-center justify-center text-muted hover:text-ink hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span
              className="px-2 text-[11px] font-mono text-ink tabular-nums border-x border-border min-w-[48px] text-center"
              aria-live="polite"
            >
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
              className="w-8 h-7 flex items-center justify-center text-muted hover:text-ink hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={resetView}
            aria-label="Fit to screen"
            title="Fit to screen (100%)"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-border bg-canvas text-[11px] font-medium text-muted hover:text-ink hover:border-border-strong transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetView();
              onReturnFullScreenshot();
            }}
            disabled={!isModifiedView && !hasAnySelection}
            aria-label="Reset zoom and return to full screenshot"
            title="Reset zoom and clear selection"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-border bg-canvas text-[11px] font-medium text-muted hover:text-ink hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {activeFocusTarget && (
            <button
              type="button"
              onClick={() => zoomToBox(activeFocusTarget.box)}
              aria-label={`Zoom into ${activeFocusTarget.label}`}
              title={`Zoom into ${activeFocusTarget.label}`}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-accent-border bg-accent-soft text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Focus className="w-3 h-3" aria-hidden="true" />
              <span>Focus</span>
            </button>
          )}
        </div>
      </div>

      {/* Independent Overlay Layer Controls */}
      {(regions.length > 0 || elements.length > 0) && (
        <div
          className="px-3.5 py-2 border-b border-border bg-canvas/60 flex flex-wrap items-center justify-between gap-2"
          role="group"
          aria-label="Annotation overlay layer visibility"
        >
          <span className="text-[11px] font-medium text-faint">Overlay Layers</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleOverlayLayer('regions')}
              aria-pressed={overlayVisibility.regions}
              aria-label="Toggle region annotations"
              className={[
                'inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                overlayVisibility.regions
                  ? 'border-accent-border bg-accent-soft text-accent'
                  : 'border-border bg-surface text-muted hover:text-ink hover:border-border-strong'
              ].join(' ')}
            >
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  overlayVisibility.regions ? 'bg-accent' : 'bg-faint'
                ].join(' ')}
                aria-hidden="true"
              />
              <span>Regions</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                {regions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleOverlayLayer('patternsAndMotifs')}
              aria-pressed={overlayVisibility.patternsAndMotifs}
              aria-label="Toggle pattern and motif annotations"
              className={[
                'inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                overlayVisibility.patternsAndMotifs
                  ? 'border-[#F59E0B]/45 bg-[#F59E0B]/12 text-[#FBBF24]'
                  : 'border-border bg-surface text-muted hover:text-ink hover:border-border-strong'
              ].join(' ')}
            >
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  overlayVisibility.patternsAndMotifs ? 'bg-[#F59E0B]' : 'bg-faint'
                ].join(' ')}
                aria-hidden="true"
              />
              <span>Motifs &amp; Surfaces</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                {motifElements.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleOverlayLayer('components')}
              aria-pressed={overlayVisibility.components}
              aria-label="Toggle component annotations"
              className={[
                'inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                overlayVisibility.components
                  ? 'border-[#38BDF8]/45 bg-[#38BDF8]/12 text-[#7DD3FC]'
                  : 'border-border bg-surface text-muted hover:text-ink hover:border-border-strong'
              ].join(' ')}
            >
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  overlayVisibility.components ? 'bg-[#38BDF8]' : 'bg-faint'
                ].join(' ')}
                aria-hidden="true"
              />
              <span>Components</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                {componentElements.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Screenshot Stage */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        className={[
          'relative flex-1 min-h-[360px] sm:min-h-[480px] xl:min-h-[560px] bg-canvas overflow-hidden flex items-center justify-center p-4 sm:p-6 select-none',
          zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        ].join(' ')}
        style={{
          backgroundImage:
            'radial-gradient(rgba(145, 162, 165, 0.12) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Transform Stage */}
        <div
          className={[
            'flex items-center justify-center max-w-full max-h-full',
            isPanning ? '' : 'transition-transform duration-200 ease-out'
          ].join(' ')}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Tightly fitted aspect-ratio container: Guarantees exact 1:1 coordinate alignment */}
          <div
            ref={frameRef}
            className="relative inline-block max-w-full rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-border-strong/70 overflow-hidden bg-[#05080A]"
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
              maxHeight: '520px'
            }}
          >
            <img
              src={image.previewUrl}
              alt={`Uploaded website screenshot ${image.name}`}
              draggable={false}
              className="block w-full h-full object-fill select-none pointer-events-none"
            />

            {/* Layer 1: M8 Visual Regions Overlay (Turquoise) */}
            {overlayVisibility.regions && regions.length > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                role="group"
                aria-label="Annotated visual regions overlay"
              >
                {regions.map((region) => {
                  const isSelected = selectedRegionId === region.id;
                  const isHovered = hoveredRegionId === region.id;
                  const isApproximate = region.boundaryPrecision === 'approximate';
                  const { x, y, width, height } = region.boundingBox;
                  const labelInside = y < 0.06;

                  return (
                    <button
                      key={region.id}
                      type="button"
                      data-region-box="true"
                      data-region-id={region.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRegion(region.id);
                      }}
                      onMouseEnter={() => onHoverRegion(region.id)}
                      onMouseLeave={() => onHoverRegion(null)}
                      onFocus={() => onHoverRegion(region.id)}
                      onBlur={() => onHoverRegion(null)}
                      aria-pressed={isSelected}
                      aria-label={`Inspect region: ${region.name} (${REGION_CATEGORY_SHORT_LABELS[region.category]})`}
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${width * 100}%`,
                        height: `${height * 100}%`
                      }}
                      className={[
                        'pointer-events-auto absolute rounded-[4px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
                        isApproximate ? 'border-dashed' : 'border-solid',
                        isSelected
                          ? 'z-30 border-[1.5px] border-accent bg-accent/[0.13] shadow-[0_0_0_1px_rgba(22,214,197,0.7),0_0_24px_rgba(22,214,197,0.22)]'
                          : isHovered
                            ? 'z-20 border-[1.5px] border-accent bg-accent/[0.1] shadow-[0_0_14px_rgba(22,214,197,0.16)]'
                            : hasAnySelection
                              ? 'z-10 border border-accent/35 bg-accent/[0.015] opacity-45 hover:opacity-100'
                              : 'z-10 border border-accent/60 bg-accent/[0.04] hover:bg-accent/[0.09]'
                      ].join(' ')}
                    >
                      {(isSelected || isHovered) && (
                        <span
                          className={[
                            'pointer-events-none absolute max-w-[220px] truncate px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold leading-tight shadow-md whitespace-nowrap',
                            labelInside ? 'top-1 left-1' : '-top-5 left-0',
                            isSelected
                              ? 'bg-accent text-[#051315]'
                              : 'bg-[#070B0D]/95 text-accent border border-accent-border'
                          ].join(' ')}
                        >
                          {region.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Layer 2 & 3: M9 Motifs/Surfaces (Amber Dashed) & Component Styles (Sky Solid) */}
            {visibleElements.length > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                role="group"
                aria-label="Detected visual motifs and component overlays"
              >
                {visibleElements.map((element) => {
                  const isComp = isComponentElement(element);
                  const isDirectlySelected = selectedElementId === element.id;
                  const isPatternMember = activePatternElementIds.has(element.id);
                  const isActive = isDirectlySelected || isPatternMember;
                  const isHovered = hoveredElementId === element.id;

                  // Show additional repeated locations when this element or its pattern is active/hovered
                  const boxesToRender: NormalizedBoundingBox[] =
                    isActive || isHovered
                      ? [element.boundingBox, ...element.additionalLocations]
                      : [element.boundingBox];

                  const showOccurrenceIndex =
                    (isActive || isHovered) && element.additionalLocations.length > 0;

                  const layerName = isComp ? 'components' : 'patterns-motifs';

                  return (
                    <React.Fragment key={element.id}>
                      {boxesToRender.map((box, boxIndex) => {
                        const labelInside = box.y < 0.06;
                        const isPrimaryBox = boxIndex === 0;

                        const activeClasses = isComp
                          ? 'z-40 border-[1.5px] border-[#38BDF8] bg-[#38BDF8]/[0.15] shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_20px_rgba(56,189,248,0.2)]'
                          : 'z-40 border-[1.5px] border-[#F59E0B] bg-[#F59E0B]/[0.15] shadow-[0_0_0_1px_rgba(245,158,11,0.65),0_0_20px_rgba(245,158,11,0.2)]';

                        const hoverClasses = isComp
                          ? 'z-30 border-[1.5px] border-[#38BDF8] bg-[#38BDF8]/[0.11]'
                          : 'z-30 border-[1.5px] border-[#F59E0B] bg-[#F59E0B]/[0.11]';

                        const idleClasses = hasAnySelection
                          ? isComp
                            ? 'z-20 border border-[#38BDF8]/35 bg-[#38BDF8]/[0.015] opacity-40 hover:opacity-100'
                            : 'z-20 border border-[#F59E0B]/35 bg-[#F59E0B]/[0.015] opacity-40 hover:opacity-100'
                          : isComp
                            ? 'z-20 border border-[#38BDF8]/65 bg-[#38BDF8]/[0.04] hover:bg-[#38BDF8]/[0.1]'
                            : 'z-20 border border-[#F59E0B]/65 bg-[#F59E0B]/[0.04] hover:bg-[#F59E0B]/[0.1]';

                        return (
                          <button
                            key={`${element.id}-loc-${boxIndex}`}
                            type="button"
                            data-element-box="true"
                            data-element-id={element.id}
                            data-overlay-layer={layerName}
                            data-occurrence-index={boxIndex + 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectElement(element.id);
                            }}
                            onMouseEnter={() => onHoverElement(element.id)}
                            onMouseLeave={() => onHoverElement(null)}
                            onFocus={() => onHoverElement(element.id)}
                            onBlur={() => onHoverElement(null)}
                            aria-pressed={isActive}
                            aria-label={`Inspect ${ELEMENT_CATEGORY_SHORT_LABELS[element.category]}: ${element.name}${showOccurrenceIndex ? ` occurrence ${boxIndex + 1}` : ''}`}
                            style={{
                              left: `${box.x * 100}%`,
                              top: `${box.y * 100}%`,
                              width: `${box.width * 100}%`,
                              height: `${box.height * 100}%`
                            }}
                            className={[
                              'pointer-events-auto absolute rounded-[3px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
                              isComp ? 'border-solid' : 'border-dashed',
                              isActive ? activeClasses : isHovered ? hoverClasses : idleClasses
                            ].join(' ')}
                          >
                            {(isActive || isHovered) && (
                              <span
                                className={[
                                  'pointer-events-none absolute max-w-[200px] truncate px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold leading-tight shadow-md whitespace-nowrap',
                                  labelInside ? 'top-1 left-1' : '-top-5 left-0',
                                  isActive
                                    ? isComp
                                      ? 'bg-[#38BDF8] text-[#051315]'
                                      : 'bg-[#F59E0B] text-[#051315]'
                                    : isComp
                                      ? 'bg-[#070B0D]/95 text-[#7DD3FC] border border-[#38BDF8]/50'
                                      : 'bg-[#070B0D]/95 text-[#FBBF24] border border-[#F59E0B]/50'
                                ].join(' ')}
                              >
                                {isPrimaryBox
                                  ? showOccurrenceIndex
                                    ? `${element.name} #1`
                                    : element.name
                                  : `#${boxIndex + 1}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Strip */}
      <div className="px-4 py-2 border-t border-border bg-sidebar/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span className="truncate" title={image.name}>
          {selectedRegion ? (
            <>
              Region:{' '}
              <span className="text-ink font-medium">{selectedRegion.name}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-muted tabular-nums">
                ({Math.round(selectedRegion.boundingBox.x * 100)}%,{' '}
                {Math.round(selectedRegion.boundingBox.y * 100)}% ·{' '}
                {Math.round(selectedRegion.boundingBox.width * 100)}% ×{' '}
                {Math.round(selectedRegion.boundingBox.height * 100)}%)
              </span>
            </>
          ) : selectedElement ? (
            <>
              Element:{' '}
              <span className="text-ink font-medium">{selectedElement.name}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-muted tabular-nums">
                {selectedElement.repetitionStatus === 'recurring'
                  ? `${selectedElement.occurrenceCount} occurrences highlighted`
                  : 'Individual element'}
              </span>
            </>
          ) : selectedPattern ? (
            <>
              Pattern:{' '}
              <span className="text-ink font-medium">{selectedPattern.name}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-[#FBBF24] tabular-nums">
                {selectedPattern.occurrenceCount} verified occurrences
              </span>
            </>
          ) : (
            <span>
              Original unmodified screenshot ·{' '}
              {regions.length > 0 || elements.length > 0
                ? 'Click any region, motif, or component to inspect its visual DNA'
                : 'Use zoom and pan controls to inspect visual details'}
            </span>
          )}
        </span>
        <span className="font-mono text-faint shrink-0 tabular-nums">
          {activeRegionCount + activeElementCount > 0
            ? `${activeRegionCount} region${activeRegionCount === 1 ? '' : 's'} · ${activeElementCount} element${activeElementCount === 1 ? '' : 's'}`
            : 'Overlays hidden'}
        </span>
      </div>
    </section>
  );
};

