import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Focus,
  Maximize2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  REGION_CATEGORY_SHORT_LABELS,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface ScreenshotCanvasProps {
  image: UploadedImage;
  regions: readonly VisualRegion[];
  selectedRegionId: string | null;
  hoveredRegionId: string | null;
  showAnnotations: boolean;
  zoomTargetRequest: { region: VisualRegion; seq: number } | null;
  resetViewSeq: number;
  onSelectRegion: (regionId: string | null) => void;
  onHoverRegion: (regionId: string | null) => void;
  onToggleAnnotations: () => void;
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
  selectedRegionId,
  hoveredRegionId,
  showAnnotations,
  zoomTargetRequest,
  resetViewSeq,
  onSelectRegion,
  onHoverRegion,
  onToggleAnnotations,
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

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) ?? null;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset zoom/pan whenever the screenshot changes or parent requests reset
  useEffect(() => {
    resetView();
  }, [image.previewUrl, resetViewSeq, resetView]);

  const zoomToRegion = useCallback((region: VisualRegion) => {
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

    const box = region.boundingBox;
    // Choose a comfortable magnification that fills ~68% of the frame along the limiting axis
    const desiredScale = Math.min(0.72 / box.width, 0.72 / box.height);
    const nextZoom = clamp(Math.round(desiredScale * 20) / 20, 1.35, 3.0);

    // Region centre offset from image centre in unscaled pixels
    const centerOffsetX = (box.x + box.width / 2 - 0.5) * baseWidth;
    const centerOffsetY = (box.y + box.height / 2 - 0.5) * baseHeight;

    // With transform: translate(panX, panY) scale(zoom) and transform-origin: center,
    // screen position of (cx, cy) is (panX + cx * zoom, panY + cy * zoom).
    // Setting pan = -centerOffset * nextZoom centres the region accurately.
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
      zoomToRegion(zoomTargetRequest.region);
    }
  }, [zoomTargetRequest, zoomToRegion]);

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
    // Do not hijack button clicks inside the annotation overlay unless dragging
    if (zoom <= 1) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button[data-region-box="true"]')) {
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
    if (!target?.closest('button[data-region-box="true"]')) {
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

        {/* Right: Zoom, Fit, Focus, Reset & Overlay Toggle */}
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
            disabled={!isModifiedView && !selectedRegionId}
            aria-label="Reset zoom and return to full screenshot"
            title="Reset zoom and clear region selection"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-border bg-canvas text-[11px] font-medium text-muted hover:text-ink hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {selectedRegion && (
            <button
              type="button"
              onClick={() => zoomToRegion(selectedRegion)}
              aria-label={`Zoom into selected region ${selectedRegion.name}`}
              title="Zoom into selected region"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-accent-border bg-accent-soft text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <Focus className="w-3 h-3" aria-hidden="true" />
              <span>Focus Region</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAnnotations}
            aria-pressed={showAnnotations}
            aria-label={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            className={[
              'inline-flex items-center gap-1 h-7 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer',
              showAnnotations
                ? 'bg-accent-soft border-accent-border text-accent'
                : 'bg-canvas border-border text-muted hover:text-ink hover:border-border-strong'
            ].join(' ')}
          >
            {showAnnotations ? (
              <Eye className="w-3 h-3" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3 h-3" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {showAnnotations ? 'Annotations' : 'Hidden'}
            </span>
          </button>
        </div>
      </div>

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
          'relative flex-1 min-h-[360px] sm:min-h-[480px] xl:min-h-[600px] bg-canvas overflow-hidden flex items-center justify-center p-4 sm:p-6 select-none',
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
          {/* Tightly fitted aspect-ratio container: Guarantees exact 1:1 coordinate alignment between <img> and overlay layer */}
          <div
            ref={frameRef}
            className="relative inline-block max-w-full rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-border-strong/70 overflow-hidden bg-[#05080A]"
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
              maxHeight: '540px'
            }}
          >
            <img
              src={image.previewUrl}
              alt={`Uploaded website screenshot ${image.name}`}
              draggable={false}
              className="block w-full h-full object-fill select-none pointer-events-none"
            />

            {/* Normalized [0, 1] Interactive Annotation Overlay */}
            {showAnnotations && regions.length > 0 && (
              <div
                className="absolute inset-0"
                role="group"
                aria-label="Annotated visual regions overlay"
              >
                {regions.map((region) => {
                  const isSelected = selectedRegionId === region.id;
                  const isHovered = hoveredRegionId === region.id;
                  const hasActiveSelection = Boolean(selectedRegionId);
                  const isApproximate = region.boundaryPrecision === 'approximate';
                  const { x, y, width, height } = region.boundingBox;

                  // Place floating label inside bottom if region touches very top edge
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
                        'absolute rounded-[4px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
                        isApproximate ? 'border-dashed' : 'border-solid',
                        isSelected
                          ? 'z-30 border-[1.5px] border-accent bg-accent/[0.13] shadow-[0_0_0_1px_rgba(22,214,197,0.7),0_0_24px_rgba(22,214,197,0.22)]'
                          : isHovered
                            ? 'z-20 border-[1.5px] border-accent bg-accent/[0.1] shadow-[0_0_14px_rgba(22,214,197,0.16)]'
                            : hasActiveSelection
                              ? 'z-10 border border-accent/40 bg-accent/[0.02] opacity-60 hover:opacity-100'
                              : 'z-10 border border-accent/65 bg-accent/[0.05] hover:bg-accent/[0.1]'
                      ].join(' ')}
                    >
                      {(isSelected || isHovered) && (
                        <span
                          className={[
                            'pointer-events-none absolute left-0 max-w-[220px] truncate px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold leading-tight shadow-md whitespace-nowrap',
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
          </div>
        </div>
      </div>

      {/* Bottom Status Strip */}
      <div className="px-4 py-2 border-t border-border bg-sidebar/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span className="truncate" title={image.name}>
          {selectedRegion ? (
            <>
              Selected:{' '}
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
          ) : (
            <span>
              Original unmodified screenshot ·{' '}
              {regions.length > 0
                ? 'Click any highlighted region to inspect its visual DNA'
                : 'Use zoom and pan controls to inspect visual details'}
            </span>
          )}
        </span>
        <span className="font-mono text-faint shrink-0">
          {showAnnotations ? `${regions.length} active overlays` : 'Overlays hidden'}
        </span>
      </div>
    </section>
  );
};
