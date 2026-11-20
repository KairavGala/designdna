import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { UploadedImage } from '../../types/upload';
import { formatAspectRatio, formatFileSize } from '../../utils/imageValidation';

export interface ScreenshotLightboxProps {
  image: UploadedImage;
  open: boolean;
  onClose: () => void;
}

export const ScreenshotLightbox: React.FC<ScreenshotLightboxProps> = ({
  image,
  open,
  onClose
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded screenshot preview of ${image.name}`}
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] bg-surface border border-border-strong rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate" title={image.name}>
              {image.name}
            </p>
            <p className="text-xs text-muted font-mono tabular-nums">
              {image.width} × {image.height}px · {image.format} · {formatFileSize(image.size)} ·{' '}
              {formatAspectRatio(image.width, image.height)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expanded screenshot preview"
            className="w-9 h-9 rounded-lg border border-border bg-surface hover:bg-subtle flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-canvas p-4 sm:p-6 flex items-center justify-center">
          <img
            src={image.previewUrl}
            alt={`Full preview of uploaded screenshot ${image.name}`}
            className="max-w-full max-h-[74vh] w-auto h-auto object-contain rounded border border-border bg-surface"
          />
        </div>
      </div>
    </div>
  );
};
