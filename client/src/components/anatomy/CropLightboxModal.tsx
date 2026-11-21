import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, Info, Layers, ScanSearch, X } from 'lucide-react';
import type { CropLightboxTarget } from '../../types/anatomyBoard';
import type { InvestigationSelection, NormalizedBoundingBox } from '../../types/investigation';
import { ProvenanceInline } from './AnatomyShared';

export interface CropLightboxModalProps {
  target: CropLightboxTarget | null;
  copiedHex: string | null;
  onCopyHex: (hex: string) => void;
  onClose: () => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
}

export const CropLightboxModal: React.FC<CropLightboxModalProps> = ({
  target,
  copiedHex,
  onCopyHex,
  onClose,
  onInspectInWorkspace
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const cropUrls =
    target.occurrenceCropUrls.length > 0 ? target.occurrenceCropUrls : [target.cropUrl];
  const activeCrop = cropUrls[activeIndex] ?? target.cropUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded screenshot crop for ${target.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-surface border border-border-strong rounded-xl shadow-[0_24px_70px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-mono text-accent">{target.categoryLabel}</p>
            <h3 className="text-base font-semibold text-ink tracking-[-0.015em] leading-snug">
              {target.title}
            </h3>
            <ProvenanceInline
              provenance={target.provenance}
              confidence={target.confidence}
              extra={
                target.pixelDimensions
                  ? `${target.pixelDimensions.width} × ${target.pixelDimensions.height}px`
                  : null
              }
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close expanded crop preview"
            className="w-9 h-9 rounded-lg border border-border bg-canvas text-muted hover:text-ink hover:border-border-strong flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Enlarged real screenshot crop */}
          <div
            className="rounded-xl border border-border bg-canvas p-6 flex items-center justify-center min-h-[220px] max-h-[380px] overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(rgba(145, 162, 165, 0.14) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          >
            <img
              src={activeCrop}
              alt={`Expanded cropped screenshot preview of ${target.title}`}
              className="max-h-[330px] max-w-full object-contain rounded shadow-[0_14px_36px_rgba(0,0,0,0.55)]"
            />
          </div>

          {/* Multi-occurrence crop switcher when recurring */}
          {cropUrls.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">
                Verified Occurrences ({cropUrls.length} screenshot crops)
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {cropUrls.map((url, idx) => (
                  <button
                    key={`${target.title}-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-pressed={activeIndex === idx}
                    className={[
                      'shrink-0 rounded-lg border p-2 bg-canvas flex flex-col items-center gap-1 transition-colors cursor-pointer',
                      activeIndex === idx
                        ? 'border-accent bg-accent-soft/40'
                        : 'border-border hover:border-border-strong'
                    ].join(' ')}
                  >
                    <img
                      src={url}
                      alt={`Occurrence ${idx + 1} of ${target.title}`}
                      className="h-12 max-w-[92px] object-contain rounded-sm"
                    />
                    <span className="font-mono text-[10px] text-muted tabular-nums">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-muted leading-relaxed">{target.description}</p>

          {/* Locally measured colours from crop pixels */}
          {target.measuredColors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">Measured Crop Colours</span>
                <span className="text-[11px] font-medium text-[#34D399]">Measured pixels</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {target.measuredColors.map((swatch) => {
                  const isCopied = copiedHex === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => onCopyHex(swatch.hex)}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-canvas hover:border-accent-border transition-colors cursor-pointer"
                    >
                      <span
                        className="w-4 h-4 rounded-sm border border-border-strong shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-xs text-ink">{swatch.hex}</span>
                      <span className="font-mono text-[11px] text-muted tabular-nums">
                        {swatch.percentage.toFixed(1)}%
                      </span>
                      {isCopied ? (
                        <Check className="w-3 h-3 text-[#34D399]" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3 text-faint" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence */}
          {target.evidence.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink">Supporting Visual Evidence</p>
              <ul className="space-y-1 text-xs text-muted">
                {target.evidence.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span
                      className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-start gap-2 text-[11px] text-faint leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Image crop and colour swatches are extracted directly from the uploaded screenshot
              pixels. Classifications are visual inferences without HTML, CSS, or DOM access.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-sidebar/80 flex flex-wrap items-center justify-between gap-3">
          {target.parentRegionId && target.parentRegionName ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onInspectInWorkspace({ kind: 'region', id: target.parentRegionId! }, null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              <span>Source region: {target.parentRegionName}</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            <span className="text-xs text-faint">Actual cropped screenshot specimen</span>
          )}

          {target.selection && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onInspectInWorkspace(target.selection, target.targetBox);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <ScanSearch className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Inspect in Visual Investigation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
