import type { ExportFilenames } from '../../types/exportSuite';

/**
 * Sanitizes an arbitrary filename or label into a safe, lowercase, portable
 * filename slug containing only ASCII letters, digits, and single hyphens.
 */
export function sanitizeFilenameSlug(rawName: string | null | undefined, maxLen = 36): string {
  if (!rawName) return '';
  // Strip directory paths and trailing file extension
  const baseName = (rawName.split(/[\\/]/).pop() ?? '').trim();
  const withoutExt = baseName.replace(/\.[a-z0-9]{1,8}$/i, '');
  const slug = withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, maxLen)
    .replace(/-+$/g, '');

  return slug;
}

export function buildExportFilenames(imageName: string | null | undefined): ExportFilenames {
  const slug = sanitizeFilenameSlug(imageName);
  const prefix = slug ? `designdna-${slug}` : 'designdna';

  return {
    slug,
    css: `${prefix}-tokens.css`,
    json: `${prefix}-tokens.json`,
    markdown: `${prefix}-anatomy-report.md`,
    pdf: `${prefix}-anatomy-report.pdf`,
    assetsZip: `${prefix}-visual-assets.zip`,
    completePackageZip: `${prefix}-analysis-package.zip`
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const safeName = filename.replace(/[\\/:*?"<>|]+/g, '-');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}
