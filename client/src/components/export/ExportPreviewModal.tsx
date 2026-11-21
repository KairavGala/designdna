import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, FileCode2, FileText, FolderArchive, X } from 'lucide-react';
import { copyToClipboard } from '../anatomy/AnatomyShared';
import { formatBytes } from '../../services/export/filenameUtils';
import type { ExportFormatId } from '../../types/exportSuite';

export interface ExportPreviewData {
  id: ExportFormatId;
  title: string;
  filename: string;
  formatLabel: string;
  description: string;
  textContent: string;
  copyable: boolean;
  estimatedBytes?: number;
}

export interface ExportPreviewModalProps {
  preview: ExportPreviewData | null;
  isDownloading: boolean;
  onClose: () => void;
  onDownload: (id: ExportFormatId) => void;
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  preview,
  isDownloading,
  onClose,
  onDownload
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  const byteCount =
    preview.estimatedBytes ?? new TextEncoder().encode(preview.textContent).byteLength;

  const IconComponent =
    preview.id === 'css-variables' || preview.id === 'json-tokens'
      ? FileCode2
      : preview.id === 'visual-assets-zip' || preview.id === 'complete-package-zip'
        ? FolderArchive
        : FileText;

  const handleCopy = () => {
    void copyToClipboard(preview.textContent).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Export preview for ${preview.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-surface border border-border-strong rounded-xl shadow-[0_24px_70px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-accent">
              <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{preview.formatLabel}</span>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="text-muted truncate">{preview.filename}</span>
              <span className="text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="text-faint tabular-nums">{formatBytes(byteCount)}</span>
            </div>
            <h3 className="text-base font-semibold text-ink tracking-[-0.015em]">
              {preview.title}
            </h3>
            <p className="text-xs text-muted">{preview.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export preview"
            className="w-9 h-9 rounded-lg border border-border bg-canvas text-muted hover:text-ink hover:border-border-strong flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Monospace Preview Body */}
        <div className="flex-1 overflow-auto bg-[#060A0C] p-4 sm:p-5">
          <pre
            data-export-preview-content={preview.id}
            className="font-mono text-[12px] leading-[1.6] text-[#DCE8EA] whitespace-pre-wrap break-words"
          >
            {preview.textContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-sidebar/80 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-faint">
            Generated locally from active in-memory session analysis · zero secrets included
          </span>

          <div className="flex items-center gap-2">
            {preview.copyable && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-canvas hover:border-border-strong text-xs font-medium text-ink transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                    <span>Copy Content</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => onDownload(preview.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isDownloading ? 'Generating…' : `Download ${preview.formatLabel}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
