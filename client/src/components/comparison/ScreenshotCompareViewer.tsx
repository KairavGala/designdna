import React, { useCallback, useRef, useState } from 'react';
import { Link2, Maximize2, Unlink2, ZoomIn, ZoomOut } from 'lucide-react';
import type { AnalysisContextSnapshot, ScreenshotGeometryComparison } from '../../types/comparison';

export interface ScreenshotCompareViewerProps {
  designA: AnalysisContextSnapshot;
  designB: AnalysisContextSnapshot;
  geometry: ScreenshotGeometryComparison;
}

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

export const ScreenshotCompareViewer: React.FC<ScreenshotCompareViewerProps> = ({
  designA,
  designB,
  geometry
}) => {
  const [fitMode, setFitMode] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [syncScroll, setSyncScroll] = useState<boolean>(true);

  const paneARef = useRef<HTMLDivElement | null>(null);
  const paneBRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef<'a' | 'b' | null>(null);

  const handleScroll = useCallback(
    (source: 'a' | 'b') => {
      if (!syncScroll) return;
      if (isSyncingRef.current && isSyncingRef.current !== source) return;

      const srcEl = source === 'a' ? paneARef.current : paneBRef.current;
      const dstEl = source === 'a' ? paneBRef.current : paneARef.current;
      if (!srcEl || !dstEl) return;

      const maxSrcY = Math.max(1, srcEl.scrollHeight - srcEl.clientHeight);
      const maxSrcX = Math.max(1, srcEl.scrollWidth - srcEl.clientWidth);
      const ratioY = srcEl.scrollTop / maxSrcY;
      const ratioX = srcEl.scrollLeft / maxSrcX;

      isSyncingRef.current = source;
      const maxDstY = Math.max(0, dstEl.scrollHeight - dstEl.clientHeight);
      const maxDstX = Math.max(0, dstEl.scrollWidth - dstEl.clientWidth);
      dstEl.scrollTop = Math.round(ratioY * maxDstY);
      dstEl.scrollLeft = Math.round(ratioX * maxDstX);

      window.requestAnimationFrame(() => {
        if (isSyncingRef.current === source) {
          isSyncingRef.current = null;
        }
      });
    },
    [syncScroll]
  );

  const handleZoomOut = () => {
    setFitMode(false);
    setZoom((prev) => {
      const lower = [...ZOOM_STEPS].reverse().find((step) => step < prev);
      return lower ?? ZOOM_STEPS[0];
    });
  };

  const handleZoomIn = () => {
    setFitMode(false);
    setZoom((prev) => {
      const higher = ZOOM_STEPS.find((step) => step > prev);
      return higher ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    });
  };

  const handleFitToView = () => {
    setFitMode(true);
    setZoom(1);
    if (paneARef.current) {
      paneARef.current.scrollTop = 0;
      paneARef.current.scrollLeft = 0;
    }
    if (paneBRef.current) {
      paneBRef.current.scrollTop = 0;
      paneBRef.current.scrollLeft = 0;
    }
  };

  const renderPane = (
    slot: AnalysisContextSnapshot,
    dimLabel: string | null,
    ref: React.RefObject<HTMLDivElement | null>,
    sourceKey: 'a' | 'b'
  ) => (
    <div className="flex flex-col min-w-0 bg-canvas/80">
      {/* Pane subheader */}
      <div className="px-4 py-2.5 border-b border-border bg-surface/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-accent whitespace-nowrap shrink-0">
            {slot.slotLabel}
          </span>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-ink truncate" title={slot.image?.name ?? ''}>
            {slot.image?.name ?? 'No screenshot'}
          </span>
        </div>
        {dimLabel && (
          <span className="text-[11px] font-mono tabular-nums text-muted whitespace-nowrap shrink-0">
            {dimLabel}
          </span>
        )}
      </div>

      {/* Scrollable canvas preserving original aspect ratio and unedited appearance */}
      <div
        ref={ref}
        onScroll={() => handleScroll(sourceKey)}
        data-compare-viewport={slot.slotId}
        className="h-[340px] sm:h-[420px] lg:h-[480px] overflow-auto p-4 flex items-start justify-center bg-[#06090B]"
      >
        {slot.image ? (
          <img
            src={slot.image.previewUrl}
            alt={`${slot.slotLabel} full screenshot — ${slot.image.name}`}
            style={
              fitMode
                ? { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }
                : {
                    width: `${Math.round(slot.image.width * zoom)}px`,
                    maxWidth: 'none',
                    height: 'auto'
                  }
            }
            className="rounded border border-border/80 shadow-sm block select-none"
            draggable={false}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-faint">
            Upload a screenshot in {slot.slotLabel} to inspect side by side.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby="compare-screenshots-heading"
      className="rounded-xl border border-border bg-surface overflow-hidden"
    >
      {/* Toolbar */}
      <div className="px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h2 id="compare-screenshots-heading" className="text-sm font-semibold text-ink">
            01. Side-by-Side Screenshot Comparison
          </h2>
          <p className="text-xs text-muted">{geometry.summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scroll sync segmented toggle */}
          <button
            type="button"
            onClick={() => setSyncScroll((prev) => !prev)}
            data-compare-sync-scroll
            aria-pressed={syncScroll}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              syncScroll
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-canvas text-muted hover:text-ink'
            }`}
          >
            {syncScroll ? (
              <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Unlink2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{syncScroll ? 'Sync Scroll' : 'Independent Scroll'}</span>
          </button>

          {/* Zoom controls */}
          <div className="inline-flex items-center rounded-lg border border-border bg-canvas p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!fitMode && zoom <= ZOOM_STEPS[0]}
              aria-label="Zoom out comparison screenshots"
              className="p-1.5 rounded-md text-muted hover:text-ink disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span className="px-2 text-[11px] font-mono tabular-nums text-ink whitespace-nowrap">
              {fitMode ? 'Fit' : `${Math.round(zoom * 100)}%`}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!fitMode && zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              aria-label="Zoom in comparison screenshots"
              className="p-1.5 rounded-md text-muted hover:text-ink disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleFitToView}
              data-compare-fit-view
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                fitMode ? 'bg-surface text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <Maximize2 className="w-3 h-3" aria-hidden="true" />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Split panes with clear divider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {renderPane(designA, geometry.designADimensions?.label ?? null, paneARef, 'a')}
        {renderPane(designB, geometry.designBDimensions?.label ?? null, paneBRef, 'b')}
      </div>
    </section>
  );
};
