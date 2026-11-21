import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Code2,
  Download,
  Eye,
  FileArchive,
  FileCode2,
  FileJson,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  Package,
  Palette,
  ScanLine,
  ShieldCheck,
  Wand2
} from 'lucide-react';
import {
  ExportPreviewModal,
  type ExportPreviewData
} from '../components/export/ExportPreviewModal';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import type { UseColorExtractionResult } from '../hooks/useColorExtraction';
import type { UseInvestigationDataResult } from '../hooks/useInvestigationData';
import type { UseVisualAnalysisResult } from '../hooks/useVisualAnalysis';
import { buildAnatomyBoard } from '../services/anatomyBoard/buildAnatomyBoard';
import {
  buildExportFilenames,
  formatBytes,
  triggerBlobDownload
} from '../services/export/filenameUtils';
import {
  buildCompleteAnalysisPackageZip,
  buildVisualAssetsManifest,
  buildVisualAssetsZip,
  collectVisualAssets
} from '../services/export/generateAssetExports';
import { buildMarkdownAnatomyReport } from '../services/export/generateMarkdownReport';
import { buildPdfAnatomyReport } from '../services/export/generatePdfReport';
import {
  buildCssExport,
  buildStructuredJsonExport,
  resolveExportDesignSystem
} from '../services/export/generateTokenExports';
import { TOKEN_CATEGORY_LABELS, type DesignSystem } from '../types/designSystem';
import type { ExportFormatId, ExportItemDescriptor } from '../types/exportSuite';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { formatFileSize } from '../utils/imageValidation';

export interface ExportSuitePageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  designSystem: DesignSystem | null;
  investigation: UseInvestigationDataResult;
  onStartExtraction: () => void;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

interface ExportFeedback {
  kind: 'success' | 'error';
  message: string;
}

export const ExportSuitePage: React.FC<ExportSuitePageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  designSystem,
  investigation,
  onStartExtraction,
  onRunVisualAnalysis,
  onNavigate
}) => {
  // Privacy-by-default: original uploaded screenshot is EXCLUDED unless explicitly opted in
  const [includeOriginalInAssets, setIncludeOriginalInAssets] = useState<boolean>(false);
  const [includeOriginalInPackage, setIncludeOriginalInPackage] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<ExportFormatId | null>(null);
  const [previewData, setPreviewData] = useState<ExportPreviewData | null>(null);
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);

  // Reset export UI state whenever the active screenshot changes or is removed
  useEffect(() => {
    setIncludeOriginalInAssets(false);
    setIncludeOriginalInPackage(false);
    setPreviewData(null);
    setFeedback(null);
    setDownloadingId(null);
  }, [image?.previewUrl]);

  const completedColorResult =
    colorExtraction.status === 'completed' ? colorExtraction.result : null;
  const completedVisualAnalysis =
    visualAnalysis.status === 'completed' ? visualAnalysis.result : null;

  // Reuse M10 Design Anatomy Board data model deterministically
  const board = useMemo(
    () =>
      buildAnatomyBoard({
        image,
        colorResult: completedColorResult,
        visualAnalysis: completedVisualAnalysis,
        designSystem,
        regions: investigation.regions,
        elements: investigation.elements,
        patterns: investigation.patterns,
        assets: investigation.assets
      }),
    [
      image,
      completedColorResult,
      completedVisualAnalysis,
      designSystem,
      investigation.regions,
      investigation.elements,
      investigation.patterns,
      investigation.assets
    ]
  );

  // Reuse M6 DesignSystem (or deterministic measured-only M6 normalisation in partial M4-only state)
  const exportDesignSystem = useMemo(
    () =>
      resolveExportDesignSystem({
        image,
        colorResult: completedColorResult,
        visualAnalysis: completedVisualAnalysis,
        designSystem
      }),
    [image, completedColorResult, completedVisualAnalysis, designSystem]
  );

  const filenames = useMemo(() => buildExportFilenames(image?.name), [image?.name]);

  const visualAssetsForArchive = useMemo(
    () =>
      collectVisualAssets({
        image,
        elements: investigation.elements,
        patterns: investigation.patterns,
        elementAssets: investigation.assets.elementAssets,
        includeOriginalScreenshot: includeOriginalInAssets
      }),
    [
      image,
      investigation.elements,
      investigation.patterns,
      investigation.assets.elementAssets,
      includeOriginalInAssets
    ]
  );

  const visualAssetsForPackage = useMemo(
    () =>
      collectVisualAssets({
        image,
        elements: investigation.elements,
        patterns: investigation.patterns,
        elementAssets: investigation.assets.elementAssets,
        includeOriginalScreenshot: includeOriginalInPackage
      }),
    [
      image,
      investigation.elements,
      investigation.patterns,
      investigation.assets.elementAssets,
      includeOriginalInPackage
    ]
  );

  const croppedAssetCount = useMemo(
    () => visualAssetsForArchive.filter((a) => a.folder !== 'source').length,
    [visualAssetsForArchive]
  );

  const motifCropCount = useMemo(
    () => visualAssetsForArchive.filter((a) => a.folder === 'motifs').length,
    [visualAssetsForArchive]
  );
  const componentCropCount = useMemo(
    () => visualAssetsForArchive.filter((a) => a.folder === 'components').length,
    [visualAssetsForArchive]
  );
  const patternCropCount = useMemo(
    () => visualAssetsForArchive.filter((a) => a.folder === 'patterns').length,
    [visualAssetsForArchive]
  );

  const isExtractingColors =
    colorExtraction.status === 'loading' || colorExtraction.status === 'processing';
  const isRunningVisualAi =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';

  const hasTokens = Boolean(exportDesignSystem && exportDesignSystem.metrics.totalTokens > 0);
  const hasFullAi = Boolean(completedVisualAnalysis);
  const hasReportContent = Boolean(image && board.completeness.populatedSections > 0);
  const hasAssetsArchiveContent = Boolean(image && visualAssetsForArchive.length > 0);
  const hasPackageContent = Boolean(
    image && (hasTokens || hasReportContent || visualAssetsForPackage.length > 0)
  );

  const cssCategorySummary = useMemo(() => {
    if (!exportDesignSystem) return 'Requires colour extraction or full visual analysis';
    const cats = (Object.keys(exportDesignSystem.byCategory) as Array<keyof typeof exportDesignSystem.byCategory>)
      .filter((k) => exportDesignSystem.byCategory[k].length > 0)
      .map((k) => TOKEN_CATEGORY_LABELS[k]);
    return `${exportDesignSystem.metrics.totalTokens} semantic variables across ${cats.join(', ')}`;
  }, [exportDesignSystem]);

  const developerItems: ExportItemDescriptor[] = useMemo(
    () => [
      {
        id: 'css-variables',
        group: 'developer',
        title: 'CSS Custom Properties',
        formatLabel: 'CSS',
        filename: filenames.css,
        description:
          'Production-ready :root stylesheet grouped by token category with provenance and confidence comments.',
        includedContent: cssCategorySummary,
        available: hasTokens,
        availabilityStatus: hasTokens ? (hasFullAi ? 'ready' : 'partial') : 'unavailable',
        availabilityLabel: hasTokens
          ? hasFullAi
            ? 'Ready'
            : 'Partial (Measured tokens)'
          : 'Unavailable',
        unavailableReason: hasTokens
          ? undefined
          : 'Extract measured colours first to generate CSS variables.',
        canPreview: hasTokens
      },
      {
        id: 'json-tokens',
        group: 'developer',
        title: 'Structured JSON Tokens',
        formatLabel: 'JSON',
        filename: filenames.json,
        description:
          'Deterministic W3C-inspired JSON document preserving token values, provenance, confidence, evidence, reconciliation notes, and visual summary.',
        includedContent: exportDesignSystem
          ? `${exportDesignSystem.metrics.totalTokens} tokens · ${exportDesignSystem.reconciliationNotes.length} reconciliation note${exportDesignSystem.reconciliationNotes.length === 1 ? '' : 's'} · Zod-validated`
          : 'Requires measured colours or full analysis',
        available: hasTokens,
        availabilityStatus: hasTokens ? (hasFullAi ? 'ready' : 'partial') : 'unavailable',
        availabilityLabel: hasTokens
          ? hasFullAi
            ? 'Ready'
            : 'Partial (Measured tokens)'
          : 'Unavailable',
        unavailableReason: hasTokens
          ? undefined
          : 'Extract measured colours first to generate structured JSON tokens.',
        canPreview: hasTokens
      }
    ],
    [filenames, cssCategorySummary, hasTokens, hasFullAi, exportDesignSystem]
  );

  const documentationItems: ExportItemDescriptor[] = useMemo(
    () => [
      {
        id: 'markdown-report',
        group: 'documentation',
        title: 'Design Anatomy Report (Markdown)',
        formatLabel: 'MD',
        filename: filenames.markdown,
        description:
          'Readable documentation covering Visual Identity, Colour, Typography, Patterns & Motifs, Components, Layout, Effects, and M6 reconciliation.',
        includedContent: hasReportContent
          ? `${board.completeness.populatedSections}/${board.completeness.totalSections} board sections · ${investigation.regions.length} regions · ${investigation.elements.length} visual elements`
          : 'Requires at least one populated analysis section',
        available: hasReportContent,
        availabilityStatus: hasReportContent ? (hasFullAi ? 'ready' : 'partial') : 'unavailable',
        availabilityLabel: hasReportContent
          ? hasFullAi
            ? 'Ready'
            : `Partial (${board.completeness.populatedSections}/7 sections)`
          : 'Unavailable',
        unavailableReason: hasReportContent
          ? undefined
          : 'Run colour extraction or AI Visual Interpretation to populate the report.',
        canPreview: hasReportContent
      },
      {
        id: 'pdf-report',
        group: 'documentation',
        title: 'Design Anatomy Report (PDF)',
        formatLabel: 'PDF',
        filename: filenames.pdf,
        description:
          'Multi-page dark obsidian & turquoise PDF dossier with proportional measured colour bars, swatch cards, and embedded real M9 PNG crops.',
        includedContent: hasReportContent
          ? `${board.completeness.populatedSections}/${board.completeness.totalSections} sections · ${board.colour.totalMeasuredColors} colour swatches · ${croppedAssetCount} cropped visual specimen${croppedAssetCount === 1 ? '' : 's'}`
          : 'Requires at least one populated analysis section',
        available: hasReportContent,
        availabilityStatus: hasReportContent ? (hasFullAi ? 'ready' : 'partial') : 'unavailable',
        availabilityLabel: hasReportContent
          ? hasFullAi
            ? 'Ready'
            : `Partial (${board.completeness.populatedSections}/7 sections)`
          : 'Unavailable',
        unavailableReason: hasReportContent
          ? undefined
          : 'Run colour extraction or AI Visual Interpretation to render the PDF report.',
        canPreview: hasReportContent
      }
    ],
    [
      filenames,
      hasReportContent,
      hasFullAi,
      board,
      investigation.regions.length,
      investigation.elements.length,
      croppedAssetCount
    ]
  );

  const handlePreview = useCallback(
    (id: ExportFormatId) => {
      if (!image) return;
      setFeedback(null);

      try {
        if (id === 'css-variables') {
          if (!exportDesignSystem) return;
          const res = buildCssExport(exportDesignSystem);
          setPreviewData({
            id,
            title: 'CSS Custom Properties',
            filename: filenames.css,
            formatLabel: 'CSS',
            description: `${res.variableCount} validated semantic custom properties from M6 DesignSystem.`,
            textContent: res.cssText,
            copyable: true
          });
          return;
        }

        if (id === 'json-tokens') {
          if (!exportDesignSystem) return;
          const res = buildStructuredJsonExport({
            designSystem: exportDesignSystem,
            board,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns
          });
          setPreviewData({
            id,
            title: 'Structured JSON Tokens',
            filename: filenames.json,
            formatLabel: 'JSON',
            description: 'Zod-validated DesignDNA token bundle with provenance, confidence, evidence, and reconciliation.',
            textContent: res.jsonText,
            copyable: true
          });
          return;
        }

        if (id === 'markdown-report') {
          if (!hasReportContent) return;
          const md = buildMarkdownAnatomyReport({
            image,
            board,
            designSystem: exportDesignSystem,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns,
            aiModel: completedVisualAnalysis?.meta.model ?? null
          });
          setPreviewData({
            id,
            title: 'Design Anatomy Report (Markdown)',
            filename: filenames.markdown,
            formatLabel: 'MD',
            description: 'Complete Markdown report mirroring the active Design Anatomy Board.',
            textContent: md,
            copyable: true
          });
          return;
        }

        if (id === 'pdf-report') {
          if (!hasReportContent) return;
          const outlineLines = [
            `DesignDNA PDF Dossier Outline (${filenames.pdf})`,
            `Layout: Multi-page A4 Portrait · Obsidian (#070B0D) & Turquoise (#16D6C5) Theme`,
            `Source: ${image.name} (${image.width} × ${image.height}px, ${image.format})`,
            ``,
            `Included Sections (${board.completeness.populatedSections}/7 populated):`,
            `  01. Visual Identity .......... ${board.identity.available ? `Populated (${board.identity.styleClassifications.length} style tags)` : 'Marked unavailable'}`,
            `  02. Colour Identity .......... ${board.colour.available ? `Populated (spectrum bar + ${board.colour.totalMeasuredColors} measured colours)` : 'Marked unavailable'}`,
            `  03. Typography Identity ...... ${board.typography.available ? `Populated (${board.typography.specimens.length} scale specimens)` : 'Marked unavailable'}`,
            `  04. Patterns & Motifs ........ ${board.patterns.available ? `Populated (${investigation.patterns.length} recurring patterns + embedded PNG crops)` : 'None verified'}`,
            `  05. Components & Shapes ...... ${board.components.available ? `Populated (${board.components.croppedComponents.length} cropped components + ${board.components.inferredComponents.length} styles)` : 'Marked unavailable'}`,
            `  06. Layout & Composition ..... ${board.layout.available ? `Populated (${investigation.regions.length} verified M8 regions)` : 'Marked unavailable'}`,
            `  07. Effects & Surface ........ ${board.effects.available ? `Populated (${board.effects.elevationStyle ?? 'observed'})` : 'Marked unavailable'}`,
            ``,
            `Privacy: Generated 100% in-browser via jsPDF. Original full screenshot is not embedded; only real M9 element crops and colour swatches are included.`
          ];
          setPreviewData({
            id,
            title: 'Design Anatomy Report (PDF Outline)',
            filename: filenames.pdf,
            formatLabel: 'PDF',
            description: 'Exact section structure and embedded specimen summary rendered into the downloadable PDF.',
            textContent: outlineLines.join('\n'),
            copyable: false
          });
          return;
        }

        if (id === 'visual-assets-zip') {
          if (!hasAssetsArchiveContent) return;
          const manifest = buildVisualAssetsManifest({
            image,
            assets: visualAssetsForArchive,
            includeOriginalScreenshot: includeOriginalInAssets
          });
          setPreviewData({
            id,
            title: 'Visual Assets Archive Manifest',
            filename: filenames.assetsZip,
            formatLabel: 'ZIP',
            description: `Preview of assets-manifest.json indexing ${manifest.totalAssets} genuine screenshot-derived file(s).`,
            textContent: `${JSON.stringify(manifest, null, 2)}\n`,
            copyable: true
          });
          return;
        }

        if (id === 'complete-package-zip') {
          if (!hasPackageContent) return;
          const plannedFiles: string[] = ['manifest.json'];
          if (exportDesignSystem) {
            plannedFiles.push(`tokens/${filenames.css}`, `tokens/${filenames.json}`);
          }
          if (hasReportContent) {
            plannedFiles.push(`report/${filenames.markdown}`, `report/${filenames.pdf}`);
          }
          if (visualAssetsForPackage.length > 0) {
            plannedFiles.push('assets/assets-manifest.json');
            for (const asset of visualAssetsForPackage) {
              plannedFiles.push(asset.path);
            }
          }
          const summaryText = [
            `Complete Analysis Package Contents (${filenames.completePackageZip})`,
            `Source: ${image.name} (${image.width} × ${image.height}px)`,
            `Original screenshot included: ${includeOriginalInPackage ? 'YES (explicitly selected)' : 'NO (excluded by default)'}`,
            `Total files in archive: ${plannedFiles.length}`,
            ``,
            `Archive File Tree:`,
            ...plannedFiles.map((f) => `  - ${f}`)
          ].join('\n');

          setPreviewData({
            id,
            title: 'Complete Analysis Package Manifest Preview',
            filename: filenames.completePackageZip,
            formatLabel: 'ZIP',
            description: 'Exact directory tree and privacy configuration bundled into the ZIP archive.',
            textContent: summaryText,
            copyable: true
          });
        }
      } catch (err) {
        setFeedback({
          kind: 'error',
          message:
            err instanceof Error
              ? `Could not prepare preview: ${err.message}`
              : 'Could not prepare export preview.'
        });
      }
    },
    [
      image,
      exportDesignSystem,
      filenames,
      board,
      investigation.regions,
      investigation.elements,
      investigation.patterns,
      completedVisualAnalysis,
      hasReportContent,
      hasAssetsArchiveContent,
      hasPackageContent,
      visualAssetsForArchive,
      visualAssetsForPackage,
      includeOriginalInAssets,
      includeOriginalInPackage
    ]
  );

  const handleDownload = useCallback(
    async (id: ExportFormatId) => {
      if (!image) return;
      setDownloadingId(id);
      setFeedback(null);

      try {
        if (id === 'css-variables') {
          if (!exportDesignSystem) throw new Error('Design tokens are not available yet.');
          const res = buildCssExport(exportDesignSystem);
          const blob = new Blob([res.cssText], { type: 'text/css;charset=utf-8' });
          triggerBlobDownload(blob, filenames.css);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.css} (${formatBytes(blob.size)} · ${res.variableCount} CSS custom properties)`
          });
          return;
        }

        if (id === 'json-tokens') {
          if (!exportDesignSystem) throw new Error('Design tokens are not available yet.');
          const res = buildStructuredJsonExport({
            designSystem: exportDesignSystem,
            board,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns
          });
          const blob = new Blob([res.jsonText], { type: 'application/json;charset=utf-8' });
          triggerBlobDownload(blob, filenames.json);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.json} (${formatBytes(blob.size)} · schema-validated JSON)`
          });
          return;
        }

        if (id === 'markdown-report') {
          if (!hasReportContent) throw new Error('Report content is not available yet.');
          const md = buildMarkdownAnatomyReport({
            image,
            board,
            designSystem: exportDesignSystem,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns,
            aiModel: completedVisualAnalysis?.meta.model ?? null
          });
          const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
          triggerBlobDownload(blob, filenames.markdown);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.markdown} (${formatBytes(blob.size)})`
          });
          return;
        }

        if (id === 'pdf-report') {
          if (!hasReportContent) throw new Error('Report content is not available yet.');
          const pdfBlob = buildPdfAnatomyReport({
            image,
            board,
            designSystem: exportDesignSystem,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns,
            elementAssets: investigation.assets.elementAssets,
            aiModel: completedVisualAnalysis?.meta.model ?? null
          });
          triggerBlobDownload(pdfBlob, filenames.pdf);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.pdf} (${formatBytes(pdfBlob.size)})`
          });
          return;
        }

        if (id === 'visual-assets-zip') {
          const res = await buildVisualAssetsZip({
            image,
            elements: investigation.elements,
            patterns: investigation.patterns,
            elementAssets: investigation.assets.elementAssets,
            includeOriginalScreenshot: includeOriginalInAssets
          });
          triggerBlobDownload(res.blob, filenames.assetsZip);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.assetsZip} (${formatBytes(res.blob.size)} · ${res.manifest.totalAssets} asset${res.manifest.totalAssets === 1 ? '' : 's'} + manifest)`
          });
          return;
        }

        if (id === 'complete-package-zip') {
          const res = await buildCompleteAnalysisPackageZip({
            image,
            filenames,
            board,
            designSystem: exportDesignSystem,
            regions: investigation.regions,
            elements: investigation.elements,
            patterns: investigation.patterns,
            elementAssets: investigation.assets.elementAssets,
            aiModel: completedVisualAnalysis?.meta.model ?? null,
            includeOriginalScreenshot: includeOriginalInPackage
          });
          triggerBlobDownload(res.blob, filenames.completePackageZip);
          setFeedback({
            kind: 'success',
            message: `Downloaded ${filenames.completePackageZip} (${formatBytes(res.blob.size)} · ${res.manifest.files.length + 1} files bundled)`
          });
        }
      } catch (err) {
        setFeedback({
          kind: 'error',
          message:
            err instanceof Error
              ? `Export failed: ${err.message}`
              : 'Export failed unexpectedly.'
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [
      image,
      exportDesignSystem,
      filenames,
      board,
      investigation.regions,
      investigation.elements,
      investigation.patterns,
      investigation.assets.elementAssets,
      completedVisualAnalysis,
      hasReportContent,
      includeOriginalInAssets,
      includeOriginalInPackage
    ]
  );

  // Empty state — no screenshot uploaded
  if (!image) {
    return (
      <PageContainer>
        <PageHeading
          title="Developer Tools & Export Suite"
          description="Discover the design. Take it into your workflow."
        />
        <SectionCard>
          <EmptyState
            icon={Package}
            title="Upload and analyse a screenshot to unlock exports"
            description="Export normalised CSS custom properties, Zod-validated JSON design tokens, Design Anatomy reports in Markdown and PDF, genuine PNG screenshot crops, or a complete ZIP package — all generated locally in your browser."
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

  const renderExportCard = (item: ExportItemDescriptor, icon: React.ReactNode) => {
    const isBusy = downloadingId === item.id;
    const statusTone =
      item.availabilityStatus === 'ready'
        ? 'text-[#34D399]'
        : item.availabilityStatus === 'partial'
          ? 'text-[#FBBF24]'
          : 'text-faint';

    return (
      <article
        key={item.id}
        data-export-card={item.id}
        className="rounded-xl border border-border bg-surface p-5 flex flex-col justify-between gap-4"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg border border-border bg-canvas flex items-center justify-center shrink-0 text-accent">
                {icon}
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-sm font-semibold text-ink leading-snug">{item.title}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
                  <span className="text-accent">{item.formatLabel}</span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-muted truncate max-w-[220px]" title={item.filename}>
                    {item.filename}
                  </span>
                </div>
              </div>
            </div>

            <span className={`text-[11px] font-medium shrink-0 whitespace-nowrap ${statusTone}`}>
              {item.availabilityLabel}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">{item.description}</p>

          <div className="pt-2.5 border-t border-border/80 space-y-1 text-xs">
            <p className="text-[11px] text-faint">Included Content</p>
            <p className="text-ink/90 leading-relaxed">{item.includedContent}</p>
            {item.unavailableReason && (
              <p className="text-[11px] text-[#FBBF24] pt-0.5">{item.unavailableReason}</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-end gap-2">
          <SecondaryButton
            size="sm"
            disabled={!item.available || !item.canPreview}
            onClick={() => handlePreview(item.id)}
            className="whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>Preview</span>
          </SecondaryButton>

          <PrimaryButton
            size="sm"
            disabled={!item.available || isBusy}
            onClick={() => void handleDownload(item.id)}
            data-export-download={item.id}
            className="whitespace-nowrap"
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isBusy ? 'Generating…' : `Download .${item.formatLabel.toLowerCase()}`}</span>
          </PrimaryButton>
        </div>
      </article>
    );
  };

  const packagePlannedPaths: string[] = ['manifest.json'];
  if (exportDesignSystem) {
    packagePlannedPaths.push(`tokens/${filenames.css}`, `tokens/${filenames.json}`);
  }
  if (hasReportContent) {
    packagePlannedPaths.push(`report/${filenames.markdown}`, `report/${filenames.pdf}`);
  }
  if (visualAssetsForPackage.length > 0) {
    packagePlannedPaths.push('assets/assets-manifest.json');
    if (motifCropCount > 0) packagePlannedPaths.push(`assets/motifs/ (${motifCropCount} PNG)`);
    if (componentCropCount > 0)
      packagePlannedPaths.push(`assets/components/ (${componentCropCount} PNG)`);
    if (patternCropCount > 0)
      packagePlannedPaths.push(`assets/patterns/ (${patternCropCount} PNG)`);
    if (includeOriginalInPackage) packagePlannedPaths.push(`assets/source/${image.name}`);
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
      {/* Masthead */}
      <section className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent">
              Developer Tools &amp; Export Suite
            </p>
            <h1 className="text-2xl sm:text-[30px] font-semibold tracking-[-0.03em] text-ink leading-[1.15] text-balance">
              Discover the design. Take it into your workflow.
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Generate CSS variables, Zod-validated JSON tokens, Design Anatomy documentation in
              Markdown and PDF, genuine screenshot-cropped assets, or a bundled ZIP package directly
              in your browser.
            </p>
          </div>

          {/* Active Session Source Card */}
          <div className="rounded-xl border border-border bg-canvas/85 p-3.5 flex items-center gap-3.5 lg:max-w-sm shrink-0">
            <img
              src={image.previewUrl}
              alt={`Source capture thumbnail of ${image.name}`}
              className="w-16 h-12 rounded-md border border-border object-cover bg-[#060A0C] shrink-0"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-ink truncate" title={image.name}>
                {image.name}
              </p>
              <p className="text-[11px] font-mono text-muted tabular-nums">
                {image.width} × {image.height}px · {image.format} · {formatFileSize(image.size)}
              </p>
              <p className="text-[11px] font-mono text-accent tabular-nums">
                {board.completeness.populatedSections}/7 sections ·{' '}
                {exportDesignSystem?.metrics.totalTokens ?? 0} tokens · {croppedAssetCount} crops
              </p>
            </div>
          </div>
        </div>

        {/* Action & Prerequisite Controls */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!board.completeness.hasMeasuredColors ? (
              <PrimaryButton
                size="sm"
                onClick={onStartExtraction}
                disabled={isExtractingColors}
                className="whitespace-nowrap"
              >
                {isExtractingColors ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Palette className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{isExtractingColors ? 'Extracting…' : 'Extract Measured Colours'}</span>
              </PrimaryButton>
            ) : !hasFullAi ? (
              <PrimaryButton
                size="sm"
                onClick={onRunVisualAnalysis}
                disabled={isRunningVisualAi}
                className="whitespace-nowrap"
              >
                {isRunningVisualAi ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isRunningVisualAi ? 'Analysing Visual DNA…' : 'Run AI Visual Interpretation'}
                </span>
              </PrimaryButton>
            ) : null}

            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('design-anatomy')}
              className="whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              <span>Design Anatomy Board</span>
            </SecondaryButton>

            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('overview')}
              className="whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Overview</span>
            </SecondaryButton>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399] shrink-0" aria-hidden="true" />
            <span>100% browser-local exports · no uploads · no API keys</span>
          </span>
        </div>
      </section>

      {/* Download Success / Error Banner */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={[
            'rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs',
            feedback.kind === 'success'
              ? 'border-[#34D399]/40 bg-[#0A1E1A] text-[#A7F3D0]'
              : 'border-[#F87171]/40 bg-[#1F0F12] text-[#FECACA]'
          ].join(' ')}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedback.kind === 'success' ? (
              <Check className="w-4 h-4 text-[#34D399] shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted hover:text-ink transition-colors cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GROUP 1: Developer Exports */}
      <section aria-label="Developer Exports" className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-xs text-accent tabular-nums">01.</span>
            <h2 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-ink">
              Developer Exports
            </h2>
          </div>
          <span className="text-xs text-muted">
            Reuses M6 normalised DesignSystem tokens with provenance and reconciliation preserved
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderExportCard(developerItems[0], <Code2 className="w-4 h-4" aria-hidden="true" />)}
          {renderExportCard(developerItems[1], <FileJson className="w-4 h-4" aria-hidden="true" />)}
        </div>
      </section>

      {/* GROUP 2: Design Documentation */}
      <section aria-label="Design Documentation" className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-xs text-accent tabular-nums">02.</span>
            <h2 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-ink">
              Design Documentation
            </h2>
          </div>
          <span className="text-xs text-muted">
            Structured Design Anatomy reports matching the active board findings
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderExportCard(
            documentationItems[0],
            <FileText className="w-4 h-4" aria-hidden="true" />
          )}
          {renderExportCard(
            documentationItems[1],
            <FileCode2 className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
      </section>

      {/* GROUP 3: Visual Assets */}
      <section aria-label="Visual Assets" className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-xs text-accent tabular-nums">03.</span>
            <h2 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-ink">
              Visual Assets
            </h2>
          </div>
          <span className="text-xs text-muted">
            Genuine PNG crops extracted locally from screenshot pixels · zero fabricated graphics
          </span>
        </header>

        <article
          data-export-card="visual-assets-zip"
          className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg border border-border bg-canvas flex items-center justify-center shrink-0 text-accent">
                <ImageIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <h3 className="text-sm font-semibold text-ink">
                    Screenshot-Derived Visual Assets Archive
                  </h3>
                  <span className="font-mono text-[11px] text-accent">ZIP</span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-[11px] text-muted truncate">
                    {filenames.assetsZip}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed max-w-2xl">
                  Bundles cropped motifs, component specimens, multi-occurrence pattern crops, and
                  an indexed <code className="font-mono text-ink/90">assets-manifest.json</code>{' '}
                  organised into clean folders without recompressing PNG pixel quality.
                </p>
              </div>
            </div>

            <span
              className={[
                'text-[11px] font-medium shrink-0 whitespace-nowrap',
                hasAssetsArchiveContent
                  ? croppedAssetCount > 0
                    ? 'text-[#34D399]'
                    : 'text-[#FBBF24]'
                  : 'text-faint'
              ].join(' ')}
            >
              {hasAssetsArchiveContent
                ? croppedAssetCount > 0
                  ? `${visualAssetsForArchive.length} asset${visualAssetsForArchive.length === 1 ? '' : 's'} ready`
                  : 'Original capture only'
                : 'Unavailable'}
            </span>
          </div>

          {/* Genuine PNG Crop Strip */}
          {croppedAssetCount > 0 ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted tabular-nums">
                <span>assets/motifs/ ({motifCropCount})</span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>assets/components/ ({componentCropCount})</span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>assets/patterns/ ({patternCropCount})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {visualAssetsForArchive
                  .filter((a) => a.folder !== 'source' && a.dataUrl)
                  .slice(0, 6)
                  .map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-lg border border-border bg-canvas overflow-hidden flex flex-col"
                    >
                      <div className="h-20 p-2 bg-[#060A0C] flex items-center justify-center border-b border-border">
                        <img
                          src={asset.dataUrl}
                          alt={`Export crop preview of ${asset.sourceFindingName}`}
                          className="max-h-16 max-w-full object-contain rounded-sm"
                        />
                      </div>
                      <div className="px-2.5 py-2 space-y-0.5">
                        <p
                          className="text-[11px] font-medium text-ink truncate"
                          title={asset.sourceFindingName}
                        >
                          {asset.sourceFindingName}
                        </p>
                        <p className="font-mono text-[10px] text-faint truncate">
                          {asset.folder}/{asset.filename}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-canvas/70 px-4 py-3 text-xs text-muted">
              {investigation.samplingAssets
                ? 'Extracting PNG crops from the uploaded screenshot…'
                : 'No cropped motifs, components, or pattern instances are currently available. Run AI Visual Interpretation to detect local visual specimens, or opt in below to archive the original screenshot.'}
            </div>
          )}

          {/* Privacy Opt-In Toggle + Actions */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="inline-flex items-start gap-2.5 text-xs text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeOriginalInAssets}
                onChange={(e) => setIncludeOriginalInAssets(e.target.checked)}
                data-export-toggle="assets-original-screenshot"
                className="mt-0.5 w-4 h-4 rounded border-border bg-canvas accent-[#16D6C5] cursor-pointer"
              />
              <span className="space-y-0.5">
                <span className="block font-medium text-ink">
                  Include original uploaded screenshot
                </span>
                <span className="block text-[11px] text-muted">
                  Excluded by default for privacy · adds <code className="font-mono">assets/source/</code>{' '}
                  only when checked
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <SecondaryButton
                size="sm"
                disabled={!hasAssetsArchiveContent}
                onClick={() => handlePreview('visual-assets-zip')}
                className="whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Preview Manifest</span>
              </SecondaryButton>

              <PrimaryButton
                size="sm"
                disabled={!hasAssetsArchiveContent || downloadingId === 'visual-assets-zip'}
                onClick={() => void handleDownload('visual-assets-zip')}
                data-export-download="visual-assets-zip"
                className="whitespace-nowrap"
              >
                {downloadingId === 'visual-assets-zip' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileArchive className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>
                  {downloadingId === 'visual-assets-zip'
                    ? 'Bundling…'
                    : 'Download Visual Assets (.zip)'}
                </span>
              </PrimaryButton>
            </div>
          </div>
        </article>
      </section>

      {/* GROUP 4: Complete Analysis Package */}
      <section aria-label="Complete Package" className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-xs text-accent tabular-nums">04.</span>
            <h2 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-ink">
              Complete Package
            </h2>
          </div>
          <span className="text-xs text-muted">
            One-click ZIP archive unifying tokens, reports, crops, and a validated manifest
          </span>
        </header>

        <article
          data-export-card="complete-package-zip"
          className="rounded-xl border border-accent-border/70 bg-surface p-5 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg border border-accent-border bg-accent-soft flex items-center justify-center shrink-0 text-accent">
                  <Package className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <h3 className="text-base font-semibold text-ink">
                      Complete Analysis Package
                    </h3>
                    <span className="font-mono text-[11px] text-accent">ZIP</span>
                    <span className="text-border-strong" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-[11px] text-muted truncate">
                      {filenames.completePackageZip}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Downloads a structured project archive containing CSS variables, JSON tokens,
                    Markdown and PDF Design Anatomy reports, all extracted PNG visual assets, and a
                    versioned <code className="font-mono text-ink/90">manifest.json</code>.
                  </p>
                </div>
              </div>

              {/* Explicit Original Screenshot Opt-In */}
              <div className="rounded-lg border border-border bg-canvas/80 px-4 py-3">
                <label className="inline-flex items-start gap-2.5 text-xs text-ink cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeOriginalInPackage}
                    onChange={(e) => setIncludeOriginalInPackage(e.target.checked)}
                    data-export-toggle="package-original-screenshot"
                    className="mt-0.5 w-4 h-4 rounded border-border bg-canvas accent-[#16D6C5] cursor-pointer"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium text-ink">
                      Include original uploaded screenshot in package
                    </span>
                    <span className="block text-[11px] text-muted">
                      {includeOriginalInPackage
                        ? `Included at assets/source/${image.name} · recorded in manifest.json`
                        : 'Excluded by default · manifest records includesOriginalScreenshot: false'}
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <PrimaryButton
                  disabled={!hasPackageContent || downloadingId === 'complete-package-zip'}
                  onClick={() => void handleDownload('complete-package-zip')}
                  data-export-download="complete-package-zip"
                  className="whitespace-nowrap"
                >
                  {downloadingId === 'complete-package-zip' ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {downloadingId === 'complete-package-zip'
                      ? 'Building Analysis Package…'
                      : 'Download Complete Package (.zip)'}
                  </span>
                </PrimaryButton>

                <SecondaryButton
                  disabled={!hasPackageContent}
                  onClick={() => handlePreview('complete-package-zip')}
                  className="whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 text-muted" aria-hidden="true" />
                  <span>Preview Package Tree</span>
                </SecondaryButton>
              </div>
            </div>

            {/* Right: Live Directory Tree */}
            <div className="lg:col-span-5 rounded-xl border border-border bg-canvas/90 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <FolderOpen className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  <span>Archive Contents</span>
                </span>
                <span
                  className={[
                    'font-mono text-[11px] tabular-nums',
                    hasPackageContent ? 'text-[#34D399]' : 'text-faint'
                  ].join(' ')}
                >
                  {hasPackageContent ? `${packagePlannedPaths.length} entries` : 'Unavailable'}
                </span>
              </div>

              {hasPackageContent ? (
                <ul className="space-y-1 font-mono text-[11px] text-muted">
                  {packagePlannedPaths.map((entry) => (
                    <li key={entry} className="truncate flex items-center gap-2">
                      <span className="text-accent shrink-0" aria-hidden="true">
                        ├─
                      </span>
                      <span className="truncate">{entry}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-faint leading-relaxed">
                  Extract measured colours or run AI Visual Interpretation to populate package
                  contents.
                </p>
              )}
            </div>
          </div>
        </article>
      </section>

      {/* Preview Modal */}
      <ExportPreviewModal
        preview={previewData}
        isDownloading={downloadingId !== null}
        onClose={() => setPreviewData(null)}
        onDownload={(id) => void handleDownload(id)}
      />
    </div>
  );
};
